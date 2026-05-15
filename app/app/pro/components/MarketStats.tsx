"use client";

import type { ProBondPair } from "../lib/data";

interface MarketStatsProps {
    pair: ProBondPair | null;
}

export default function MarketStats({ pair }: MarketStatsProps) {
    if (!pair) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 16px",
                    height: 48,
                    borderBottom: "1px solid #22332f",
                    background: "#111916",
                    gap: 24,
                }}
            >
                <span
                    style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#556b65",
                    }}
                >
                    Select a market to view stats
                </span>
            </div>
        );
    }

    const isUp = pair.change24h >= 0;

    const stats = [
        {
            label: "Last Price",
            value: `${pair.lastPrice.toFixed(pair.lastPrice < 1 ? 6 : 4)} HBAR`,
            color: isUp ? "#3fb950" : "#f85149",
        },
        {
            label: "24h Change",
            value: `${isUp ? "+" : ""}${pair.change24h.toFixed(2)}%`,
            color: isUp ? "#3fb950" : "#f85149",
        },
        {
            label: "24h High",
            value: `${pair.high24h.toFixed(pair.high24h < 1 ? 6 : 4)}`,
        },
        {
            label: "24h Low",
            value: `${pair.low24h.toFixed(pair.low24h < 1 ? 6 : 4)}`,
        },
        {
            label: "24h Volume",
            value: `${(pair.volume24h / 1000).toFixed(2)}k HBAR`,
        },
        {
            label: "Spread",
            value: `${pair.spread.toFixed(pair.spread < 0.001 ? 8 : 6)}`,
        },
    ];

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
                height: 48,
                borderBottom: "1px solid #22332f",
                background: "#111916",
                gap: 20,
                overflowX: "auto",
                scrollbarWidth: "none",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    paddingRight: 16,
                    borderRight: "1px solid #22332f",
                    flexShrink: 0,
                }}
            >
                <span
                    style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#e8f0ee",
                    }}
                >
                    {pair.symbol}
                </span>
                <span
                    style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: isUp ? "rgba(63,185,80,0.15)" : "rgba(248,81,73,0.15)",
                        color: isUp ? "#3fb950" : "#f85149",
                    }}
                >
                    {isUp ? "Bull" : "Bear"}
                </span>
            </div>
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        flexShrink: 0,
                        minWidth: 80,
                    }}
                >
                    <span
                        style={{
                            fontSize: 9,
                            color: "#556b65",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            fontWeight: 800,
                        }}
                    >
                        {stat.label}
                    </span>
                    <span
                        style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 13,
                            fontWeight: 700,
                            color: stat.color || "#e8f0ee",
                        }}
                    >
                        {stat.value}
                    </span>
                </div>
            ))}
        </div>
    );
}
