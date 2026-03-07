"use client";

export interface LaunchCardData {
    id: number;
    name: string;
    symbol: string;
    totalRaised: number;
    hardCap: number;
    softCap: number;
    contributors: number;
    timeRemaining: number;
    state: number; // 0=ACTIVE, 1=SUCCEEDED, 2=FINALIZED, 3=FAILED
    tokenPrice: number;
}

const STATE = {
    0: { label: "Live", color: "var(--acid)", bg: "rgba(106,168,106,0.08)", dot: true },
    1: { label: "Succeeded", color: "var(--gold)", bg: "rgba(255,215,0,0.08)", dot: false },
    2: { label: "Finalized", color: "var(--cyan)", bg: "rgba(74,178,196,0.08)", dot: false },
    3: { label: "Failed", color: "var(--magenta)", bg: "rgba(193,85,126,0.08)", dot: false },
    4: { label: "Cancelled", color: "var(--text-dim)", bg: "rgba(255,255,255,0.05)", dot: false },
} as const;

function formatTime(seconds: number): string {
    if (seconds <= 0) return "Ended";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function formatNum(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toLocaleString();
}

export default function LaunchCard({
    launch,
    onClick,
}: {
    launch: LaunchCardData;
    onClick?: () => void;
}) {
    const progress = launch.hardCap > 0
        ? Math.min((launch.totalRaised / launch.hardCap) * 100, 100)
        : 0;

    const stateInfo = STATE[launch.state as keyof typeof STATE] || STATE[0];
    const isLive = launch.state === 0;

    return (
        <div
            onClick={onClick}
            style={{
                background: "var(--void-light)",
                border: "1px solid var(--void-border)",
                borderRadius: "var(--radius-lg)",
                padding: 20,
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--cyan-dim)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(74,178,196,0.1)";
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--void-border)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
        >
            {/* Live accent line */}
            {isLive && (
                <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 3,
                    background: "var(--acid)",
                    boxShadow: "0 0 8px var(--acid)",
                }} />
            )}

            {/* Header: avatar + name + status */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Avatar */}
                    <div style={{
                        width: 44, height: 44, borderRadius: "var(--radius-md)",
                        background: "var(--cyan)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18,
                        color: "var(--void)",
                    }}>
                        {launch.symbol.charAt(0)}
                    </div>
                    <div>
                        <div style={{
                            fontFamily: "var(--font-display)", fontWeight: 800,
                            fontSize: 18, color: "var(--text-primary)", lineHeight: 1.2,
                        }}>{launch.name}</div>
                        <div style={{
                            fontFamily: "var(--font-mono)", fontSize: 13,
                            color: "var(--text-secondary)", marginTop: 2,
                        }}>${launch.symbol}</div>
                    </div>
                </div>

                {/* Status badge */}
                <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: stateInfo.bg,
                    border: `1px solid ${stateInfo.color}40`,
                    borderRadius: "var(--radius-xl)", padding: "4px 12px",
                }}>
                    {stateInfo.dot && (
                        <div style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: stateInfo.color,
                            boxShadow: `0 0 6px ${stateInfo.color}`,
                        }} />
                    )}
                    <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 11,
                        color: stateInfo.color, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.08em",
                    }}>{stateInfo.label}</span>
                </div>
            </div>

            {/* Progress */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 16,
                        color: "var(--text-primary)", fontWeight: 700,
                    }}>{formatNum(launch.totalRaised)} ℏ</span>
                    <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 13,
                        color: "var(--text-secondary)", fontWeight: 600,
                    }}>{formatNum(launch.hardCap)} ℏ cap</span>
                </div>
                <div style={{
                    width: "100%", height: 8, background: "rgba(255,255,255,0.06)",
                    borderRadius: 4, overflow: "hidden",
                }}>
                    <div style={{
                        width: `${progress}%`, height: "100%",
                        background: isLive ? "var(--cyan)" : "var(--text-dim)",
                        borderRadius: 4,
                        transition: "width 0.5s ease",
                    }} />
                </div>
                <div style={{
                    display: "flex", justifyContent: "space-between", marginTop: 6,
                }}>
                    <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 12,
                        color: isLive ? "var(--cyan)" : "var(--text-secondary)", fontWeight: 700,
                    }}>{progress.toFixed(0)}%</span>
                    <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)",
                    }}>soft {formatNum(launch.softCap)} ℏ</span>
                </div>
            </div>

            {/* Footer stats */}
            <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                paddingTop: 16, borderTop: "1px solid var(--void-border)",
                gap: 8,
            }}>
                <Stat label="Backers" value={launch.contributors.toString()} />
                <Stat label="Time Left" value={formatTime(launch.timeRemaining)} />
                <Stat label="Price" value={`${launch.tokenPrice.toFixed(4)} ℏ`} accent />
            </div>
        </div>
    );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div style={{
            background: "rgba(255,255,255,0.02)",
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid rgba(255,255,255,0.04)"
        }}>
            <div style={{
                fontFamily: "var(--font-mono)", fontSize: 14,
                color: accent ? "var(--gold)" : "var(--text-primary)", fontWeight: 700,
            }}>{value}</div>
            <div style={{
                fontFamily: "var(--font-body)", fontSize: 10,
                color: "var(--text-secondary)", textTransform: "uppercase",
                letterSpacing: "0.05em", marginTop: 4, fontWeight: 600,
            }}>{label}</div>
        </div>
    );
}
