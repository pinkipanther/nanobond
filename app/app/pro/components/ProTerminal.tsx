"use client";

import { useState, useMemo } from "react";
import MarketSelector from "./MarketSelector";
import MarketStats from "./MarketStats";
import ChartPanel from "./ChartPanel";
import OrderBook from "./OrderBook";
import TradeForm from "./TradeForm";
import RecentTrades from "./RecentTrades";
import OrderHistory from "./OrderHistory";
import type { BondCardData } from "../../lib/hooks";
import type { ProBondPair } from "../lib/data";
import { generateProPairs } from "../lib/data";

interface ProTerminalProps {
    bonds: BondCardData[];
}

export default function ProTerminal({ bonds }: ProTerminalProps) {
    const pairs = useMemo(() => generateProPairs(bonds), [bonds]);
    const [selected, setSelected] = useState<ProBondPair | null>(
        pairs[0] || null,
    );

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "240px 1fr 260px",
                gridTemplateRows: "48px 1fr 200px",
                gridTemplateAreas: `
                    "stats stats stats"
                    "selector chart rightCol"
                    "selector bottom bottom"
                `,
                gap: 6,
                padding: 6,
                flex: 1,
                minHeight: 0,
                height: "calc(100vh - 76px)",
                background: "#0b0f0e",
            }}
        >
            {/* Market Stats - full width top bar */}
            <div style={{ gridArea: "stats", minHeight: 0 }}>
                <MarketStats pair={selected} />
            </div>

            {/* Left sidebar - Market Selector */}
            <div style={{ gridArea: "selector", minHeight: 0, overflow: "hidden" }}>
                <MarketSelector
                    pairs={pairs}
                    selected={selected}
                    onSelect={setSelected}
                />
            </div>

            {/* Center - Chart */}
            <div style={{ gridArea: "chart", minHeight: 0, overflow: "hidden" }}>
                <ChartPanel pair={selected} />
            </div>

            {/* Right column - OrderBook + TradeForm + RecentTrades stacked */}
            <div
                style={{
                    gridArea: "rightCol",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    overflow: "hidden",
                }}
            >
                <div style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}>
                    <OrderBook pair={selected} />
                </div>
                <div style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}>
                    <TradeForm pair={selected} />
                </div>
                <div style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}>
                    <RecentTrades pair={selected} />
                </div>
            </div>

            {/* Bottom - Order History */}
            <div style={{ gridArea: "bottom", minHeight: 0, overflow: "hidden" }}>
                <OrderHistory />
            </div>
        </div>
    );
}
