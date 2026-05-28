"use client";

import { useState } from "react";
import type { ProBondPair } from "../lib/data";

interface MarketSelectorProps {
    pairs: ProBondPair[];
    selected: ProBondPair | null;
    onSelect: (pair: ProBondPair) => void;
}

const stateLabels = ["RAISING", "ACTIVE", "MATURED", "FAILED", "CANCELLED"];
const stateColors = [
    "#cd8a32", // RAISING - gold
    "#10b981", // ACTIVE - acid
    "#6366f1", // MATURED - cyan
    "#e04768", // FAILED - magenta
    "#84939f", // CANCELLED - dim
];

export default function MarketSelector({
    pairs,
    selected,
    onSelect,
}: MarketSelectorProps) {
    const [filter, setFilter] = useState("");

    const filtered = pairs.filter(
        (p) =>
            p.symbol.toLowerCase().includes(filter.toLowerCase()) ||
            p.name.toLowerCase().includes(filter.toLowerCase()),
    );

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: "#0e1420",
                borderRight: "1px solid #1e2d45",
            }}
        >
            <div
                style={{
                    padding: "14px 12px",
                    borderBottom: "1px solid #1e2d45",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}
            >
                <span
                    style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#556b65",
                        whiteSpace: "nowrap",
                    }}
                >
                    Markets
                </span>
                <span
                    style={{
                        fontSize: 11,
                        color: "#556b65",
                        background: "#192133",
                        padding: "2px 6px",
                        borderRadius: 999,
                        fontFamily: "var(--font-mono)",
                    }}
                >
                    {pairs.length}
                </span>
            </div>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #1e2d45" }}>
                <input
                    type="text"
                    placeholder="Search..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{
                        width: "100%",
                        background: "#131a28",
                        border: "1px solid #1e2d45",
                        borderRadius: 8,
                        padding: "8px 10px",
                        fontSize: 12,
                        fontFamily: "var(--font-body)",
                        color: "#e8f0ee",
                        outline: "none",
                    }}
                />
            </div>
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {filtered.map((pair) => {
                    const isActive = selected?.symbol === pair.symbol;
                    const isUp = pair.change24h >= 0;
                    return (
                        <button
                            key={pair.symbol}
                            onClick={() => onSelect(pair)}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                padding: "10px 12px",
                                border: "none",
                                borderBottom: "1px solid rgba(34,51,47,0.5)",
                                background: isActive
                                    ? "linear-gradient(135deg, rgba(22,150,184,0.12), rgba(15,164,131,0.08))"
                                    : "transparent",
                                cursor: "pointer",
                                textAlign: "left",
                                transition: "all 0.15s ease",
                                position: "relative",
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLButtonElement).style.background =
                                        "#131a28";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLButtonElement).style.background =
                                        "transparent";
                                }
                            }}
                        >
                            {isActive && (
                                <div
                                    style={{
                                        position: "absolute",
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: 3,
                                        background:
                                            "linear-gradient(180deg, #6366f1, #10b981)",
                                    }}
                                />
                            )}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 4,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                    }}
                                >
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
                                            fontSize: 9,
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.06em",
                                            padding: "2px 5px",
                                            borderRadius: 4,
                                            background:
                                                stateColors[pair.state] + "22",
                                            color: stateColors[pair.state],
                                        }}
                                    >
                                        {stateLabels[pair.state] || "UNKNOWN"}
                                    </span>
                                </div>
                                <span
                                    style={{
                                        fontFamily: "var(--font-mono)",
                                        fontWeight: 700,
                                        fontSize: 12,
                                        color: isUp ? "#3fb950" : "#f85149",
                                    }}
                                >
                                    {isUp ? "+" : ""}
                                    {pair.change24h.toFixed(2)}%
                                </span>
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <span
                                    style={{
                                        fontFamily: "var(--font-mono)",
                                        fontSize: 12,
                                        color: "#8a9a95",
                                    }}
                                >
                                    {pair.lastPrice.toFixed(pair.lastPrice < 1 ? 6 : 4)}{" "}
                                    HBAR
                                </span>
                                <span
                                    style={{
                                        fontFamily: "var(--font-mono)",
                                        fontSize: 10,
                                        color: "#556b65",
                                    }}
                                >
                                    Vol {(pair.volume24h / 1000).toFixed(1)}k
                                </span>
                            </div>
                        </button>
                    );
                })}
                {filtered.length === 0 && (
                    <div
                        style={{
                            padding: 20,
                            textAlign: "center",
                            color: "#556b65",
                            fontSize: 12,
                        }}
                    >
                        No markets found
                    </div>
                )}
            </div>
        </div>
    );
}
