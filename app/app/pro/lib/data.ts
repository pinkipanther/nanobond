"use client";

import { useEffect, useState } from "react";
import type { BondCardData } from "../../lib/hooks";

export interface ProBondPair {
    id: number;
    symbol: string;
    name: string;
    bondContract: string;
    basePrice: number;
    change24h: number;
    volume24h: number;
    high24h: number;
    low24h: number;
    lastPrice: number;
    spread: number;
    state: number;
}

export interface OrderBookEntry {
    price: number;
    size: number;
    total: number;
}

export interface TradeEntry {
    id: string;
    price: number;
    size: number;
    side: "buy" | "sell";
    time: string;
}

export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface OpenOrder {
    id: string;
    pair: string;
    side: "buy" | "sell";
    type: "limit" | "market";
    price: number;
    amount: number;
    filled: number;
    status: "open" | "filled" | "cancelled";
    time: string;
}

// Generate a deterministic pseudo-random number from a seed string
function seededRandom(seed: string) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = (h << 5) - h + seed.charCodeAt(i);
        h |= 0;
    }
    const s = Math.abs(h) % 2147483647;
    return function () {
        const next = (s * 16807 + 12345) % 2147483647;
        return (next & 0x7fffffff) / 2147483647;
    };
}

export function generateProPairs(bonds: BondCardData[]): ProBondPair[] {
    return bonds.map((bond) => {
        const rand = seededRandom(bond.bondContract + bond.symbol);
        const basePrice = Math.max(
            0.0001,
            (bond.totalRaised / Math.max(bond.totalSupply, 1)) * 1000,
        );
        const change24h = (rand() - 0.48) * 20; // -9.6% to +10.4%
        const volume24h = rand() * bond.totalRaised * 0.3;
        const high24h = basePrice * (1 + Math.abs(change24h) / 100 + rand() * 0.05);
        const low24h = basePrice * (1 - Math.abs(change24h) / 100 - rand() * 0.05);
        const lastPrice = basePrice * (1 + change24h / 100);
        const spread = basePrice * 0.002 * (1 + rand() * 0.5);

        return {
            id: bond.id,
            symbol: `${bond.symbol}/HBAR`,
            name: bond.name,
            bondContract: bond.bondContract,
            basePrice,
            change24h,
            volume24h,
            high24h,
            low24h,
            lastPrice: Math.max(lastPrice, 0.00001),
            spread: Math.max(spread, 0.000001),
            state: bond.state,
        };
    });
}

export function generateCandles(
    pair: ProBondPair,
    points: number = 96,
): Candle[] {
    const rand = seededRandom(pair.bondContract + "candles");
    const candles: Candle[] = [];
    const now = Math.floor(Date.now() / 1000);
    const interval = 900; // 15 min candles
    let price = pair.lastPrice / (1 + pair.change24h / 100);

    for (let i = 0; i < points; i++) {
        const volatility = price * 0.008;
        const change = (rand() - 0.5) * volatility * 2;
        const open = price;
        const close = Math.max(price + change, pair.low24h * 0.5);
        const high = Math.max(open, close) + rand() * volatility;
        const low = Math.min(open, close) - rand() * volatility;
        candles.push({
            time: now - (points - i) * interval,
            open,
            high,
            low: Math.max(low, 0.000001),
            close,
        });
        price = close;
    }

    // Ensure last candle aligns closer to current price
    const last = candles[candles.length - 1];
    if (last) {
        last.close = pair.lastPrice;
        last.high = Math.max(last.high, pair.lastPrice);
        last.low = Math.min(last.low, pair.lastPrice);
    }

    return candles;
}

export function generateOrderBook(pair: ProBondPair): {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
} {
    const rand = seededRandom(pair.bondContract + "ob" + Date.now());
    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];
    const priceStep = pair.spread / 5;

    for (let i = 0; i < 12; i++) {
        const bidPrice = pair.lastPrice - pair.spread / 2 - i * priceStep;
        const askPrice = pair.lastPrice + pair.spread / 2 + i * priceStep;
        const bidSize = (rand() * 10000 + 1000) / pair.lastPrice;
        const askSize = (rand() * 10000 + 1000) / pair.lastPrice;

        bids.push({
            price: Math.max(bidPrice, 0.000001),
            size: bidSize,
            total: 0,
        });
        asks.push({
            price: Math.max(askPrice, 0.000001),
            size: askSize,
            total: 0,
        });
    }

    // Accumulate totals
    let bidTotal = 0;
    for (const bid of bids) {
        bidTotal += bid.size;
        bid.total = bidTotal;
    }
    let askTotal = 0;
    for (const ask of asks) {
        askTotal += ask.size;
        ask.total = askTotal;
    }

    return { bids, asks };
}

export function generateRecentTrades(pair: ProBondPair): TradeEntry[] {
    const rand = seededRandom(pair.bondContract + "trades");
    const trades: TradeEntry[] = [];
    const now = Date.now();

    for (let i = 0; i < 40; i++) {
        const side: "buy" | "sell" = rand() > 0.48 ? "buy" : "sell";
        const offset = i * (rand() * 40000 + 5000);
        const price = pair.lastPrice + (rand() - 0.5) * pair.spread * 3;
        trades.push({
            id: `${pair.id}-${i}`,
            price: Math.max(price, 0.000001),
            size: (rand() * 5000 + 500) / pair.lastPrice,
            side,
            time: new Date(now - offset).toLocaleTimeString("en-US", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            }),
        });
    }

    return trades;
}

export function generateDepthData(pair: ProBondPair): {
    bids: { price: number; volume: number }[];
    asks: { price: number; volume: number }[];
} {
    const rand = seededRandom(pair.bondContract + "depth");
    const bids: { price: number; volume: number }[] = [];
    const asks: { price: number; volume: number }[] = [];
    const steps = 20;
    const range = pair.lastPrice * 0.05;

    for (let i = 0; i < steps; i++) {
        const bidPrice = pair.lastPrice - (i / steps) * range;
        const askPrice = pair.lastPrice + (i / steps) * range;
        const bidVol = (1 - i / steps) * pair.volume24h * 0.3 * (0.5 + rand() * 0.5);
        const askVol = (1 - i / steps) * pair.volume24h * 0.3 * (0.5 + rand() * 0.5);
        bids.push({ price: Math.max(bidPrice, 0.000001), volume: Math.max(bidVol, 0) });
        asks.push({ price: Math.max(askPrice, 0.000001), volume: Math.max(askVol, 0) });
    }

    return { bids, asks };
}

export function useInterval(ms: number) {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), ms);
        return () => clearInterval(id);
    }, [ms]);
    return tick;
}
