import {
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  Hbar,
} from "@hashgraph/sdk";
import BigNumber from "bignumber.js";
import { parseUnits } from "viem";
import { HBAR_DECIMALS, TOKEN_DECIMALS } from "./contracts";

const DEFAULT_GAS = 10_000_000;

export function toContractId(address: string) {
  if (/^0\.0\.\d+$/.test(address)) return ContractId.fromString(address);
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) return ContractId.fromEvmAddress(0, 0, address);
  throw new Error(`Invalid contract address: ${address || "missing"}`);
}

export function uint256(value: bigint | number | string) {
  return new BigNumber(value.toString());
}

export function parseHbar(value: string) {
  return parseUnits(value || "0", HBAR_DECIMALS);
}

export function parseTokenAmount(value: string) {
  return parseUnits(value || "0", TOKEN_DECIMALS);
}

export function hbarFromTinybars(value: bigint) {
  return Hbar.fromTinybars(value.toString());
}

export function createBondTransaction(
  factoryAddress: string,
  input: {
    name: string;
    symbol: string;
    description: string;
    totalSupply: bigint;
    hardCapTinybar: bigint;
    softCapTinybar: bigint;
    raiseDurationSeconds: bigint;
    yieldRateBps: bigint;
    epochDurationSeconds: bigint;
  },
) {
  const params = new ContractFunctionParameters()
    .addString(input.name)
    .addString(input.symbol)
    .addString(input.description)
    .addUint256(uint256(input.totalSupply))
    .addUint256(uint256(input.hardCapTinybar))
    .addUint256(uint256(input.softCapTinybar))
    .addUint256(uint256(input.raiseDurationSeconds))
    .addUint256(uint256(input.yieldRateBps))
    .addUint256(uint256(input.epochDurationSeconds));

  return new ContractExecuteTransaction()
    .setContractId(toContractId(factoryAddress))
    .setGas(DEFAULT_GAS)
    .setFunction("createBond", params);
}

export function bondNoArgTransaction(bondAddress: string, functionName: string) {
  return new ContractExecuteTransaction()
    .setContractId(toContractId(bondAddress))
    .setGas(DEFAULT_GAS)
    .setFunction(functionName);
}

export function contributeTransaction(bondAddress: string, hbarAmount: string) {
  return bondNoArgTransaction(bondAddress, "contribute").setPayableAmount(
    hbarFromTinybars(parseHbar(hbarAmount)),
  );
}

export function unstakeTransaction(bondAddress: string, amount: string) {
  const params = new ContractFunctionParameters().addUint256(uint256(parseTokenAmount(amount)));
  return new ContractExecuteTransaction()
    .setContractId(toContractId(bondAddress))
    .setGas(DEFAULT_GAS)
    .setFunction("unstake", params);
}

export function withdrawHbarTransaction(bondAddress: string, hbarAmount: string) {
  const params = new ContractFunctionParameters().addUint256(uint256(parseHbar(hbarAmount)));
  return new ContractExecuteTransaction()
    .setContractId(toContractId(bondAddress))
    .setGas(DEFAULT_GAS)
    .setFunction("withdrawHbar", params);
}

export function approveTokenTransaction(tokenAddress: string, spender: string, amount: bigint) {
  const params = new ContractFunctionParameters()
    .addAddress(spender)
    .addUint256(uint256(amount));
  return new ContractExecuteTransaction()
    .setContractId(toContractId(tokenAddress))
    .setGas(DEFAULT_GAS)
    .setFunction("approve", params);
}

export function claimTokenRewardsTransaction(tokenAddress: string) {
  return new ContractExecuteTransaction()
    .setContractId(toContractId(tokenAddress))
    .setGas(DEFAULT_GAS)
    .setFunction("claimRewards");
}

export function createPoolTransaction(factoryAddress: string, tokenAddress: string) {
  const params = new ContractFunctionParameters().addAddress(tokenAddress);
  return new ContractExecuteTransaction()
    .setContractId(toContractId(factoryAddress))
    .setGas(DEFAULT_GAS)
    .setFunction("createPool", params);
}

export function addLiquidityTransaction(
  poolAddress: string,
  tokenAmount: string,
  hbarAmount: string,
  minLpOut: bigint = 1n,
) {
  const params = new ContractFunctionParameters()
    .addUint256(uint256(parseTokenAmount(tokenAmount)))
    .addUint256(uint256(minLpOut));
  return new ContractExecuteTransaction()
    .setContractId(toContractId(poolAddress))
    .setGas(DEFAULT_GAS)
    .setFunction("addLiquidity", params)
    .setPayableAmount(hbarFromTinybars(parseHbar(hbarAmount)));
}

export function removeLiquidityTransaction(
  poolAddress: string,
  lpAmount: string,
  minHbarOut: bigint = 0n,
  minTokenOut: bigint = 0n,
) {
  const params = new ContractFunctionParameters()
    .addUint256(uint256(parseTokenAmount(lpAmount)))
    .addUint256(uint256(minHbarOut))
    .addUint256(uint256(minTokenOut));
  return new ContractExecuteTransaction()
    .setContractId(toContractId(poolAddress))
    .setGas(DEFAULT_GAS)
    .setFunction("removeLiquidity", params);
}

export function nanoProBuyTransaction(poolAddress: string, hbarAmount: string, minTokensOut: bigint = 0n) {
  const params = new ContractFunctionParameters().addUint256(uint256(minTokensOut));
  return new ContractExecuteTransaction()
    .setContractId(toContractId(poolAddress))
    .setGas(DEFAULT_GAS)
    .setFunction("buy", params)
    .setPayableAmount(hbarFromTinybars(parseHbar(hbarAmount)));
}

export function nanoProSellTransaction(poolAddress: string, tokenAmount: string, minHbarOut: bigint = 0n) {
  const params = new ContractFunctionParameters()
    .addUint256(uint256(parseTokenAmount(tokenAmount)))
    .addUint256(uint256(minHbarOut));
  return new ContractExecuteTransaction()
    .setContractId(toContractId(poolAddress))
    .setGas(DEFAULT_GAS)
    .setFunction("sell", params);
}

export function curveBuyTransaction(curveAddress: string, hbarAmount: string) {
  return bondNoArgTransaction(curveAddress, "buy").setPayableAmount(
    hbarFromTinybars(parseHbar(hbarAmount)),
  );
}

export function curveSellTransaction(curveAddress: string, tokenAmount: string) {
  const params = new ContractFunctionParameters().addUint256(uint256(parseUnits(tokenAmount || "0", 8)));
  return new ContractExecuteTransaction()
    .setContractId(toContractId(curveAddress))
    .setGas(DEFAULT_GAS)
    .setFunction("sell", params);
}
