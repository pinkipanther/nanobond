"use client";

import { useState } from "react";
import type { ProBondPair } from "../lib/data";

interface TradeFormProps {
    pair: ProBondPair | null;
}

export default function TradeForm({ pair }: TradeFormProps) {
    const [side, setSide] = useState<"buy" | "sell">("buy");
    const [orderType, setOrderType] = useState<"limit" | "market">("limit");
    const [price, setPrice] = useState("");
    const [amount, setAmount] = useState("");
    const [showDemoMessage, setShowDemoMessage] = useState(false);

    const estimatedTotal =
        price && amount
            ? parseFloat(price) * parseFloat(amount)
            : 0;

    const handlePlaceOrder = () => {
        setShowDemoMessage(true);
        setTimeout(() => setShowDemoMessage(false), 3000);
    };

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
                Select a market to trade
            </div>
        );
    }

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
            {/* Side selector */}
            <div
                style={{
                    display: "flex",
                    borderBottom: "1px solid #1e2d45",
                }}
            >
                {(["buy", "sell"] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setSide(s)}
                        style={{
                            flex: 1,
                            padding: "10px",
                            border: "none",
                            background:
                                side === s
                                    ? s === "buy"
                                        ? "#3fb950"
                                        : "#f85149"
                                    : "transparent",
                            color:
                                side === s
                                    ? "#080c14"
                                    : s === "buy"
                                        ? "#3fb950"
                                        : "#f85149",
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            fontSize: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                        }}
                    >
                        {s} {pair.symbol.split("/")[0]}
                    </button>
                ))}
            </div>

            {/* Order type */}
            <div
                style={{
                    display: "flex",
                    padding: "8px 12px",
                    gap: 6,
                }}
            >
                {(["limit", "market"] as const).map((type) => (
                    <button
                        key={type}
                        onClick={() => setOrderType(type)}
                        style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            border: "none",
                            background:
                                orderType === type
                                    ? "#192133"
                                    : "transparent",
                            color:
                                orderType === type
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
                        {type}
                    </button>
                ))}
            </div>

            <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Price input */}
                {orderType === "limit" && (
                    <div>
                        <label
                            style={{
                                display: "block",
                                fontSize: 10,
                                color: "#556b65",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                fontWeight: 800,
                                marginBottom: 4,
                            }}
                        >
                            Price
                        </label>
                        <div style={{ position: "relative" }}>
                            <input
                                type="number"
                                step="any"
                                placeholder="0.00"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                style={{
                                    width: "100%",
                                    background: "#131a28",
                                    border: "1px solid #1e2d45",
                                    borderRadius: 8,
                                    padding: "10px 12px",
                                    paddingRight: 60,
                                    fontFamily: "var(--font-mono)",
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: "#e8f0ee",
                                    outline: "none",
                                }}
                            />
                            <span
                                style={{
                                    position: "absolute",
                                    right: 12,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    fontSize: 11,
                                    color: "#556b65",
                                    fontFamily: "var(--font-mono)",
                                }}
                            >
                                HBAR
                            </span>
                        </div>
                    </div>
                )}

                {/* Amount input */}
                <div>
                    <label
                        style={{
                            display: "block",
                            fontSize: 10,
                            color: "#556b65",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            fontWeight: 800,
                            marginBottom: 4,
                        }}
                    >
                        Amount
                    </label>
                    <div style={{ position: "relative" }}>
                        <input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            style={{
                                width: "100%",
                                background: "#131a28",
                                border: "1px solid #1e2d45",
                                borderRadius: 8,
                                padding: "10px 12px",
                                paddingRight: 80,
                                fontFamily: "var(--font-mono)",
                                fontSize: 14,
                                fontWeight: 700,
                                color: "#e8f0ee",
                                outline: "none",
                            }}
                        />
                        <span
                            style={{
                                position: "absolute",
                                right: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                                fontSize: 11,
                                color: "#556b65",
                                fontFamily: "var(--font-mono)",
                            }}
                        >
                            {pair.symbol.split("/")[0]}
                        </span>
                    </div>
                </div>

                {/* Available */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                        color: "#556b65",
                    }}
                >
                    <span>Available</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>
                        {side === "buy" ? "12,450.00 HBAR" : `2,300.00 ${pair.symbol.split("/")[0]}`}
                    </span>
                </div>

                {/* Total */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderTop: "1px solid #1e2d45",
                        borderBottom: "1px solid #1e2d45",
                    }}
                >
                    <span
                        style={{
                            fontSize: 11,
                            color: "#556b65",
                            textTransform: "uppercase",
                            fontWeight: 800,
                            letterSpacing: "0.06em",
                        }}
                    >
                        Total
                    </span>
                    <span
                        style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#e8f0ee",
                        }}
                    >
                        {estimatedTotal.toFixed(estimatedTotal < 1 ? 6 : 2)} HBAR
                    </span>
                </div>

                {/* Place order button */}
                <button
                    onClick={handlePlaceOrder}
                    style={{
                        width: "100%",
                        padding: "14px",
                        borderRadius: 8,
                        border: "none",
                        background:
                            side === "buy"
                                ? "linear-gradient(135deg, #3fb950, #2ea043)"
                                : "linear-gradient(135deg, #f85149, #da3633)",
                        color: "#080c14",
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 14,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow:
                            side === "buy"
                                ? "0 10px 20px -10px rgba(63, 185, 80, 0.4)"
                                : "0 10px 20px -10px rgba(248, 81, 73, 0.4)",
                    }}
                >
                    Place {side === "buy" ? "Buy" : "Sell"} Order
                </button>

                {showDemoMessage && (
                    <div
                        style={{
                            padding: "10px",
                            borderRadius: 8,
                            background: "rgba(22,150,184,0.12)",
                            border: "1px solid rgba(22,150,184,0.35)",
                            color: "#58a6ff",
                            fontSize: 12,
                            textAlign: "center",
                            fontWeight: 600,
                        }}
                    >
                        Demo mode — secondary market contract not yet deployed
                    </div>
                )}
            </div>
        </div>
    );
}
