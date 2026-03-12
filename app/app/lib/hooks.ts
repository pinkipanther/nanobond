"use client";

import { useReadContract, useReadContracts, useAccount } from "wagmi";
import { formatEther, formatUnits } from "viem";
import { hedera } from "wagmi/chains";
import { CONTRACTS, FACTORY_ABI, BOND_ABI } from "./contracts";

// ═══════════════════════════════════════════════════════════════
//  Every read hook MUST include chainId so wagmi knows which
//  chain to target even without a connected wallet.
// ═══════════════════════════════════════════════════════════════
const CHAIN_ID = hedera.id; // 295

// Hedera EVM stores msg.value in tinybars (8 decimals)
// hardCap/softCap are now correctly stored as 8-decimals natively.

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

const factoryAddress = CONTRACTS.FACTORY as `0x${string}`;
const factoryAbi = FACTORY_ABI as any;
const bondAbi = BOND_ABI as any;

/**
 * Hook to read all bonds from factory and their on-chain details.
 */
export function useBonds() {
    // Step 1: Get bond count
    const {
        data: countData,
        isLoading: countLoading,
        error: countError,
    } = useReadContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "bondCount",
        chainId: CHAIN_ID,
    });

    const count = countData ? Number(countData) : 0;

    // Step 2: Get each bond info from factory
    const factoryCalls = Array.from({ length: count }, (_, i) => ({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "getBond" as const,
        args: [BigInt(i)],
        chainId: CHAIN_ID,
    }));

    const {
        data: bondInfos,
        isLoading: infosLoading,
    } = useReadContracts({
        contracts: factoryCalls as any,
        query: { enabled: count > 0 },
    });

    // Step 3: Extract bond addresses and factory metadata
    const bondAddresses: `0x${string}`[] = [];
    const creators: string[] = [];
    const names: string[] = [];
    const symbols: string[] = [];
    const descriptions: string[] = [];
    const yieldRates: number[] = [];

    if (bondInfos) {
        for (const info of bondInfos) {
            if (info.status === "success" && info.result) {
                const r = info.result as any;
                bondAddresses.push((r.bondContract || r[2]) as `0x${string}`);
                creators.push(r.creator || r[1]);
                names.push(r.name || r[3]);
                symbols.push(r.symbol || r[4]);
                descriptions.push(r.description || r[5]);
                yieldRates.push(Number(r.yieldRateBps || r[6] || 0));
            }
        }
    }

    // Step 4: Get on-chain bond details
    const bondDetailCalls = bondAddresses.flatMap((addr) => [
        { address: addr, abi: bondAbi, functionName: "totalRaised" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "hardCap" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "softCap" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "contributorCount" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "getTimeRemaining" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "state" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "totalStaked" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "totalYieldMinted" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "token" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "totalSupply" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "epochDuration" as const, chainId: CHAIN_ID },
    ]);

    const FIELDS_PER_BOND = 11;

    const {
        data: detailData,
        isLoading: detailLoading,
    } = useReadContracts({
        contracts: bondDetailCalls as any,
        query: { enabled: bondAddresses.length > 0, refetchInterval: 15_000 },
    });

    // Step 5: Merge
    const bonds: BondCardData[] = [];
    if (detailData) {
        for (let i = 0; i < bondAddresses.length; i++) {
            const offset = i * FIELDS_PER_BOND;
            const get = (idx: number): bigint => {
                const d = detailData[offset + idx];
                if (d && d.status === "success" && d.result !== undefined) return d.result as bigint;
                return 0n;
            };
            const getStr = (idx: number): string => {
                const d = detailData[offset + idx];
                if (d && d.status === "success" && d.result !== undefined) return d.result as string;
                return "";
            };

            const totalRaisedRaw = get(0);

            bonds.push({
                id: i,
                name: names[i] || "",
                symbol: symbols[i] || "",
                description: descriptions[i] || "",
                bondContract: bondAddresses[i],
                creator: creators[i] || "",
                totalRaised: parseFloat(formatUnits(totalRaisedRaw, 8)),
                hardCap: parseFloat(formatUnits(get(1), 8)),
                softCap: parseFloat(formatUnits(get(2), 8)),
                contributors: Number(get(3)),
                timeRemaining: Number(get(4)),
                state: Number(get(5)),
                totalStaked: parseFloat(formatEther(get(6))),
                totalYieldMinted: parseFloat(formatEther(get(7))),
                tokenAddress: getStr(8),
                totalSupply: parseFloat(formatEther(get(9))),
                epochDuration: Number(get(10)),
                yieldRateBps: yieldRates[i] || 0,
            });
        }
    }

    return {
        bonds,
        isLoading: countLoading || infosLoading || detailLoading,
        error: countError,
        count,
    };
}

// ═══════════════════════════════════════════════════════════════
//                   SINGLE BOND DETAIL HOOK
// ═══════════════════════════════════════════════════════════════

export function useBondDetail(bondAddress: string) {
    const { address: userAddress } = useAccount();
    const addr = bondAddress as `0x${string}`;

    const contracts = [
        { address: addr, abi: bondAbi, functionName: "totalRaised" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "hardCap" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "softCap" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "contributorCount" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "getTimeRemaining" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "state" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "token" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "yieldRateBps" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "epochDuration" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "totalStaked" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "totalYieldMinted" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "getNextEpoch" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "description" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "name" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "symbol" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "totalSupply" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "creator" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "withdrawableHbar" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "hbarWithdrawn" as const, chainId: CHAIN_ID },
        { address: addr, abi: bondAbi, functionName: "raiseEnd" as const, chainId: CHAIN_ID },
        ...(userAddress
            ? [
                { address: addr, abi: bondAbi, functionName: "contributions" as const, args: [userAddress], chainId: CHAIN_ID },
                { address: addr, abi: bondAbi, functionName: "hasClaimed" as const, args: [userAddress], chainId: CHAIN_ID },
                { address: addr, abi: bondAbi, functionName: "stakedBalance" as const, args: [userAddress], chainId: CHAIN_ID },
                { address: addr, abi: bondAbi, functionName: "pendingYield" as const, args: [userAddress], chainId: CHAIN_ID },
            ]
            : []),
    ];

    return useReadContracts({
        contracts: contracts as any,
        query: {
            enabled: !!bondAddress,
            refetchInterval: 10_000,
        },
    });
}

// ═══════════════════════════════════════════════════════════════
//                   BOND CONTRIBUTORS HOOK
// ═══════════════════════════════════════════════════════════════

export function useBondContributors(bondAddress: string) {
    const addr = bondAddress as `0x${string}`;

    const { data: contributorsData, isLoading: isLoadingContributors } = useReadContract({
        address: addr,
        abi: bondAbi,
        functionName: "getContributors",
        chainId: CHAIN_ID,
        query: { enabled: !!bondAddress },
    });

    const contributors = (contributorsData as `0x${string}`[]) || [];

    const contributionCalls = contributors.map((contributor) => ({
        address: addr,
        abi: bondAbi,
        functionName: "contributions",
        args: [contributor],
        chainId: CHAIN_ID,
    }));

    const { data: contributionsData, isLoading: isLoadingAmounts } = useReadContracts({
        contracts: contributionCalls as any,
        query: { enabled: contributors.length > 0 },
    });

    const contributorList = contributors.map((address, index) => {
        let amount = 0n;
        if (contributionsData && contributionsData[index] && contributionsData[index].status === "success") {
            amount = contributionsData[index].result as bigint;
        }
        return {
            address,
            amount,
        };
    }).sort((a, b) => Number(b.amount - a.amount));

    return {
        contributors: contributorList,
        isLoading: isLoadingContributors || isLoadingAmounts,
    };
}
