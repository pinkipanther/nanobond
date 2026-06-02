import {
  AccountId,
  Client,
  ContractCallQuery,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  Hbar,
  PrivateKey,
} from "@hashgraph/sdk";
import BigNumber from "bignumber.js";

const HBAR = 10n ** 8n;
const TOKEN = 10n ** 18n;
const DEFAULT_GAS = 10_000_000;

const BONDS = [
  {
    name: "Helios Testnet Solar Bond",
    symbol: "HSOL",
    description: "Community solar infrastructure raise with steady holder rewards.",
    totalSupply: 1_200_000n * TOKEN,
    hardCap: 150_000_000n,
    softCap: 75_000_000n,
    yieldRateBps: 650n,
    liquidityHbar: 40_000_000n,
    liquidityTokens: 260_000n * TOKEN,
    buyTinybar: 5_000_000n,
    sellTokens: 8_000n * TOKEN,
  },
  {
    name: "Atlas Testnet Treasury Bond",
    symbol: "ATLS",
    description: "Short-duration treasury simulation for NanoBond V2 market data.",
    totalSupply: 900_000n * TOKEN,
    hardCap: 180_000_000n,
    softCap: 90_000_000n,
    yieldRateBps: 925n,
    liquidityHbar: 55_000_000n,
    liquidityTokens: 210_000n * TOKEN,
    buyTinybar: 7_000_000n,
    sellTokens: 6_000n * TOKEN,
  },
  {
    name: "Orion Testnet Builder Bond",
    symbol: "ORBN",
    description: "Builder ecosystem bond with seeded Nano Pro trading activity.",
    totalSupply: 1_500_000n * TOKEN,
    hardCap: 220_000_000n,
    softCap: 110_000_000n,
    yieldRateBps: 1200n,
    liquidityHbar: 65_000_000n,
    liquidityTokens: 325_000n * TOKEN,
    buyTinybar: 9_000_000n,
    sellTokens: 10_000n * TOKEN,
  },
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function uint256(value) {
  return new BigNumber(value.toString());
}

function toContractId(address) {
  return ContractId.fromEvmAddress(0, 0, address);
}

function addressWith0x(address) {
  return address.startsWith("0x") ? address : `0x${address}`;
}

async function executeTx(client, contractAddress, functionName, params, options = {}) {
  const tx = new ContractExecuteTransaction()
    .setContractId(toContractId(contractAddress))
    .setGas(options.gas ?? DEFAULT_GAS)
    .setFunction(functionName, params);

  if (options.payableTinybar) {
    tx.setPayableAmount(Hbar.fromTinybars(options.payableTinybar.toString()));
  }

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);
  const record = await response.getRecord(client);
  return { receipt, record, transactionId: response.transactionId.toString() };
}

async function callView(client, contractAddress, functionName, params, gas = 300_000) {
  return new ContractCallQuery()
    .setContractId(toContractId(contractAddress))
    .setGas(gas)
    .setFunction(functionName, params)
    .execute(client);
}

async function seedBond(client, bondFactory, proFactory, spec) {
  const createBondParams = new ContractFunctionParameters()
    .addString(spec.name)
    .addString(spec.symbol)
    .addString(spec.description)
    .addUint256(uint256(spec.totalSupply))
    .addUint256(uint256(spec.hardCap))
    .addUint256(uint256(spec.softCap))
    .addUint256(uint256(14n * 24n * 60n * 60n))
    .addUint256(uint256(spec.yieldRateBps))
    .addUint256(uint256(24n * 60n * 60n));

  const { record: createBondRecord, transactionId: createBondTx } = await executeTx(
    client,
    bondFactory,
    "createBond",
    createBondParams,
    { gas: 6_000_000 },
  );
  const bondId = createBondRecord.contractFunctionResult.getUint256(0);
  const bondAddress = addressWith0x(createBondRecord.contractFunctionResult.getAddress(1));

  const tokenResult = await callView(client, bondAddress, "token");
  const tokenAddress = addressWith0x(tokenResult.getAddress(0));

  await executeTx(client, bondAddress, "contribute", new ContractFunctionParameters(), {
    payableTinybar: spec.hardCap,
    gas: DEFAULT_GAS,
  });
  await executeTx(client, bondAddress, "claimBonds", new ContractFunctionParameters());

  const withdrawableResult = await callView(client, bondAddress, "withdrawableHbar");
  const withdrawable = withdrawableResult.getUint256(0);
  if (withdrawable > 0n) {
    await executeTx(
      client,
      bondAddress,
      "withdrawHbar",
      new ContractFunctionParameters().addUint256(uint256(withdrawable)),
    );
  }

  const { record: createPoolRecord } = await executeTx(
    client,
    proFactory,
    "createPool",
    new ContractFunctionParameters().addAddress(tokenAddress),
    { gas: 3_000_000 },
  );
  const poolAddress = addressWith0x(createPoolRecord.contractFunctionResult.getAddress(0));

  await executeTx(
    client,
    tokenAddress,
    "approve",
    new ContractFunctionParameters()
      .addAddress(poolAddress)
      .addUint256(uint256(spec.liquidityTokens)),
  );
  await executeTx(
    client,
    poolAddress,
    "addLiquidity",
    new ContractFunctionParameters()
      .addUint256(uint256(spec.liquidityTokens))
      .addUint256(uint256(1n)),
    { payableTinybar: spec.liquidityHbar, gas: 4_000_000 },
  );

  await executeTx(
    client,
    poolAddress,
    "buy",
    new ContractFunctionParameters().addUint256(uint256(1n)),
    { payableTinybar: spec.buyTinybar, gas: 3_000_000 },
  );

  await executeTx(
    client,
    tokenAddress,
    "approve",
    new ContractFunctionParameters()
      .addAddress(poolAddress)
      .addUint256(uint256(spec.sellTokens)),
  );
  await executeTx(
    client,
    poolAddress,
    "sell",
    new ContractFunctionParameters()
      .addUint256(uint256(spec.sellTokens))
      .addUint256(uint256(1n)),
    { gas: 3_000_000 },
  );

  const [reserveHbar, reserveToken] = await Promise.all([
    callView(client, poolAddress, "reserveHbar").then((result) => result.getUint256(0)),
    callView(client, poolAddress, "reserveToken").then((result) => result.getUint256(0)),
  ]);

  return {
    bondId: bondId.toString(),
    name: spec.name,
    symbol: spec.symbol,
    bondAddress,
    tokenAddress,
    poolAddress,
    createBondTx,
    hardCapTinybar: spec.hardCap.toString(),
    liquidityHbarTinybar: spec.liquidityHbar.toString(),
    buyTinybar: spec.buyTinybar.toString(),
    sellTokens: spec.sellTokens.toString(),
    reserveHbar: reserveHbar.toString(),
    reserveToken: reserveToken.toString(),
  };
}

async function main() {
  const accountId = requireEnv("ACCOUNT_ID");
  const privateKey = requireEnv("PRIVATE_KEY");
  const bondFactory = requireEnv("BOND_FACTORY_ADDRESS");
  const proFactory = requireEnv("PRO_FACTORY_ADDRESS");

  const client = Client.forTestnet().setOperator(
    AccountId.fromString(accountId),
    PrivateKey.fromStringECDSA(privateKey),
  );

  try {
    const seeded = [];
    for (const spec of BONDS) {
      console.log(`Seeding ${spec.symbol}...`);
      seeded.push(await seedBond(client, bondFactory, proFactory, spec));
    }

    console.log(JSON.stringify({ bondFactory, proFactory, seeded }, null, 2));
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
