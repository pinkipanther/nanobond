"use client";

import Link from "next/link";
import { useBonds } from "../lib/hooks";
import type { BondCardData } from "../lib/hooks";

export default function PortfolioPage() {
    const { bonds, isLoading } = useBonds();

    if (isLoading) {
        return (
            <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}>
                <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 16, animation: "float 2s ease-in-out infinite" }}>⏳</div>
                    <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontWeight: 600 }}>
                        Loading portfolio data...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}>
            <PortfolioContent bonds={bonds} />
        </div>
    );
}

function PortfolioContent({ bonds }: { bonds: BondCardData[] }) {
    const activeBonds = bonds.filter((b) => b.state === 1).length;
    const raisingBonds = bonds.filter((b) => b.state === 0).length;

    return (
        <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, marginBottom: 8, color: "var(--text-primary)" }}>
                Portfolio
            </h2>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>
                Track your active bonds, staking positions, and yield.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginBottom: 32 }}>
                {[
                    { label: "Total Bonds", value: `${bonds.length}`, color: "var(--cyan)", icon: "🚀" },
                    { label: "Raising", value: `${raisingBonds}`, color: "var(--acid)", icon: "🟢" },
                    { label: "Active", value: `${activeBonds}`, color: "var(--magenta)", icon: "📈" },
                ].map((s) => (
                    <div key={s.label} className="glass-card" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: s.color }} />
                        <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: s.color, marginBottom: 4 }}>
                            {s.value}
                        </div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            {s.label}
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    All Deployed Bonds
                </h3>
                {bonds.length === 0 ? (
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-dim)" }}>
                        No bonds found. Create one to get started!
                    </p>
                ) : (
                    bonds.map((b, i) => {
                        const stateLabels = ["Raising", "Active", "Matured", "Failed", "Cancelled"];
                        const stateColors = ["var(--acid)", "var(--cyan)", "var(--gold)", "var(--magenta)", "var(--text-dim)"];
                        return (
                            <Link key={i} href={`/bonds/${b.bondContract}`} style={{ textDecoration: "none", color: "inherit" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: i < bonds.length - 1 ? "1px solid var(--void-border)" : "none", cursor: "pointer", transition: "opacity 0.2s" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: stateColors[b.state] || "var(--text-dim)" }} />
                                        <div>
                                            <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>
                                                {b.name} <span style={{ color: stateColors[b.state] || "var(--text-dim)" }}>${b.symbol}</span>
                                            </div>
                                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>
                                                {stateLabels[b.state] || "Unknown"} · {b.totalRaised.toFixed(2)} ℏ raised
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>
                                        {b.contributors} backers
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}
