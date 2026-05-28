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
const TOTAL_SUPPLY = 1_000_000n * 10n ** 18n;
const HARD_CAP = 2n * HBAR;
const SOFT_CAP = 1n * HBAR;
const RAISE_DURATION = 3n * 24n * 60n * 60n;
const YIELD_RATE_BPS = 800n;
const EPOCH_DURATION = 24n * 60n * 60n;
const INITIAL_POOL_HBAR = 1n * HBAR;
const INITIAL_POOL_TOKENS = 250_000n * 10n ** 18n;
const DEFAULT_GAS = 10_000_000;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

function uint256(value) {
  return new BigNumber(value.toString());
}

function toContractId(address) {
  return ContractId.fromEvmAddress(0, 0, address);
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
  return { receipt, record };
}

async function callView(client, contractAddress, functionName, params, gas = 250_000) {
  const query = new ContractCallQuery()
    .setContractId(toContractId(contractAddress))
    .setGas(gas)
    .setFunction(functionName, params);

  return query.execute(client);
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

  const createBondParams = new ContractFunctionParameters()
    .addString("Testnet Growth Bond")
    .addString("TGB")
    .addString("Simple testnet raise for Nano Pro end-to-end verification")
    .addUint256(uint256(TOTAL_SUPPLY))
    .addUint256(uint256(HARD_CAP))
    .addUint256(uint256(SOFT_CAP))
    .addUint256(uint256(RAISE_DURATION))
    .addUint256(uint256(YIELD_RATE_BPS))
    .addUint256(uint256(EPOCH_DURATION));

  const { record: createBondRecord } = await executeTx(
    client,
    bondFactory,
    "createBond",
    createBondParams,
    { gas: 6_000_000 },
  );

  const bondId = createBondRecord.contractFunctionResult.getUint256(0);
  const bondAddress = createBondRecord.contractFunctionResult.getAddress(1);

  const tokenResult = await callView(client, bondAddress, "token");
  const tokenAddress = tokenResult.getAddress(0);

  await executeTx(
    client,
    bondAddress,
    "contribute",
    new ContractFunctionParameters(),
    { payableTinybar: HARD_CAP, gas: DEFAULT_GAS },
  );

  await executeTx(client, bondAddress, "claimBonds", new ContractFunctionParameters());

  const withdrawableResult = await callView(client, bondAddress, "withdrawableHbar");
  const withdrawable = withdrawableResult.getUint256(0);

  if (withdrawable > 0n) {
    const withdrawParams = new ContractFunctionParameters().addUint256(uint256(withdrawable));
    await executeTx(client, bondAddress, "withdrawHbar", withdrawParams);
  }

  const createPoolParams = new ContractFunctionParameters().addAddress(tokenAddress);
  const { record: createPoolRecord } = await executeTx(
    client,
    proFactory,
    "createPool",
    createPoolParams,
    { gas: 3_000_000 },
  );
  const poolAddress = createPoolRecord.contractFunctionResult.getAddress(0);

  const approveParams = new ContractFunctionParameters()
    .addAddress(poolAddress)
    .addUint256(uint256(INITIAL_POOL_TOKENS));
  await executeTx(client, tokenAddress, "approve", approveParams);

  const addLiquidityParams = new ContractFunctionParameters()
    .addUint256(uint256(INITIAL_POOL_TOKENS))
    .addUint256(uint256(1n));
  await executeTx(
    client,
    poolAddress,
    "addLiquidity",
    addLiquidityParams,
    { payableTinybar: INITIAL_POOL_HBAR, gas: 4_000_000 },
  );

  console.log(JSON.stringify({
    bondFactory,
    proFactory,
    bondId: bondId.toString(),
    bondAddress,
    tokenAddress,
    poolAddress,
    withdrawableTinybar: withdrawable.toString(),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
