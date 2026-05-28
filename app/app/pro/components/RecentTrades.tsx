"use client";

import { useMemo } from "react";
import type { ProBondPair } from "../lib/data";
import { generateRecentTrades } from "../lib/data";

interface RecentTradesProps {
    pair: ProBondPair | null;
}

export default function RecentTrades({ pair }: RecentTradesProps) {
    const trades = useMemo(() => {
        if (!pair) return [];
        return generateRecentTrades(pair);
    }, [pair]);

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: "#0e1420",
                borderRadius: 8,
                border: "1px solid #1e2d45",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid #1e2d45",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#556b65",
                }}
            >
                Recent Trades
            </div>
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {!pair ? (
                    <div
                        style={{
                            padding: 20,
                            textAlign: "center",
                            color: "#556b65",
                            fontSize: 12,
                        }}
                    >
                        Select a market
                    </div>
                ) : (
                    trades.map((trade) => (
                        <div
                            key={trade.id}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                                gap: 6,
                                padding: "4px 10px",
                                fontSize: 11,
                                fontFamily: "var(--font-mono)",
                                borderBottom: "1px solid rgba(34,51,47,0.3)",
                            }}
                        >
                            <span style={{ color: "#556b65" }}>
                                {trade.time}
                            </span>
                            <span
                                style={{
                                    color:
                                        trade.side === "buy"
                                            ? "#3fb950"
                                            : "#f85149",
                                    fontWeight: 700,
                                }}
                            >
                                {trade.price.toFixed(trade.price < 1 ? 6 : 4)}
                            </span>
                            <span style={{ color: "#8a9a95", textAlign: "right" }}>
                                {trade.size.toFixed(2)}
                            </span>
                            <span
                                style={{
                                    color:
                                        trade.side === "buy"
                                            ? "#3fb950"
                                            : "#f85149",
                                    textAlign: "right",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    fontSize: 10,
                                }}
                            >
                                {trade.side}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
