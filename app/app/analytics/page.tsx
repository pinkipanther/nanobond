"use client";

import { useMemo } from "react";
import { useBonds } from "../lib/hooks";
import Link from "next/link";

export default function AnalyticsPage() {
    const { bonds, isLoading, count } = useBonds();

    const stats = useMemo(() => {
        let totalRaised = 0;
        let totalStaked = 0;
        let totalYield = 0;
        let totalContributors = 0;
        const creators = new Set<string>();

        bonds.forEach((b) => {
            totalRaised += b.totalRaised;
            totalStaked += b.totalStaked;
            totalYield += b.totalYieldMinted;
            totalContributors += b.contributors;
            if (b.creator) creators.add(b.creator);
        });

        return {
            totalRaised,
            totalStaked,
            totalYield,
            totalContributors,
            uniqueCreators: creators.size,
            activeBonds: bonds.filter((b) => b.state === 1).length,
            raisingBonds: bonds.filter((b) => b.state === 0).length,
        };
    }, [bonds]);

    const topByRaised = [...bonds].sort((a, b) => b.totalRaised - a.totalRaised).slice(0, 5);
    const topByStaked = [...bonds].sort((a, b) => b.totalStaked - a.totalStaked).slice(0, 5);
    const uniqueCreators = Array.from(new Set(bonds.map(b => b.creator).filter(Boolean)));

    if (isLoading) {
        return (
            <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}>
                <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 16, animation: "float 2s ease-in-out infinite" }}>📊</div>
                    <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontWeight: 600 }}>
                        Loading analytics data...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, marginBottom: 8, color: "var(--text-primary)" }}>
                Protocol Analytics
            </h2>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>
                Global statistics across all NanoBond deployments on Hedera.
            </p>

            {/* Top Level Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 32 }}>
                {[
                    { label: "Total Volume Raised", value: `${stats.totalRaised.toFixed(2)} ℏ`, color: "var(--cyan)", icon: "💰" },
                    { label: "Total Value Staked", value: `${stats.totalStaked.toFixed(2)}`, color: "var(--magenta)", icon: "🔒" },
                    { label: "Total Yield Minted", value: `${stats.totalYield.toFixed(2)}`, color: "var(--acid)", icon: "✨" },
                    { label: "Total Bonds", value: `${count}`, color: "var(--text-primary)", icon: "🚀" },
                    { label: "Unique Creators", value: `${stats.uniqueCreators}`, color: "var(--gold)", icon: "👤" },
                    { label: "Total Interactions", value: `${stats.totalContributors}`, color: "var(--cyan)", icon: "⚡" },
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

            {/* Top Bonds Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 32 }}>
                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Top by Volume Raised (ℏ)
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {topByRaised.map((b, i) => (
                            <Link key={b.id} href={`/bonds/${b.bondContract}`} style={{ textDecoration: "none" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "var(--void-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--void-border)", cursor: "pointer", transition: "all 0.2s ease" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800, color: "var(--text-dim)" }}>#{i + 1}</div>
                                        <div>
                                            <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>{b.name}</div>
                                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>${b.symbol}</div>
                                        </div>
                                    </div>
                                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--cyan)", fontWeight: 700 }}>
                                        {b.totalRaised.toFixed(2)} ℏ
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {topByRaised.length === 0 && <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No data available</div>}
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Top by Total Staked
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {topByStaked.map((b, i) => (
                            <Link key={b.id} href={`/bonds/${b.bondContract}`} style={{ textDecoration: "none" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "var(--void-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--void-border)", cursor: "pointer", transition: "all 0.2s ease" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800, color: "var(--text-dim)" }}>#{i + 1}</div>
                                        <div>
                                            <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>{b.name}</div>
                                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>${b.symbol}</div>
                                        </div>
                                    </div>
                                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--magenta)", fontWeight: 700 }}>
                                        {b.totalStaked.toFixed(2)}
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {topByStaked.length === 0 && <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No data available</div>}
                    </div>
                </div>
            </div>

            {/* Known Wallets / Creators */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 32 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Known Wallets (Bond Creators)
                </h3>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
                    This lists the addresses of wallets that have deployed a bond on the protocol. To track all {stats.totalContributors} interactions, use a blockchain explorer.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
                    {uniqueCreators.map((address) => (
                        <div key={address} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--void-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--void-border)" }}>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--cyan)", fontWeight: 600 }}>
                                {address.slice(0, 8)}...{address.slice(-6)}
                            </div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>
                                {bonds.filter(b => b.creator === address).length} Bond(s)
                            </div>
                        </div>
                    ))}
                    {uniqueCreators.length === 0 && (
                        <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No wallets found.</div>
                    )}
                </div>
            </div>

            {/* Full Table */}
            <div className="glass-card" style={{ padding: 24, overflowX: "auto" }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    All Individual Bonds
                </h3>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--void-border)", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase" }}>
                            <th style={{ padding: "12px 8px" }}>Bond</th>
                            <th style={{ padding: "12px 8px" }}>Status</th>
                            <th style={{ padding: "12px 8px" }}>Raised</th>
                            <th style={{ padding: "12px 8px" }}>Staked</th>
                            <th style={{ padding: "12px 8px" }}>Yield Minted</th>
                            <th style={{ padding: "12px 8px" }}>APY</th>
                            <th style={{ padding: "12px 8px" }}>Interactions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bonds.map((b) => {
                            const stateLabels = ["Raising", "Active", "Matured", "Failed", "Cancelled"];
                            const stateColors = ["var(--acid)", "var(--cyan)", "var(--magenta)", "var(--text-dim)", "var(--text-dim)"];
                            const apy = (b.yieldRateBps / 100).toFixed(1);

                            return (
                                <tr key={b.id} style={{ borderBottom: "1px solid var(--void-border)", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--void-surface)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                    <td style={{ padding: "12px 8px" }}>
                                        <Link href={`/bonds/${b.bondContract}`} style={{ textDecoration: "none" }}>
                                            <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>{b.name}</div>
                                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>${b.symbol}</div>
                                        </Link>
                                    </td>
                                    <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)", fontSize: 12, color: stateColors[b.state] || "var(--text-dim)", fontWeight: 700 }}>
                                        {stateLabels[b.state] || "Unknown"}
                                    </td>
                                    <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)" }}>
                                        {b.totalRaised.toFixed(2)} ℏ
                                    </td>
                                    <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)" }}>
                                        {b.totalStaked.toFixed(2)}
                                    </td>
                                    <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)" }}>
                                        {b.totalYieldMinted.toFixed(2)}
                                    </td>
                                    <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)" }}>
                                        {apy}%
                                    </td>
                                    <td style={{ padding: "12px 8px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)" }}>
                                        {b.contributors.toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })}
                        {bonds.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-body)" }}>
                                    No bonds deployed yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
