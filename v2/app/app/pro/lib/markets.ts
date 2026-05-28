"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Abi } from "viem";
import type { BondCardData } from "../../lib/hooks";
import { publicClient } from "../../lib/hooks";
import {
  CONTRACTS,
  PRO_FACTORY_ABI,
  PRO_POOL_ABI,
  TOKEN_ABI,
  isConfiguredAddress,
  isEvmAddress,
} from "../../lib/contracts";
import { useWallet } from "../../lib/wallet";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export type NanoProMarket = {
  id: number;
  name: string;
  symbol: string;
  pairSymbol: string;
  state: number;
  aprBps: number;
  bondAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  poolAddress: `0x${string}` | null;
  reserveHbar: bigint;
  reserveToken: bigint;
  spotPrice: bigint;
  tokenBalance: bigint;
  lpBalance: bigint;
  pendingReward: bigint;
  poolReady: boolean;
};

type MarketState = {
  markets: NanoProMarket[];
  isLoading: boolean;
  error: Error | null;
};

function isAddress(value: string): value is `0x${string}` {
  return isEvmAddress(value);
}

async function readContract<T>(
  address: `0x${string}`,
  abi: Abi,
  functionName: string,
  args?: readonly unknown[],
) {
  return publicClient.readContract({ address, abi, functionName, args }) as Promise<T>;
}

export function useNanoProMarkets(bonds: BondCardData[]) {
  const wallet = useWallet();
  const [state, setState] = useState<MarketState>({ markets: [], isLoading: false, error: null });

  const loadMarkets = useCallback(async () => {
    const tokenizedBonds = bonds.filter((bond) => isAddress(bond.bondContract) && isAddress(bond.tokenAddress));
    if (tokenizedBonds.length === 0) {
      setState({ markets: [], isLoading: false, error: null });
      return;
    }

    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const markets = await Promise.all(
        tokenizedBonds.map(async (bond) => {
          const tokenAddress = bond.tokenAddress as `0x${string}`;
          const bondAddress = bond.bondContract as `0x${string}`;
          let poolAddress: `0x${string}` | null = null;
          let reserveHbar = 0n;
          let reserveToken = 0n;
          let spotPrice = 0n;
          let lpBalance = 0n;
          let tokenBalance = 0n;
          let pendingReward = 0n;

          if (wallet.evmAddress) {
            [tokenBalance, pendingReward] = await Promise.all([
              readContract<bigint>(tokenAddress, TOKEN_ABI, "balanceOf", [wallet.evmAddress]),
              readContract<bigint>(tokenAddress, TOKEN_ABI, "pendingReward", [wallet.evmAddress]),
            ]);
          }

          if (isConfiguredAddress(CONTRACTS.PRO_FACTORY) && isEvmAddress(CONTRACTS.PRO_FACTORY)) {
            const pool = await readContract<string>(CONTRACTS.PRO_FACTORY, PRO_FACTORY_ABI, "getPool", [tokenAddress]);
            if (isAddress(pool) && pool.toLowerCase() !== ZERO_ADDRESS) {
              poolAddress = pool;
              [reserveHbar, reserveToken, spotPrice] = await Promise.all([
                readContract<bigint>(poolAddress, PRO_POOL_ABI, "reserveHbar"),
                readContract<bigint>(poolAddress, PRO_POOL_ABI, "reserveToken"),
                readContract<bigint>(poolAddress, PRO_POOL_ABI, "spotPrice"),
              ]);
              if (wallet.evmAddress) {
                lpBalance = await readContract<bigint>(poolAddress, PRO_POOL_ABI, "balanceOf", [wallet.evmAddress]);
              }
            }
          }

          return {
            id: bond.id,
            name: bond.name,
            symbol: bond.symbol,
            pairSymbol: `${bond.symbol}/HBAR`,
            state: bond.state,
            aprBps: bond.yieldRateBps,
            bondAddress,
            tokenAddress,
            poolAddress,
            reserveHbar,
            reserveToken,
            spotPrice,
            tokenBalance,
            lpBalance,
            pendingReward,
            poolReady: !!poolAddress && reserveHbar > 0n && reserveToken > 0n,
          };
        }),
      );

      setState({ markets, isLoading: false, error: null });
    } catch (err) {
      setState({
        markets: [],
        isLoading: false,
        error: err instanceof Error ? err : new Error("Unable to load Nano Pro markets"),
      });
    }
  }, [bonds, wallet.evmAddress]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadMarkets();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadMarkets]);

  return useMemo(
    () => ({
      ...state,
      refresh: loadMarkets,
      factoryConfigured: isConfiguredAddress(CONTRACTS.PRO_FACTORY),
    }),
    [loadMarkets, state],
  );
}
