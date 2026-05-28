"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createPublicClient,
  defineChain,
  formatEther,
  formatUnits,
  http,
  type Abi,
} from "viem";
import {
  BOND_ABI,
  CONTRACTS,
  FACTORY_ABI,
  HBAR_DECIMALS,
  HEDERA_CHAIN_ID,
  HEDERA_JSON_RPC_URL,
  HEDERA_NETWORK,
  isConfiguredAddress,
  isEvmAddress,
} from "./contracts";
import { useWallet } from "./wallet";

export interface BondCardData {
  id: number;
  name: string;
  symbol: string;
  description: string;
  bondContract: string;
  creator: string;
  totalRaised: number;
  hardCap: number;
  softCap: number;
  contributors: number;
  timeRemaining: number;
  state: number;
  yieldRateBps: number;
  epochDuration: number;
  totalStaked: number;
  totalYieldMinted: number;
  tokenAddress: string;
  totalSupply: number;
}

type BondInfoResult =
  | readonly [
      bigint,
      `0x${string}`,
      `0x${string}`,
      string,
      string,
      string,
      bigint,
      boolean,
    ]
  | {
      id: bigint;
      creator: `0x${string}`;
      bondContract: `0x${string}`;
      name: string;
      symbol: string;
      description: string;
      yieldRateBps: bigint;
      active: boolean;
    };

export type ContractReadResult =
  | { status: "success"; result: unknown }
  | { status: "failure"; error: Error };

const hederaChain = defineChain({
  id: HEDERA_CHAIN_ID,
  name: HEDERA_NETWORK === "mainnet" ? "Hedera Mainnet" : "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: [HEDERA_JSON_RPC_URL] } },
});

export const publicClient = createPublicClient({
  chain: hederaChain,
  transport: http(HEDERA_JSON_RPC_URL),
});

async function read(address: `0x${string}`, abi: Abi, functionName: string, args?: readonly unknown[]) {
  return publicClient.readContract({ address, abi, functionName, args });
}

function success(result: unknown): ContractReadResult {
  return { status: "success", result };
}

function failure(error: unknown): ContractReadResult {
  return { status: "failure", error: error instanceof Error ? error : new Error("Read failed") };
}

function normalizeBondInfo(info: BondInfoResult) {
  return "id" in info
    ? {
        id: Number(info.id),
        creator: info.creator,
        bondContract: info.bondContract,
        name: info.name,
        symbol: info.symbol,
        description: info.description,
        yieldRateBps: info.yieldRateBps,
      }
    : {
        id: Number(info[0]),
        creator: info[1],
        bondContract: info[2],
        name: info[3],
        symbol: info[4],
        description: info[5],
        yieldRateBps: info[6],
      };
}

export function useBonds() {
  const [bonds, setBonds] = useState<BondCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBonds() {
      if (!isConfiguredAddress(CONTRACTS.FACTORY)) {
        setBonds([]);
        setError(null);
        return;
      }
      if (!isEvmAddress(CONTRACTS.FACTORY)) {
        setBonds([]);
        setError(new Error("NEXT_PUBLIC_NANOBOND_FACTORY_ADDRESS must be a 0x EVM address for on-chain reads"));
        return;
      }

      setIsLoading(true);
      try {
        const count = Number(await read(CONTRACTS.FACTORY, FACTORY_ABI, "bondCount"));
        const nextBonds: BondCardData[] = [];

        for (let i = 0; i < count; i++) {
          const info = normalizeBondInfo(
            (await read(CONTRACTS.FACTORY, FACTORY_ABI, "getBond", [BigInt(i)])) as BondInfoResult,
          );
          const bondAddress = info.bondContract;
          const [
            totalRaised,
            hardCap,
            softCap,
            contributorCount,
            timeRemaining,
            state,
            totalStaked,
            totalYieldMinted,
            tokenAddress,
            totalSupply,
            epochDuration,
          ] = await Promise.all([
            read(bondAddress, BOND_ABI, "totalRaised") as Promise<bigint>,
            read(bondAddress, BOND_ABI, "hardCap") as Promise<bigint>,
            read(bondAddress, BOND_ABI, "softCap") as Promise<bigint>,
            read(bondAddress, BOND_ABI, "contributorCount") as Promise<bigint>,
            read(bondAddress, BOND_ABI, "getTimeRemaining") as Promise<bigint>,
            read(bondAddress, BOND_ABI, "state") as Promise<number>,
            read(bondAddress, BOND_ABI, "totalStaked") as Promise<bigint>,
            read(bondAddress, BOND_ABI, "totalYieldMinted") as Promise<bigint>,
            read(bondAddress, BOND_ABI, "token") as Promise<string>,
            read(bondAddress, BOND_ABI, "totalSupply") as Promise<bigint>,
            read(bondAddress, BOND_ABI, "epochDuration") as Promise<bigint>,
          ]);

          nextBonds.push({
            id: info.id,
            name: info.name,
            symbol: info.symbol,
            description: info.description,
            bondContract: bondAddress,
            creator: info.creator,
            totalRaised: parseFloat(formatUnits(totalRaised, HBAR_DECIMALS)),
            hardCap: parseFloat(formatUnits(hardCap, HBAR_DECIMALS)),
            softCap: parseFloat(formatUnits(softCap, HBAR_DECIMALS)),
            contributors: Number(contributorCount),
            timeRemaining: Number(timeRemaining),
            state: Number(state),
            yieldRateBps: Number(info.yieldRateBps),
            epochDuration: Number(epochDuration),
            totalStaked: parseFloat(formatEther(totalStaked)),
            totalYieldMinted: parseFloat(formatEther(totalYieldMinted)),
            tokenAddress,
            totalSupply: parseFloat(formatEther(totalSupply)),
          });
        }

        if (!cancelled) {
          setBonds(nextBonds);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error("Unable to load bonds"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadBonds();
    return () => {
      cancelled = true;
    };
  }, []);

  return { bonds, isLoading, error, count: bonds.length };
}

export function useBondDetail(bondAddress: string) {
  const { evmAddress } = useWallet();
  const [data, setData] = useState<ContractReadResult[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!isEvmAddress(bondAddress)) {
        setData(undefined);
        return;
      }
      setIsLoading(true);

      const baseCalls: Array<[string] | [string, readonly unknown[]]> = [
        ["totalRaised"],
        ["hardCap"],
        ["softCap"],
        ["contributorCount"],
        ["getTimeRemaining"],
        ["state"],
        ["token"],
        ["yieldRateBps"],
        ["epochDuration"],
        ["totalStaked"],
        ["totalYieldMinted"],
        ["getNextEpoch"],
        ["description"],
        ["name"],
        ["symbol"],
        ["totalSupply"],
        ["creator"],
        ["withdrawableHbar"],
        ["hbarWithdrawn"],
        ["raiseEnd"],
      ];

      if (evmAddress) {
        baseCalls.push(
          ["contributions", [evmAddress]],
          ["hasClaimed", [evmAddress]],
          ["stakedBalance", [evmAddress]],
          ["pendingYield", [evmAddress]],
        );
      }

      const results = await Promise.all(
        baseCalls.map(async ([functionName, args]) => {
          try {
            return success(await read(bondAddress, BOND_ABI, functionName, args));
          } catch (err) {
            return failure(err);
          }
        }),
      );

      if (!cancelled) {
        setData(results);
        setIsLoading(false);
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [bondAddress, evmAddress]);

  return { data, isLoading };
}

export function useBondContributors(bondAddress: string) {
  const [contributors, setContributors] = useState<Array<{ address: string; amount: bigint }>>([]);
  const [isLoadingContributors, setIsLoadingContributors] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadContributors() {
      if (!isEvmAddress(bondAddress)) {
        setContributors([]);
        return;
      }

      setIsLoadingContributors(true);
      try {
        const addresses = (await read(bondAddress, BOND_ABI, "getContributors")) as `0x${string}`[];
        const amounts = await Promise.all(
          addresses.map((address) => read(bondAddress, BOND_ABI, "contributions", [address]) as Promise<bigint>),
        );
        const next = addresses
          .map((address, index) => ({ address, amount: amounts[index] ?? 0n }))
          .sort((a, b) => Number(b.amount - a.amount));
        if (!cancelled) setContributors(next);
      } catch {
        if (!cancelled) setContributors([]);
      } finally {
        if (!cancelled) setIsLoadingContributors(false);
      }
    }

    void loadContributors();
    return () => {
      cancelled = true;
    };
  }, [bondAddress]);

  return useMemo(
    () => ({ contributors, isLoadingContributors }),
    [contributors, isLoadingContributors],
  );
}
