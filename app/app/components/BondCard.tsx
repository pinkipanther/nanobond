"use client";

import type { BondCardData } from "../lib/hooks";

const STATE_CONFIG: Record<number, { label: string; dot: string; bg: string; text: string }> = {
    0: { label: "RAISING", dot: "var(--acid)", bg: "var(--acid-dim)", text: "var(--acid)" },
    1: { label: "ACTIVE", dot: "var(--cyan)", bg: "var(--cyan-dim)", text: "var(--cyan)" },
    2: { label: "MATURED", dot: "var(--magenta)", bg: "var(--magenta-dim)", text: "var(--magenta)" },
    3: { label: "FAILED", dot: "var(--text-dim)", bg: "var(--void-elevated)", text: "var(--text-secondary)" },
    4: { label: "CANCELLED", dot: "var(--text-dim)", bg: "var(--void-elevated)", text: "var(--text-secondary)" },
};

export default function BondCard({ bond }: { bond: BondCardData }) {
    const stateInfo = STATE_CONFIG[bond.state] || STATE_CONFIG[0];
    const progress = bond.hardCap > 0 ? Math.min(100, (bond.totalRaised / bond.hardCap) * 100) : 0;
    const apy = (bond.yieldRateBps / 100).toFixed(1);

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
            className="glass-card bond-card-premium" 
            style={{ 
                position: "relative",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                height: "100%",
                padding: "24px",
                gap: "18px",
                cursor: "pointer"
            }}
        >
            {/* Top decorative gradient line */}
            <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: bond.state === 0 ? "linear-gradient(90deg, #1696b8, #0fa483)" : bond.state === 1 ? "linear-gradient(90deg, #0fa483, #1696b8)" : "var(--void-border)",
            }} />

            {/* Header: Title and Status */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <h3 style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "20px",
                            fontWeight: 800,
                            letterSpacing: "-0.02em",
                            color: "var(--text-primary)",
                            margin: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                        }}>
                            {bond.name}
                        </h3>
                    </div>
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
                }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: stateInfo.dot, boxShadow: `0 0 8px ${stateInfo.dot}` }} />
                    {stateInfo.label}
                </div>
            </div>

            {/* Description */}
            <p style={{
                fontSize: "14px",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                margin: 0,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                flexGrow: 1
            }}>
                {bond.description || "No description provided for this bond."}
            </p>

            {/* Metrics Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                padding: "16px",
                background: "var(--void-surface)",
                borderRadius: "12px",
                border: "1px solid var(--void-border)"
            }}>
                <div>
                    <div style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                        Fixed Yield
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)", display: "flex", alignItems: "baseline", gap: "4px" }}>
                        {apy}% <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>APY</span>
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                        {bond.state === 0 ? "Time Left" : "Participants"}
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                        {bond.state === 0 && bond.timeRemaining > 0 ? formatTime(bond.timeRemaining) : bond.contributors.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Progress bar or Active Stats */}
            {bond.state === 0 ? (
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "8px", fontFamily: "var(--font-body)" }}>
                        <span>{bond.totalRaised.toLocaleString()} ℏ Raised</span>
                        <span style={{ color: "var(--cyan)" }}>{progress.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: "6px", borderRadius: "3px", background: "var(--void-elevated)", overflow: "hidden" }}>
                        <div style={{
                            width: `${progress}%`,
                            height: "100%",
                            borderRadius: "3px",
                            background: "linear-gradient(90deg, #1696b8, #0fa483)",
                            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                        }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-dim)", marginTop: "10px", fontFamily: "var(--font-mono)", textTransform: "uppercase", fontWeight: 600 }}>
                        <span>Soft {bond.softCap.toLocaleString()} ℏ</span>
                        <span>Hard {bond.hardCap.toLocaleString()} ℏ</span>
                    </div>
                </div>
            ) : bond.state === 1 ? (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 6px 0", borderTop: "1px dashed var(--void-border)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", fontFamily: "var(--font-mono)", fontWeight: 600 }}>TVL Staked</span>
                        <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{bond.totalStaked.toLocaleString()}</span>
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
