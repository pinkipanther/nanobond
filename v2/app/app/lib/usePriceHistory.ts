"use client";

import { useEffect, useState } from "react";
import { keccak256, stringToHex } from "viem";
import { HEDERA_MIRROR_NODE_URL } from "./contracts";

const BOUGHT_TOPIC = keccak256(stringToHex("Bought(address,uint256,uint256)"));
const SOLD_TOPIC = keccak256(stringToHex("Sold(address,uint256,uint256)"));
const LIQ_TOPIC = keccak256(stringToHex("LiquidityAdded(address,uint256,uint256,uint256)"));

const MIRROR = HEDERA_MIRROR_NODE_URL;

export interface PricePoint {
  time: number;
  price: number;
}

function decodeUint256(hex: string, offset: number): bigint {
  const start = 2 + offset * 64;
  return BigInt("0x" + hex.slice(start, start + 64));
}

interface LogEntry {
  topic0: string;
  topics: string[];
  data: string;
  consensus_timestamp: string;
}

function parseLogEntry(raw: Record<string, unknown>): LogEntry {
  const topics = (raw.topics as string[]) ?? [];
  return {
    topic0: topics[0] ?? "",
    topics,
    data: (raw.data as string) ?? "0x",
    consensus_timestamp:
      (raw.consensus_timestamp as string) ?? (raw.timestamp as string) ?? "0",
  };
}

export function usePriceHistory(poolAddress: string | null) {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(!!poolAddress);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!poolAddress) return;

    let cancelled = false;

    async function fetchEvents() {
      try {
        const url = `${MIRROR}/api/v1/contracts/${poolAddress}/results/logs?order=asc&limit=100`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Mirror node error: ${res.status}`);
        const json = await res.json();

        const rawEntries: Record<string, unknown>[] = Array.isArray(json)
          ? json
          : (json.logs as Record<string, unknown>[]) ?? [];

        const entries = rawEntries.map(parseLogEntry);

        if (entries.length === 0) {
          if (!cancelled) {
            setHistory([]);
            setLoading(false);
          }
          return;
        }

        const points: PricePoint[] = [];
        let reserveHbar = 0n;
        let reserveToken = 0n;

        for (const entry of entries) {
          const tsSec = Math.floor(parseFloat(entry.consensus_timestamp));
          const topic0 = entry.topic0.toLowerCase();

          if (topic0 === LIQ_TOPIC.toLowerCase()) {
            reserveHbar += decodeUint256(entry.data, 0);
            reserveToken += decodeUint256(entry.data, 1);
          } else if (topic0 === BOUGHT_TOPIC.toLowerCase()) {
            reserveHbar += BigInt(entry.topics[2]);
            reserveToken -= BigInt(entry.topics[3]);
          } else if (topic0 === SOLD_TOPIC.toLowerCase()) {
            reserveToken += BigInt(entry.topics[2]);
            reserveHbar -= BigInt(entry.topics[3]);
          }

          if (reserveToken > 0n && tsSec > 0) {
            const price =
              Number((reserveHbar * 1_000_000_000_000_000_000n) / reserveToken) / 1e18;
            points.push({ time: tsSec, price });
          }
        }

        if (!cancelled) {
          setHistory(points);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch price history");
          setLoading(false);
        }
      }
    }

    fetchEvents();
    const interval = setInterval(fetchEvents, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [poolAddress]);

  return { history, loading, error };
}
