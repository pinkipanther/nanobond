"use client";

import { useMemo } from "react";
import type { ProBondPair } from "../lib/data";
import { generateOrderBook } from "../lib/data";

interface OrderBookProps {
    pair: ProBondPair | null;
}

export default function OrderBook({ pair }: OrderBookProps) {
    const data = useMemo(() => {
        if (!pair) return null;
        return generateOrderBook(pair);
    }, [pair]);

    if (!pair || !data) {
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
                Select a market
            </div>
        );
    }

    const { bids, asks } = data;
    const midPrice = (bids[0]?.price || 0 + (asks[0]?.price || 0)) / 2 || pair.lastPrice;

    const maxBidTotal = Math.max(...bids.map((b) => b.total));
    const maxAskTotal = Math.max(...asks.map((a) => a.total));

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
                Order Book
            </div>

            {/* Asks */}
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column-reverse",
                }}
            >
                {asks.map((ask, i) => (
                    <div
                        key={`ask-${i}`}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: 8,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontFamily: "var(--font-mono)",
                            position: "relative",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: `${(ask.total / maxAskTotal) * 100}%`,
                                background: "rgba(248, 81, 73, 0.08)",
                                zIndex: 0,
                            }}
                        />
                        <span style={{ color: "#f85149", zIndex: 1 }}>
                            {ask.price.toFixed(ask.price < 1 ? 6 : 4)}
                        </span>
                        <span
                            style={{
                                color: "#8a9a95",
                                textAlign: "right",
                                zIndex: 1,
                            }}
                        >
                            {ask.size.toFixed(2)}
                        </span>
                        <span
                            style={{
                                color: "#556b65",
                                textAlign: "right",
                                zIndex: 1,
                            }}
                        >
                            {ask.total.toFixed(2)}
                        </span>
                    </div>
                ))}
            </div>

            {/* Spread bar */}
            <div
                style={{
                    padding: "6px 10px",
                    borderTop: "1px solid #1e2d45",
                    borderBottom: "1px solid #1e2d45",
                    background: "#131a28",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                }}
            >
                <span
                    style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#e8f0ee",
                    }}
                >
                    {midPrice.toFixed(midPrice < 1 ? 6 : 4)}
                </span>
                <span
                    style={{
                        fontSize: 10,
                        color: "#556b65",
                        fontFamily: "var(--font-mono)",
                    }}
                >
                    Spread {pair.spread.toFixed(pair.spread < 0.001 ? 8 : 6)}
                </span>
            </div>

            {/* Bids */}
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {bids.map((bid, i) => (
                    <div
                        key={`bid-${i}`}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: 8,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontFamily: "var(--font-mono)",
                            position: "relative",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: `${(bid.total / maxBidTotal) * 100}%`,
                                background: "rgba(63, 185, 80, 0.08)",
                                zIndex: 0,
                            }}
                        />
                        <span style={{ color: "#3fb950", zIndex: 1 }}>
                            {bid.price.toFixed(bid.price < 1 ? 6 : 4)}
                        </span>
                        <span
                            style={{
                                color: "#8a9a95",
                                textAlign: "right",
                                zIndex: 1,
                            }}
                        >
                            {bid.size.toFixed(2)}
                        </span>
                        <span
                            style={{
                                color: "#556b65",
                                textAlign: "right",
                                zIndex: 1,
                            }}
                        >
                            {bid.total.toFixed(2)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
