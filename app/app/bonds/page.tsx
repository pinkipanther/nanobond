"use client";

import { useState } from "react";
import Link from "next/link";
import BondCard from "../components/BondCard";
import { useBonds } from "../lib/hooks";

export default function BondsPage() {
    const [filter, setFilter] = useState<"all" | "raising" | "active">("all");
    const { bonds, isLoading, count } = useBonds();

    const filteredBonds = bonds.filter((b) => {
        if (filter === "raising") return b.state === 0;
        if (filter === "active") return b.state === 1;
        return true;
    });

    return (
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
                <div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, marginBottom: 8, color: "var(--text-primary)" }}>
                        All Bonds
                    </h2>
                    <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontSize: 14 }}>
                        {isLoading
                            ? "Loading bonds from chain..."
                            : count > 0
                                ? `${count} bond${count !== 1 ? "s" : ""} on Hedera`
                                : "No bonds yet — be the first to create one!"}
                    </p>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {[
                        { id: "all" as const, label: "All", badge: "" },
                        { id: "raising" as const, label: "Raising", badge: "var(--acid)" },
                        { id: "active" as const, label: "Active", badge: "var(--cyan)" },
                    ].map((f) => {
                        const isActive = filter === f.id;
                        return (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id)}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "8px 16px",
                                    borderRadius: "999px",
                                    border: `1px solid ${isActive ? (f.badge || "var(--text-secondary)") : "var(--void-border)"}`,
                                    background: isActive ? (f.badge ? `${f.badge}15` : "var(--void-surface)") : "transparent",
                                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "12px",
                                    fontWeight: isActive ? 700 : 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    boxShadow: isActive && f.badge ? `0 0 12px ${f.badge}25` : "none",
                                }}
                            >
                                {f.badge && (
                                    <div
                                        style={{
                                            width: "6px",
                                            height: "6px",
                                            borderRadius: "50%",
                                            background: isActive ? f.badge : "var(--void-border)",
                                            boxShadow: isActive ? `0 0 8px ${f.badge}` : "none",
                                            transition: "all 0.2s ease"
                                        }}
                                    />
                                )}
                                {f.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {isLoading && (
                <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 16, animation: "float 2s ease-in-out infinite", color: "var(--text-dim)", fontFamily: "var(--font-display)" }}>. . .</div>
                    <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontWeight: 600 }}>
                        Loading bonds from Hedera Testnet...
                    </p>
                </div>
            )}

            {!isLoading && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                    {filteredBonds.map((bond) => (
                        <Link key={bond.id} href={`/bonds/${bond.bondContract}`} style={{ textDecoration: "none", color: "inherit" }}>
                            <BondCard bond={bond} />
                        </Link>
                    ))}
                </div>
            )}

            {!isLoading && filteredBonds.length === 0 && (
                <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 16, color: "var(--text-dim)", fontFamily: "var(--font-display)", fontWeight: 800 }}>0</div>
                    <p style={{ fontFamily: "var(--font-body)", color: "var(--text-dim)" }}>
                        {count === 0 ? "No bonds deployed yet. Create the first one!" : "No bonds found with the selected filter"}
                    </p>
                </div>
            )}
        </div>
    );
}
