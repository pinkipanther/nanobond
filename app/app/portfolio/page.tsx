"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useBonds } from "../lib/hooks";
import type { BondCardData } from "../lib/hooks";

export default function PortfolioPage() {
    const { bonds, isLoading } = useBonds();
    const { address, isConnected } = useAccount();

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
            <PortfolioContent bonds={bonds} address={address} isConnected={isConnected} />
        </div>
    );
}

function PortfolioContent({ bonds, address, isConnected }: { bonds: BondCardData[], address?: string, isConnected: boolean }) {
    const activeBonds = bonds.filter((b) => b.state === 1).length;
    const raisingBonds = bonds.filter((b) => b.state === 0).length;

    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    const handleLinkEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !isConnected || !address) return;
        setStatus("loading");
        try {
            await addDoc(collection(db, "subscribers"), {
                email,
                walletAddress: address,
                timestamp: serverTimestamp(),
                source: "portfolio_manual_link"
            });
            setStatus("success");
            setEmail("");
        } catch (error) {
            console.error("Firebase error: ", error);
            setStatus("error");
        }
    };

    return (
        <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, marginBottom: 8, color: "var(--text-primary)" }}>
                Portfolio
            </h2>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>
                Track your active bonds, staking positions, and yield.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: 32 }}>
                
                {/* Metrics Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
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

                {/* Account Settings / Email Link */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Link Account
                    </h3>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
                        Connect your email to your wallet to receive yield notifications, early access to bonds, and protocol updates.
                    </p>

                    {!isConnected ? (
                        <div style={{ padding: "12px", background: "var(--void-elevated)", border: "1px solid var(--void-border)", borderRadius: "var(--radius-md)", fontSize: "13px", color: "var(--text-dim)", textAlign: "center" }}>
                            Connect your wallet first to link an email.
                        </div>
                    ) : status === "success" ? (
                        <div style={{ padding: "16px", background: "var(--acid-dim)", color: "var(--acid)", borderRadius: "var(--radius-md)", fontSize: "14px", fontWeight: 600, border: "1px solid var(--acid)" }}>
                            Email successfully linked to {address?.slice(0, 6)}...{address?.slice(-4)}!
                        </div>
                    ) : (
                        <form onSubmit={handleLinkEmail} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <input
                                type="email"
                                placeholder="Enter your email (e.g. Gmail)"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={status === "loading"}
                                style={{ width: "100%", padding: "12px 14px", background: "var(--void-light)", border: "1px solid var(--void-border)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontSize: "14px", fontFamily: "var(--font-mono)" }}
                            />
                            <button 
                                type="submit" 
                                className="btn-primary"
                                disabled={status === "loading"}
                                style={{ width: "100%", padding: "12px", fontSize: "14px", background: "var(--cyan)", color: "var(--void)" }}
                            >
                                {status === "loading" ? "Linking..." : "Connect Email"}
                            </button>
                            {status === "error" && (
                                <div style={{ fontSize: "12px", color: "var(--magenta)", marginTop: "4px" }}>
                                    Failed to link email. Please try again.
                                </div>
                            )}
                        </form>
                    )}
                </div>
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
