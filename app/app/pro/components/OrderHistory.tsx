"use client";

import { useState } from "react";

interface OrderHistoryProps {}

const mockOpenOrders = [
    {
        id: "ord-001",
        pair: "BOND1/HBAR",
        side: "buy" as const,
        type: "limit" as const,
        price: 0.0045,
        amount: 5000,
        filled: 0,
        status: "open" as const,
        time: "14:32:05",
    },
    {
        id: "ord-002",
        pair: "BOND3/HBAR",
        side: "sell" as const,
        type: "limit" as const,
        price: 0.012,
        amount: 2500,
        filled: 1200,
        status: "open" as const,
        time: "14:28:17",
    },
];

const mockHistory = [
    {
        id: "ord-003",
        pair: "BOND2/HBAR",
        side: "buy" as const,
        type: "market" as const,
        price: 0.0082,
        amount: 10000,
        filled: 10000,
        status: "filled" as const,
        time: "14:15:33",
    },
    {
        id: "ord-004",
        pair: "BOND1/HBAR",
        side: "sell" as const,
        type: "limit" as const,
        price: 0.0051,
        amount: 3000,
        filled: 3000,
        status: "filled" as const,
        time: "13:58:12",
    },
    {
        id: "ord-005",
        pair: "BOND4/HBAR",
        side: "buy" as const,
        type: "limit" as const,
        price: 0.0021,
        amount: 8000,
        filled: 0,
        status: "cancelled" as const,
        time: "13:42:50",
    },
];

export default function OrderHistory({}: OrderHistoryProps) {
    const [activeTab, setActiveTab] = useState<"open" | "history">("open");

    const data = activeTab === "open" ? mockOpenOrders : mockHistory;

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: "#111916",
                borderRadius: 8,
                border: "1px solid #22332f",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderBottom: "1px solid #22332f",
                }}
            >
                <span
                    style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "#556b65",
                    }}
                >
                    Orders
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                    {(["open", "history"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "none",
                                background:
                                    activeTab === tab
                                        ? "#1a2825"
                                        : "transparent",
                                color:
                                    activeTab === tab
                                        ? "#e8f0ee"
                                        : "#556b65",
                                fontFamily: "var(--font-body)",
                                fontWeight: 600,
                                fontSize: 11,
                                cursor: "pointer",
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                            }}
                        >
                            {tab === "open" ? "Open Orders" : "History"}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ flex: 1, overflow: "auto" }}>
                {/* Header row */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "80px 60px 60px 1fr 1fr 1fr 80px 80px",
                        gap: 8,
                        padding: "6px 12px",
                        fontSize: 10,
                        color: "#556b65",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: 800,
                        borderBottom: "1px solid rgba(34,51,47,0.5)",
                        fontFamily: "var(--font-body)",
                    }}
                >
                    <span>Pair</span>
                    <span>Side</span>
                    <span>Type</span>
                    <span style={{ textAlign: "right" }}>Price</span>
                    <span style={{ textAlign: "right" }}>Amount</span>
                    <span style={{ textAlign: "right" }}>Filled</span>
                    <span style={{ textAlign: "right" }}>Status</span>
                    <span style={{ textAlign: "right" }}>Time</span>
                </div>

                {data.map((order) => (
                    <div
                        key={order.id}
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "80px 60px 60px 1fr 1fr 1fr 80px 80px",
                            gap: 8,
                            padding: "6px 12px",
                            fontSize: 11,
                            fontFamily: "var(--font-mono)",
                            borderBottom: "1px solid rgba(34,51,47,0.3)",
                            alignItems: "center",
                        }}
                    >
                        <span style={{ color: "#e8f0ee", fontWeight: 700 }}>
                            {order.pair}
                        </span>
                        <span
                            style={{
                                color:
                                    order.side === "buy"
                                        ? "#3fb950"
                                        : "#f85149",
                                fontWeight: 700,
                                textTransform: "uppercase",
                            }}
                        >
                            {order.side}
                        </span>
                        <span style={{ color: "#8a9a95", textTransform: "uppercase" }}>
                            {order.type}
                        </span>
                        <span style={{ textAlign: "right", color: "#e8f0ee" }}>
                            {order.price.toFixed(order.price < 1 ? 6 : 4)}
                        </span>
                        <span style={{ textAlign: "right", color: "#8a9a95" }}>
                            {order.amount.toLocaleString()}
                        </span>
                        <span style={{ textAlign: "right", color: "#8a9a95" }}>
                            {order.filled.toLocaleString()}
                        </span>
                        <span
                            style={{
                                textAlign: "right",
                                color:
                                    order.status === "filled"
                                        ? "#3fb950"
                                        : order.status === "cancelled"
                                            ? "#f85149"
                                            : "#58a6ff",
                                fontWeight: 700,
                                textTransform: "uppercase",
                            }}
                        >
                            {order.status}
                        </span>
                        <span style={{ textAlign: "right", color: "#556b65" }}>
                            {order.time}
                        </span>
                    </div>
                ))}

                {data.length === 0 && (
                    <div
                        style={{
                            padding: 20,
                            textAlign: "center",
                            color: "#556b65",
                            fontSize: 12,
                        }}
                    >
                        No {activeTab === "open" ? "open orders" : "trade history"}
                    </div>
                )}
            </div>
        </div>
    );
}
