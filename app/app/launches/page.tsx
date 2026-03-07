"use client";

import { useState } from "react";
import Link from "next/link";
import LaunchCard from "../components/LaunchCard";
import type { LaunchCardData } from "../components/LaunchCard";
import { useLaunches } from "../lib/hooks";

export default function LaunchesPage() {
    const [filter, setFilter] = useState<"all" | "live" | "ended">("all");
    const { launches, isLoading, count } = useLaunches();

    const launchCards: LaunchCardData[] = launches.map((l) => ({
        id: l.id,
        name: l.name,
        symbol: l.symbol,
        totalRaised: l.totalRaised,
        hardCap: l.hardCap,
        softCap: l.softCap,
        contributors: l.contributors,
        timeRemaining: l.timeRemaining,
        state: l.state,
        tokenPrice: l.tokenPrice,
    }));

    const filteredLaunches = launchCards.filter((l) => {
        if (filter === "live") return l.state === 0;
        if (filter === "ended") return l.state === 2 || l.state === 1;
        return true;
    });

    return (
        <div
            style={{
                maxWidth: 1400,
                margin: "0 auto",
                padding: "96px 24px 80px",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 32,
                    flexWrap: "wrap",
                    gap: 16,
                }}
            >
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
                        All Launches
                    </h2>
                    <p
                        style={{
                            fontFamily: "var(--font-body)",
                            color: "var(--text-secondary)",
                            fontSize: 14,
                        }}
                    >
                        {isLoading
                            ? "Loading launches from chain..."
                            : count > 0
                                ? `${count} project${count !== 1 ? "s" : ""} launched on Hedera`
                                : "No launches yet — be the first to create one!"}
                    </p>
                </div>

                <div className="tab-group">
                    {[
                        { id: "all" as const, label: "All" },
                        { id: "live" as const, label: "Live" },
                        { id: "ended" as const, label: "Ended" },
                    ].map((f) => (
                        <button
                            key={f.id}
                            className={`tab-item ${filter === f.id ? "active" : ""}`}
                            onClick={() => setFilter(f.id)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading && (
                <div
                    className="glass-card"
                    style={{ padding: 60, textAlign: "center" }}
                >
                    <div style={{ fontSize: 48, marginBottom: 16, animation: "float 2s ease-in-out infinite" }}>⏳</div>
                    <p
                        style={{
                            fontFamily: "var(--font-body)",
                            color: "var(--text-secondary)",
                            fontWeight: 600,
                        }}
                    >
                        Loading launches from Hedera Testnet...
                    </p>
                </div>
            )}

            {!isLoading && (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: 16,
                    }}
                >
                    {filteredLaunches.map((card) => {
                        const live = launches.find((l) => l.id === card.id);
                        return (
                            <Link
                                key={card.id}
                                href={`/launches/${live?.launchContract || ""}`}
                                style={{ textDecoration: "none", color: "inherit" }}
                            >
                                <LaunchCard launch={card} />
                            </Link>
                        );
                    })}
                </div>
            )}

            {!isLoading && filteredLaunches.length === 0 && (
                <div
                    className="glass-card"
                    style={{ padding: 60, textAlign: "center" }}
                >
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                    <p
                        style={{
                            fontFamily: "var(--font-body)",
                            color: "var(--text-dim)",
                        }}
                    >
                        {count === 0
                            ? "No launches deployed yet. Create the first one!"
                            : "No launches found with the selected filter"}
                    </p>
                </div>
            )}
        </div>
    );
}
