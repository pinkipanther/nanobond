"use client";

import Link from "next/link";
import { useLaunches } from "../lib/hooks";
import type { LiveLaunchData } from "../lib/hooks";

export default function PortfolioPage() {
    const { launches, isLoading } = useLaunches();

    if (isLoading) {
        return (
            <div
                style={{
                    maxWidth: 1400,
                    margin: "0 auto",
                    padding: "96px 24px 80px",
                }}
            >
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
        <div
            style={{
                maxWidth: 1400,
                margin: "0 auto",
                padding: "96px 24px 80px",
            }}
        >
            <PortfolioContent launches={launches} />
        </div>
    );
}

function PortfolioContent({ launches }: { launches: LiveLaunchData[] }) {
    const activeLaunches = launches.filter((l) => l.state === 0).length;
    const finalizedLaunches = launches.filter((l) => l.state === 2).length;

    return (
        <div>
            <h2
                style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    fontWeight: 800,
                    marginBottom: 8,
                    color: "var(--text-primary)",
                }}
            >
                Portfolio
            </h2>
            <p
                style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--text-secondary)",
                    fontSize: 14,
                    marginBottom: 32,
                }}
            >
                Track your contributions and claimed assets.
            </p>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 20,
                    marginBottom: 32,
                }}
            >
                {[
                    { label: "Total Launches", value: `${launches.length}`, color: "var(--cyan)", icon: "🚀" },
                    { label: "Active Launches", value: `${activeLaunches}`, color: "var(--acid)", icon: "🟢" },
                    { label: "Finalized", value: `${finalizedLaunches}`, color: "var(--magenta)", icon: "✅" },
                ].map((s) => (
                    <div
                        key={s.label}
                        className="glass-card"
                        style={{ padding: 24, position: "relative", overflow: "hidden" }}
                    >
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: s.color }} />
                        <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                        <div
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 22,
                                fontWeight: 700,
                                color: s.color,
                                marginBottom: 4,
                            }}
                        >
                            {s.value}
                        </div>
                        <div
                            style={{
                                fontFamily: "var(--font-body)",
                                fontSize: 12,
                                color: "var(--text-dim)",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                            }}
                        >
                            {s.label}
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass-card" style={{ padding: 24 }}>
                <h3
                    style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        marginBottom: 20,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                    }}
                >
                    All Deployed Launches
                </h3>
                {launches.length === 0 ? (
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-dim)" }}>
                        No launches found. Create one to get started!
                    </p>
                ) : (
                    launches.map((l, i) => {
                        const stateLabels = ["Active", "Succeeded", "Finalized", "Failed", "Cancelled"];
                        const stateColors = ["var(--acid)", "var(--gold)", "var(--cyan)", "var(--magenta)", "var(--text-dim)"];
                        return (
                            <Link
                                key={i}
                                href={`/launches/${l.launchContract}`}
                                style={{ textDecoration: "none", color: "inherit" }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "14px 0",
                                        borderBottom: i < launches.length - 1 ? "1px solid var(--void-border)" : "none",
                                        cursor: "pointer",
                                        transition: "opacity 0.2s",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: "50%",
                                                background: stateColors[l.state] || "var(--text-dim)",
                                            }}
                                        />
                                        <div>
                                            <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>
                                                {l.name}{" "}
                                                <span style={{ color: stateColors[l.state] || "var(--text-dim)" }}>
                                                    ${l.symbol}
                                                </span>
                                            </div>
                                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>
                                                {stateLabels[l.state] || "Unknown"} · {l.totalRaised.toFixed(2)} ℏ raised
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: "var(--font-mono)",
                                            fontSize: 14,
                                            color: "var(--text-primary)",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {l.contributors} backers
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
