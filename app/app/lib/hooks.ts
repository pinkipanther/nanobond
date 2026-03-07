"use client";

import { useReadContract, useReadContracts, useAccount } from "wagmi";
import { formatEther } from "viem";
import { hederaTestnet } from "wagmi/chains";
import { CONTRACTS, FACTORY_ABI, LAUNCH_ABI, STAKING_ABI, ERC20_ABI } from "./contracts";

// ═══════════════════════════════════════════════════════════════
//  IMPORTANT: Every read hook MUST include chainId so wagmi
//  knows which chain to target even without a connected wallet.
// ═══════════════════════════════════════════════════════════════
const CHAIN_ID = hederaTestnet.id; // 296

// ═══════════════════════════════════════════════════════════════
//  HEDERA TINYBAR SCALING
//  Hedera EVM stores msg.value in tinybars (8 decimals)
//  but hardCap/softCap are set via parseEther (18 decimals).
//  We scale tinybar values by 10^10 to normalize to 18 decimals.
// ═══════════════════════════════════════════════════════════════
const TINYBAR_TO_WEIBAR = 10000000000n; // 10^10

export interface LiveLaunchData {
    id: number;
    name: string;
    symbol: string;
    launchContract: string;
    stakingContract: string;
    creator: string;
    totalRaised: number;
    hardCap: number;
    softCap: number;
    contributors: number;
    timeRemaining: number;
    state: number;
    tokenPrice: number;
    tokenAddress: string;
    launchEnd: number;
    totalSupply: number;
    tokensForSale: number;
    tokensForLP: number;
    tokensForStaking: number;
}

const factoryAddress = CONTRACTS.FACTORY as `0x${string}`;
const factoryAbi = FACTORY_ABI as any;
const launchAbi = LAUNCH_ABI as any;
const stakingAbi = STAKING_ABI as any;
const erc20Abi = ERC20_ABI as any;

/**
 * Hook to read all launches from factory and their on-chain details.
 */
export function useLaunches() {
    // Step 1: Get the launch count
    const {
        data: countData,
        isLoading: countLoading,
        error: countError,
    } = useReadContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "launchCount",
        chainId: CHAIN_ID,
    });

    const count = countData ? Number(countData) : 0;

    // Log for debugging
    if (typeof window !== "undefined" && countData !== undefined) {
        console.log("[NanoBond] launchCount:", count, "error:", countError?.message || "none");
    }

    // Step 2: Get each launch info from factory
    const factoryCalls = Array.from({ length: count }, (_, i) => ({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "getLaunch" as const,
        args: [BigInt(i)],
        chainId: CHAIN_ID,
    }));

    const {
        data: launchInfos,
        isLoading: infosLoading,
        error: infosError,
    } = useReadContracts({
        contracts: factoryCalls as any,
        query: { enabled: count > 0 },
    });

    if (typeof window !== "undefined" && infosError) {
        console.error("[NanoBond] getLaunch error:", infosError);
    }

    // Step 3: Extract factory info
    const launchAddresses: `0x${string}`[] = [];
    const stakingAddresses: string[] = [];
    const creators: string[] = [];
    const names: string[] = [];
    const symbols: string[] = [];

    if (launchInfos) {
        for (const info of launchInfos) {
            if (info.status === "success" && info.result) {
                const r = info.result as any;
                launchAddresses.push((r.launchContract || r[0]) as `0x${string}`);
                stakingAddresses.push(r.stakingContract || r[1]);
                creators.push(r.creator || r[2]);
                names.push(r.name || r[3]);
                symbols.push(r.symbol || r[4]);
            }
        }
    }

    // Step 4: Call getLaunchInfo() + extra data on each launch contract
    const launchInfoCalls = launchAddresses.map((addr) => ({
        address: addr,
        abi: launchAbi,
        functionName: "getLaunchInfo" as const,
        chainId: CHAIN_ID,
    }));

    const extraCalls = launchAddresses.flatMap((addr) => [
        { address: addr, abi: launchAbi, functionName: "getTimeRemaining" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "getTokenPrice" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "tokensForSale" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "tokensForLP" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "tokensForStaking" as const, chainId: CHAIN_ID },
    ]);

    const {
        data: launchInfoData,
        isLoading: infoLoading,
    } = useReadContracts({
        contracts: launchInfoCalls as any,
        query: { enabled: launchAddresses.length > 0, refetchInterval: 15_000 },
    });

    const {
        data: extraData,
        isLoading: extraLoading,
    } = useReadContracts({
        contracts: extraCalls as any,
        query: { enabled: launchAddresses.length > 0, refetchInterval: 15_000 },
    });

    // Step 5: Merge everything
    const launches: LiveLaunchData[] = [];
    if (launchInfoData) {
        for (let i = 0; i < launchAddresses.length; i++) {
            const infoD = launchInfoData[i];
            if (!infoD || infoD.status !== "success" || !infoD.result) {
                if (typeof window !== "undefined") {
                    console.warn("[NanoBond] getLaunchInfo failed for", launchAddresses[i], infoD);
                }
                continue;
            }

            const r = infoD.result as any;
            const rArr = Array.isArray(r) ? r : Object.values(r);

            const extraOffset = i * 5;
            const getExtra = (idx: number): bigint => {
                if (!extraData) return 0n;
                const d = extraData[extraOffset + idx];
                if (d && d.status === "success" && d.result !== undefined) return d.result as bigint;
                return 0n;
            };

            const totalSupplyVal = rArr[2] as bigint || 0n;
            const hardCapVal = rArr[3] as bigint || 0n;
            const softCapVal = rArr[4] as bigint || 0n;
            // totalRaised comes from msg.value which on Hedera is in tinybars (8 dec)
            // Scale up by 10^10 to match hardCap/softCap which are in weibars (18 dec)
            const totalRaisedRaw = rArr[5] as bigint || 0n;
            const totalRaisedVal = totalRaisedRaw * TINYBAR_TO_WEIBAR;
            const launchEndVal = rArr[6] as bigint || 0n;
            const stateVal = Number(rArr[7] || 0);
            const contributorCountVal = Number(rArr[8] || 0);
            const tokenAddrVal = (rArr[9] || "0x0000000000000000000000000000000000000000") as string;
            const tokenPriceVal = getExtra(1);

            launches.push({
                id: i,
                name: names[i] || (rArr[0] as string) || "",
                symbol: symbols[i] || (rArr[1] as string) || "",
                launchContract: launchAddresses[i],
                stakingContract: stakingAddresses[i] || "",
                creator: creators[i] || "",
                totalRaised: parseFloat(formatEther(totalRaisedVal)),
                hardCap: parseFloat(formatEther(hardCapVal)),
                softCap: parseFloat(formatEther(softCapVal)),
                contributors: contributorCountVal,
                timeRemaining: Number(getExtra(0)),
                state: stateVal,
                tokenPrice: parseFloat(formatEther(tokenPriceVal)),
                tokenAddress: tokenAddrVal,
                launchEnd: Number(launchEndVal),
                totalSupply: parseFloat(formatEther(totalSupplyVal)),
                tokensForSale: parseFloat(formatEther(getExtra(2))),
                tokensForLP: parseFloat(formatEther(getExtra(3))),
                tokensForStaking: parseFloat(formatEther(getExtra(4))),
            });
        }
    }

    return {
        launches,
        isLoading: countLoading || infosLoading || infoLoading || extraLoading,
        error: countError,
        count,
    };
}

// ═══════════════════════════════════════════════════════════════
//                   SINGLE LAUNCH DETAIL HOOK
// ═══════════════════════════════════════════════════════════════

export function useLaunchDetail(launchAddress: string) {
    const { address: userAddress } = useAccount();
    const addr = launchAddress as `0x${string}`;

    const contracts = [
        { address: addr, abi: launchAbi, functionName: "totalRaised" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "hardCap" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "softCap" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "contributorCount" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "getTimeRemaining" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "state" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "getTokenPrice" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "token" as const, chainId: CHAIN_ID },
        ...(userAddress
            ? [
                { address: addr, abi: launchAbi, functionName: "contributions" as const, args: [userAddress], chainId: CHAIN_ID },
                { address: addr, abi: launchAbi, functionName: "hasClaimed" as const, args: [userAddress], chainId: CHAIN_ID },
            ]
            : []),
    ];

    return useReadContracts({
        contracts: contracts as any,
        query: {
            enabled: !!launchAddress,
            refetchInterval: 10_000,
        },
    });
}

// ═══════════════════════════════════════════════════════════════
//                    STAKING POOLS HOOK
// ═══════════════════════════════════════════════════════════════

export interface LiveStakingPool {
    tokenName: string;
    tokenSymbol: string;
    stakingAddress: string;
    tokenAddress: string;
    totalStaked: number;
    userStaked: number;
    userEarned: number;
    apr: number;
    totalRewards: number;
    stakingEnd: number;
    totalStakers: number;
    tokenBalance: number;
    initialized: boolean;
    launchName: string;
}

export function useStakingPools() {
    const { address: userAddress } = useAccount();
    const { launches, isLoading: launchesLoading } = useLaunches();

    const stakingAddresses = launches.map((l) => l.stakingContract as `0x${string}`);
    const tokenAddresses = launches.map((l) => l.tokenAddress as `0x${string}`);

    const stakingCalls = stakingAddresses.flatMap((addr, i) => [
        { address: addr, abi: stakingAbi, functionName: "totalStaked" as const, chainId: CHAIN_ID },
        { address: addr, abi: stakingAbi, functionName: "totalRewards" as const, chainId: CHAIN_ID },
        { address: addr, abi: stakingAbi, functionName: "stakingEnd" as const, chainId: CHAIN_ID },
        { address: addr, abi: stakingAbi, functionName: "totalStakers" as const, chainId: CHAIN_ID },
        { address: addr, abi: stakingAbi, functionName: "getAPR" as const, chainId: CHAIN_ID },
        { address: addr, abi: stakingAbi, functionName: "initialized" as const, chainId: CHAIN_ID },
        ...(userAddress
            ? [
                { address: addr, abi: stakingAbi, functionName: "stakedBalance" as const, args: [userAddress], chainId: CHAIN_ID },
                { address: addr, abi: stakingAbi, functionName: "earned" as const, args: [userAddress], chainId: CHAIN_ID },
                { address: tokenAddresses[i], abi: erc20Abi, functionName: "balanceOf" as const, args: [userAddress], chainId: CHAIN_ID },
            ]
            : []),
    ]);

    const {
        data: stakingData,
        isLoading: stakingLoading,
    } = useReadContracts({
        contracts: stakingCalls as any,
        query: {
            enabled: stakingAddresses.length > 0,
            refetchInterval: 15_000,
        },
    });

    const pools: LiveStakingPool[] = [];
    const fieldsPerPool = userAddress ? 9 : 6;

    if (stakingData) {
        for (let i = 0; i < launches.length; i++) {
            const launch = launches[i];
            const offset = i * fieldsPerPool;

            const getValue = (idx: number): bigint => {
                const d = stakingData[offset + idx];
                if (d && d.status === "success" && d.result !== undefined) return d.result as bigint;
                return 0n;
            };
            const getBool = (idx: number): boolean => {
                const d = stakingData[offset + idx];
                if (d && d.status === "success" && d.result !== undefined) return d.result as boolean;
                return false;
            };

            pools.push({
                launchName: launch.name,
                tokenName: launch.name,
                tokenSymbol: launch.symbol,
                stakingAddress: launch.stakingContract,
                tokenAddress: launch.tokenAddress,
                totalStaked: parseFloat(formatEther(getValue(0))),
                totalRewards: parseFloat(formatEther(getValue(1))),
                stakingEnd: Number(getValue(2)),
                totalStakers: Number(getValue(3)),
                apr: Number(getValue(4)),
                initialized: getBool(5),
                userStaked: userAddress ? parseFloat(formatEther(getValue(6))) : 0,
                userEarned: userAddress ? parseFloat(formatEther(getValue(7))) : 0,
                tokenBalance: userAddress ? parseFloat(formatEther(getValue(8))) : 0,
            });
        }
    }

    return {
        pools,
        isLoading: launchesLoading || stakingLoading,
    };
}
