"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import TokenDetail from "../../components/TokenDetail";
import { useLaunches } from "../../lib/hooks";

export default function LaunchDetailPage({ params }: { params: Promise<{ address: string }> }) {
    const { address } = use(params);
    const router = useRouter();
    const { launches, isLoading } = useLaunches();

    // Find the launch matching this address
    const launch = launches.find(
        (l) => l.launchContract.toLowerCase() === address.toLowerCase()
    );

    if (isLoading) {
        return (
            <div
                style={{
                    maxWidth: 1400,
                    margin: "0 auto",
                    padding: "96px 24px 80px",
                }}
            >
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
                        Loading launch data from Hedera...
                    </p>
                </div>
            </div>
        );
    }

    if (!launch) {
        return (
            <div
                style={{
                    maxWidth: 1400,
                    margin: "0 auto",
                    padding: "96px 24px 80px",
                }}
            >
                <div
                    className="glass-card"
                    style={{ padding: 60, textAlign: "center" }}
                >
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                    <h2
                        style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 24,
                            fontWeight: 800,
                            color: "var(--text-primary)",
                            marginBottom: 12,
                        }}
                    >
                        Launch Not Found
                    </h2>
                    <p
                        style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 13,
                            color: "var(--text-dim)",
                            marginBottom: 24,
                            wordBreak: "break-all",
                        }}
                    >
                        {address}
                    </p>
                    <button
                        className="btn-primary"
                        onClick={() => router.push("/launches")}
                        style={{ padding: "12px 32px" }}
                    >
                        ← Back to Launches
                    </button>
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
            <TokenDetail
                launch={launch}
                onBack={() => router.push("/launches")}
            />
        </div>
    );
}
