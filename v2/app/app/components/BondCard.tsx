"use client";

import type { BondCardData } from "../lib/hooks";

const STATE_CONFIG: Record<number, { label: string; dot: string; bg: string; text: string; solid: string }> = {
    0: { label: "RAISING", dot: "var(--acid)", bg: "rgba(16, 185, 129, 0.1)", text: "var(--acid)", solid: "var(--acid)" },
    1: { label: "ACTIVE", dot: "var(--cyan)", bg: "rgba(99, 102, 241, 0.1)", text: "var(--cyan)", solid: "var(--cyan)" },
    2: { label: "MATURED", dot: "var(--magenta)", bg: "rgba(244, 63, 94, 0.1)", text: "var(--magenta)", solid: "var(--void-border)" },
    3: { label: "FAILED", dot: "var(--text-dim)", bg: "var(--void-elevated)", text: "var(--text-secondary)", solid: "var(--void-border)" },
    4: { label: "CANCELLED", dot: "var(--text-dim)", bg: "var(--void-elevated)", text: "var(--text-secondary)", solid: "var(--void-border)" },
};

export default function BondCard({ bond }: { bond: BondCardData }) {
    const stateInfo = STATE_CONFIG[bond.state] || STATE_CONFIG[0];
    const progress = bond.hardCap > 0 ? Math.min(100, (bond.totalRaised / bond.hardCap) * 100) : 0;
    const apr = (bond.yieldRateBps / 100).toFixed(1);

    const formatTime = (seconds: number) => {
        if (seconds <= 0) return "Ended";
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        if (d > 0) return `${d}d ${h}h`;
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    return (
        <div 
            style={{ 
                position: "relative",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                padding: "24px 28px",
                background: "var(--void-surface)",
                border: "1px solid var(--void-border)",
                borderRadius: "16px",
                transition: "all 0.2s ease",
                overflow: "hidden",
                cursor: "pointer"
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.borderColor = "var(--cyan)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--void-border)";
            }}
        >
            {/* Top solid line instead of gradient */}
            <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: stateInfo.solid,
            }} />

            {/* Header: Title and Status */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "22px",
                        fontWeight: 800,
                        letterSpacing: "-0.02em",
                        color: "var(--text-primary)",
                        margin: "0 0 4px 0",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                    }}>
                        {bond.name}
                    </h3>
                    <span style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--text-dim)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                    }}>
                        ${bond.symbol}
                    </span>
                </div>

                <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    background: stateInfo.bg,
                    color: stateInfo.text,
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    border: `1px solid ${stateInfo.text}33`
                }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: stateInfo.dot }} />
                    {stateInfo.label}
                </div>
            </div>

            {/* Metrics Row */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Fixed Yield
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)", display: "flex", alignItems: "baseline", gap: "4px" }}>
                        {apr}% <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>APR</span>
                    </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {bond.state === 0 ? "Time Left" : "Participants"}
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                        {bond.state === 0 && bond.timeRemaining > 0 ? formatTime(bond.timeRemaining) : bond.contributors.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Description */}
            <p style={{
                fontSize: "14px",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                margin: "0 0 24px 0",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                flexGrow: 1
            }}>
                {bond.description || "No description provided for this bond."}
            </p>

            {/* Progress bar or Active Stats */}
            {bond.state === 0 ? (
                <div style={{ marginTop: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px", fontFamily: "var(--font-display)" }}>
                        <span>{bond.totalRaised.toLocaleString()} ℏ <span style={{ color: "var(--text-dim)", fontSize: "12px", fontWeight: 600 }}>Raised</span></span>
                        <span style={{ color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>{progress.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: "6px", borderRadius: "3px", background: "var(--void-elevated)", overflow: "hidden" }}>
                        <div style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "3px",
                            background: "var(--cyan)",
                            transform: `scaleX(${Math.max(0, Math.min(100, progress)) / 100})`,
                            transformOrigin: "left center",
                            transition: "transform 0.8s ease",
                        }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-dim)", marginTop: "10px", fontFamily: "var(--font-mono)", textTransform: "uppercase", fontWeight: 600 }}>
                        <span>Soft {bond.softCap.toLocaleString()} ℏ</span>
                        <span>Hard {bond.hardCap.toLocaleString()} ℏ</span>
                    </div>
                </div>
            ) : bond.state === 1 ? (
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px dashed rgba(255,255,255,0.1)", marginTop: "auto" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", fontFamily: "var(--font-mono)", fontWeight: 600 }}>Token Supply</span>
                        <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{bond.totalSupply.toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", textAlign: "right" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", fontFamily: "var(--font-mono)", fontWeight: 600 }}>Yield Minted</span>
                        <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--acid)", fontFamily: "var(--font-display)" }}>{bond.totalYieldMinted.toLocaleString()}</span>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
