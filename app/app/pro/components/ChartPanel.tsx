"use client";

import { useState } from "react";
import CandlestickChart from "./CandlestickChart";
import DepthChart from "./DepthChart";
import type { ProBondPair } from "../lib/data";
import { generateCandles, generateDepthData } from "../lib/data";

interface ChartPanelProps {
    pair: ProBondPair | null;
}

export default function ChartPanel({ pair }: ChartPanelProps) {
    const [activeTab, setActiveTab] = useState<"candles" | "depth">("candles");

    if (!pair) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    background: "#0e1420",
                    borderRadius: 8,
                    color: "#556b65",
                    fontSize: 13,
                }}
            >
                Select a bond market to view the chart
            </div>
        );
    }

    const candles = generateCandles(pair);
    const depth = generateDepthData(pair);

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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderBottom: "1px solid #1e2d45",
                    background: "rgba(22,33,30,0.6)",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                        style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            fontSize: 13,
                            color: "#e8f0ee",
                        }}
                    >
                        {pair.symbol}
                    </span>
                    <span
                        style={{
                            fontSize: 11,
                            color: "#556b65",
                            fontFamily: "var(--font-mono)",
                        }}
                    >
                        15m
                    </span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                    {(["candles", "depth"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "none",
                                background:
                                    activeTab === tab
                                        ? "linear-gradient(135deg, #6366f1, #818cf8)"
                                        : "transparent",
                                color:
                                    activeTab === tab
                                        ? "#080c14"
                                        : "#8a9a95",
                                fontFamily: "var(--font-body)",
                                fontWeight: 600,
                                fontSize: 11,
                                cursor: "pointer",
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                transition: "all 0.15s ease",
                            }}
                        >
                            {tab === "candles" ? "Candles" : "Depth"}
                        </button>
                    ))}
                </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
                {activeTab === "candles" && <CandlestickChart candles={candles} />}
                {activeTab === "depth" && (
                    <DepthChart bids={depth.bids} asks={depth.asks} />
                )}
            </div>
        </div>
    );
}
