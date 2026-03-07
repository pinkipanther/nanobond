"use client";

import { useState, useEffect } from "react";
import TokenChart from "./TokenChart";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from "wagmi";
import { ConnectWalletInline } from "./ConnectWallet";
import { parseEther, formatEther } from "viem";
import { LAUNCH_ABI } from "../lib/contracts";
import type { LiveLaunchData } from "../lib/hooks";

const STATE_INFO: Record<number, { label: string; color: string; bg: string }> = {
    0: { label: "Live", color: "var(--acid)", bg: "rgba(106,168,106,0.08)" },
    1: { label: "Succeeded", color: "var(--gold)", bg: "var(--gold-dim)" },
    2: { label: "Finalized", color: "var(--cyan)", bg: "rgba(74,178,196,0.08)" },
    3: { label: "Failed", color: "var(--magenta)", bg: "rgba(193,85,126,0.08)" },
    4: { label: "Cancelled", color: "var(--text-dim)", bg: "var(--glass-overlay)" },
};

function formatNum(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
}

export default function TokenDetail({
    launch,
    onBack,
}: {
    launch: LiveLaunchData;
    onBack: () => void;
}) {
    const { isConnected, address: userAddress } = useAccount();
    const [amount, setAmount] = useState("");
    const [txStatus, setTxStatus] = useState<string | null>(null);

    const addr = launch.launchContract as `0x${string}`;

    // ── Read live data from chain (including user-specific if connected) ──
    const launchAbi = LAUNCH_ABI as any;
    const CHAIN_ID = 296; // hederaTestnet.id
    const baseCalls = [
        { address: addr, abi: launchAbi, functionName: "totalRaised" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "state" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "getTimeRemaining" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "getTokenPrice" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "hardCap" as const, chainId: CHAIN_ID },
        { address: addr, abi: launchAbi, functionName: "contributorCount" as const, chainId: CHAIN_ID },
    ];
    // indices: 0=totalRaised, 1=state, 2=timeRemaining, 3=tokenPrice, 4=hardCap, 5=contributorCount
    // user-specific start at index 6
    const userCalls = userAddress
        ? [
            ...baseCalls,
            { address: addr, abi: launchAbi, functionName: "contributions" as const, args: [userAddress], chainId: CHAIN_ID },
            { address: addr, abi: launchAbi, functionName: "hasClaimed" as const, args: [userAddress], chainId: CHAIN_ID },
        ]
        : baseCalls;

    const { data: userData, refetch: refetchUser } = useReadContracts({
        contracts: userCalls as any,
        query: { enabled: true, refetchInterval: 8_000 },
    });

    // Extract live values — always read from chain when available
    const getVal = (idx: number): any => {
        if (!userData || !userData[idx]) return undefined;
        const d = userData[idx];
        return d && d.status === "success" ? d.result : undefined;
    };

    // Hedera tinybar scaling: msg.value arrives in tinybars (8 dec)
    // but hardCap/softCap use weibars (18 dec). Scale up by 10^10.
    const TINYBAR_SCALE = 10000000000n; // 10^10

    const liveRaised = userData ? parseFloat(formatEther(((getVal(0) as bigint) || 0n) * TINYBAR_SCALE)) : launch.totalRaised;
    const liveState = userData ? Number((getVal(1) as bigint) || 0n) : launch.state;
    const liveTimeRemaining = userData ? Number((getVal(2) as bigint) || 0n) : launch.timeRemaining;
    const liveTokenPrice = userData ? parseFloat(formatEther((getVal(3) as bigint) || 0n)) : launch.tokenPrice;
    const liveHardCap = userData ? parseFloat(formatEther((getVal(4) as bigint) || 0n)) : launch.hardCap;
    const liveContributors = userData ? Number((getVal(5) as bigint) || 0n) : launch.contributors;
    const userContribution = userAddress && userData ? parseFloat(formatEther(((getVal(6) as bigint) || 0n) * TINYBAR_SCALE)) : 0;
    const userClaimed = userAddress && userData ? ((getVal(7) as boolean) || false) : false;

    const progress = liveHardCap > 0
        ? Math.min((liveRaised / liveHardCap) * 100, 100)
        : 0;

    const stateInfo = STATE_INFO[liveState] || STATE_INFO[0];
    const isLive = liveState === 0;
    const isSucceeded = liveState === 1;
    const isFinalized = liveState === 2;
    const isFailed = liveState === 3;
    const isCancelled = liveState === 4;
    const isCreator = !!(isConnected && userAddress && launch.creator && userAddress.toLowerCase() === launch.creator.toLowerCase());
    const estimatedTokens = amount && parseFloat(amount) > 0 && liveTokenPrice > 0
        ? Math.floor(parseFloat(amount) / liveTokenPrice)
        : 0;

    // ── Write operations ──
    const { writeContract, data: txHash, isPending, error: txError, reset: resetTx } = useWriteContract();
    const { isLoading: txConfirming, isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

    useEffect(() => {
        if (txConfirmed) {
            setTxStatus("✅ Transaction confirmed!");
            setAmount("");
            refetchUser();
            setTimeout(() => { setTxStatus(null); resetTx(); }, 3000);
        }
        if (txError) {
            setTxStatus(`❌ ${txError.message?.slice(0, 100)}`);
            setTimeout(() => setTxStatus(null), 5000);
        }
    }, [txConfirmed, txError]);

    const handleContribute = () => {
        if (!amount || parseFloat(amount) <= 0) return;
        writeContract({
            address: addr,
            abi: LAUNCH_ABI,
            functionName: "contribute",
            value: parseEther(amount),
        });
        setTxStatus("⏳ Confirming contribution...");
    };

    const handleClaimTokens = () => {
        writeContract({
            address: addr,
            abi: LAUNCH_ABI,
            functionName: "claimTokens",
        });
        setTxStatus("⏳ Claiming tokens...");
    };

    const handleClaimRefund = () => {
        writeContract({
            address: addr,
            abi: LAUNCH_ABI,
            functionName: "claimRefund",
        });
        setTxStatus("⏳ Claiming refund...");
    };

    const handleFinalize = () => {
        writeContract({
            address: addr,
            abi: LAUNCH_ABI,
            functionName: "finalize",
        });
        setTxStatus("⏳ Finalizing launch...");
    };

    const handleWithdrawRaisedAmount = () => {
        writeContract({
            address: addr,
            abi: LAUNCH_ABI,
            functionName: "withdrawRaisedAmount",
        });
        setTxStatus("⏳ Withdrawing raised amount...");
    };

    const handleCheckState = () => {
        writeContract({
            address: addr,
            abi: LAUNCH_ABI,
            functionName: "checkState",
        });
        setTxStatus("⏳ Checking state...");
    };

    const isTxPending = isPending || txConfirming;

    // Compute allocation percentages
    const totalTokens = launch.totalSupply || 1;
    const allocation = [
        { label: "Sale", percent: Math.round((launch.tokensForSale / totalTokens) * 100), color: "var(--cyan)" },
        { label: "Liquidity", percent: Math.round((launch.tokensForLP / totalTokens) * 100), color: "var(--acid)" },
        { label: "Creator", percent: Math.max(0, 100 - Math.round((launch.tokensForSale / totalTokens) * 100) - Math.round((launch.tokensForLP / totalTokens) * 100)), color: "var(--gold)" },
    ];

    return (
        <div>
            {/* Back */}
            <button
                onClick={onBack}
                style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "none", border: "none", padding: 0,
                    color: "var(--text-secondary)", fontFamily: "var(--font-display)",
                    fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 24,
                    transition: "color 0.2s", textTransform: "uppercase", letterSpacing: "0.05em"
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
                ← Back to Launches
            </button>

            {/* Header */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 32, flexWrap: "wrap", gap: 16,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{
                        width: 60, height: 60, borderRadius: "var(--radius-md)",
                        background: "var(--cyan)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--font-display)", fontWeight: 800,
                        fontSize: 26, color: "var(--void)",
                    }}>{launch.symbol.charAt(0)}</div>
                    <div>
                        <h2 style={{
                            fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800,
                            color: "var(--text-primary)", lineHeight: 1.1, margin: 0,
                        }}>{launch.name}</h2>
                        <div style={{
                            fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700,
                            color: "var(--text-secondary)", marginTop: 4,
                        }}>${launch.symbol}</div>
                    </div>
                </div>

                <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: stateInfo.bg,
                    border: `1px solid ${stateInfo.color}40`,
                    borderRadius: "var(--radius-xl)", padding: "6px 16px",
                }}>
                    {isLive && (
                        <div style={{
                            width: 8, height: 8, borderRadius: "50%",
                            background: "var(--acid)", boxShadow: "0 0 10px var(--acid)",
                        }} />
                    )}
                    <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 12,
                        color: stateInfo.color, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.08em",
                    }}>{stateInfo.label}</span>
                </div>
            </div>

            {/* Tx Status Banner */}
            {txStatus && (
                <div style={{
                    padding: "12px 20px", marginBottom: 20, borderRadius: "var(--radius-md)",
                    background: txStatus.startsWith("✅") ? "rgba(106,168,106,0.1)" : txStatus.startsWith("❌") ? "rgba(193,85,126,0.1)" : "rgba(74,178,196,0.1)",
                    border: `1px solid ${txStatus.startsWith("✅") ? "var(--acid)" : txStatus.startsWith("❌") ? "var(--magenta)" : "var(--cyan)"}40`,
                    fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)", fontWeight: 600,
                }}>
                    {txStatus}
                </div>
            )}

            {/* Main 2-col grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
                {/* Left column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Chart */}
                    <div style={{
                        background: "var(--void-light)",
                        border: "1px solid var(--void-border)", borderRadius: "var(--radius-lg)",
                        padding: 24, minHeight: 320,
                    }}>
                        <TokenChart symbol={launch.symbol} />
                    </div>

                    {/* About */}
                    <div style={{
                        background: "var(--void-light)",
                        border: "1px solid var(--void-border)", borderRadius: "var(--radius-lg)", padding: 24,
                    }}>
                        <div style={{
                            fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700,
                            color: "var(--text-primary)", textTransform: "uppercase",
                            letterSpacing: "0.08em", marginBottom: 12,
                        }}>About</div>
                        <p style={{
                            fontFamily: "var(--font-body)", fontSize: 15,
                            color: "var(--text-secondary)", lineHeight: 1.7, margin: 0,
                            fontWeight: 500,
                        }}>
                            <strong style={{ color: "var(--text-primary)" }}>{launch.name}</strong> is a community-driven project launched on NanoBond.
                            Contributors receive tokens proportional to their HBAR contribution
                            after finalization. Liquidity is automatically added to SaucerSwap.
                        </p>
                        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <InfoChip label="Contract" value={`${launch.launchContract.slice(0, 8)}...${launch.launchContract.slice(-6)}`} />
                            <InfoChip label="Creator" value={`${launch.creator.slice(0, 8)}...${launch.creator.slice(-6)}`} />
                        </div>
                    </div>

                    {/* Token allocation */}
                    <div style={{
                        background: "var(--void-light)",
                        border: "1px solid var(--void-border)", borderRadius: "var(--radius-lg)", padding: 24,
                    }}>
                        <div style={{
                            fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700,
                            color: "var(--text-primary)", textTransform: "uppercase",
                            letterSpacing: "0.08em", marginBottom: 20,
                        }}>Token Allocation</div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {allocation.map(a => (
                                <div key={a.label} style={{
                                    display: "flex", alignItems: "center", gap: 12
                                }}>
                                    <div style={{
                                        width: 12, height: 12, borderRadius: 3,
                                        background: a.color, flexShrink: 0,
                                    }} />
                                    <span style={{
                                        fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600,
                                        color: "var(--text-primary)", width: 100, flexShrink: 0,
                                    }}>{a.label}</span>
                                    <div style={{
                                        flex: 2, height: 8,
                                        background: "var(--void-elevated)",
                                        borderRadius: 4, overflow: "hidden",
                                    }}>
                                        <div style={{
                                            width: `${a.percent}%`, height: "100%",
                                            background: a.color, borderRadius: 4,
                                        }} />
                                    </div>
                                    <span style={{
                                        fontFamily: "var(--font-mono)", fontSize: 14,
                                        color: a.color, fontWeight: 800,
                                        width: 48, textAlign: "right",
                                    }}>{a.percent}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Fundraise progress card */}
                    <div style={{
                        background: "var(--void-light)",
                        border: "1px solid var(--void-border)", borderRadius: "var(--radius-lg)", padding: 24,
                    }}>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{
                                fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 800,
                                color: isLive ? "var(--cyan)" : "var(--text-primary)", lineHeight: 1,
                            }}>{formatNum(liveRaised)} ℏ</div>
                            <div style={{
                                fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600,
                                color: "var(--text-secondary)", marginTop: 6,
                            }}>raised of {formatNum(liveHardCap)} ℏ goal</div>
                        </div>

                        <div style={{
                            width: "100%", height: 10,
                            background: "var(--void-elevated)", borderRadius: 5,
                            overflow: "hidden", marginBottom: 8,
                        }}>
                            <div style={{
                                width: `${progress}%`, height: "100%",
                                background: isLive ? "var(--cyan)" : "var(--text-dim)",
                                borderRadius: 5, transition: "width 0.5s ease",
                            }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{
                                fontFamily: "var(--font-mono)", fontSize: 13,
                                color: isLive ? "var(--cyan)" : "var(--text-secondary)", fontWeight: 800,
                            }}>{progress.toFixed(1)}% funded</span>
                            <span style={{
                                fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600
                            }}>soft {formatNum(launch.softCap)} ℏ</span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 24 }}>
                            {[
                                { label: "Backers", value: liveContributors.toLocaleString(), color: "var(--text-primary)" },
                                {
                                    label: "Time Left",
                                    value: liveTimeRemaining > 0
                                        ? `${Math.floor(liveTimeRemaining / 86400)}d ${Math.floor((liveTimeRemaining % 86400) / 3600)}h`
                                        : "Ended",
                                    color: "var(--gold)"
                                },
                                { label: "Token Price", value: liveTokenPrice > 0 ? `${liveTokenPrice.toFixed(6)} ℏ` : "TBD", color: "var(--text-primary)" },
                                { label: "Status", value: ["Active", "Succeeded", "Finalized", "Failed", "Cancelled"][liveState] || "Unknown", color: stateInfo.color },
                            ].map(s => (
                                <div key={s.label} style={{
                                    background: "var(--void-light)",
                                    border: "1px solid var(--void-border)",
                                    borderRadius: "var(--radius-sm)", padding: "12px 14px",
                                }}>
                                    <div style={{
                                        fontFamily: "var(--font-mono)", fontSize: 15,
                                        fontWeight: 800, color: s.color,
                                    }}>{s.value}</div>
                                    <div style={{
                                        fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 600,
                                        color: "var(--text-secondary)", textTransform: "uppercase",
                                        letterSpacing: "0.08em", marginTop: 4,
                                    }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* User contribution info */}
                        {userAddress && userContribution > 0 && (
                            <div style={{
                                marginTop: 16, padding: "12px 14px",
                                background: "rgba(74,178,196,0.06)",
                                border: "1px solid rgba(74,178,196,0.15)",
                                borderRadius: "var(--radius-sm)",
                            }}>
                                <div style={{
                                    fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600,
                                    color: "var(--text-secondary)", textTransform: "uppercase",
                                    letterSpacing: "0.08em", marginBottom: 4,
                                }}>Your Contribution</div>
                                <div style={{
                                    fontFamily: "var(--font-mono)", fontSize: 18,
                                    fontWeight: 800, color: "var(--cyan)",
                                }}>{userContribution.toFixed(4)} ℏ</div>
                            </div>
                        )}

                        {isCreator && (isLive || isSucceeded) && (
                            <div style={{
                                marginTop: 16,
                                background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(16,185,129,0.08))",
                                border: "1px solid rgba(59,130,246,0.2)",
                                borderRadius: "var(--radius-md)",
                                padding: 16,
                            }}>
                                <div style={{
                                    fontFamily: "var(--font-display)",
                                    fontSize: 12,
                                    fontWeight: 800,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    color: "var(--text-primary)",
                                    marginBottom: 10,
                                }}>
                                    Admin Treasury Control
                                </div>
                                <p style={{
                                    margin: 0,
                                    fontFamily: "var(--font-body)",
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                    color: "var(--text-secondary)",
                                }}>
                                    As creator, you can withdraw all currently raised HBAR anytime before finalization.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Contribute card (live only) */}
                    {isLive && (
                        <div style={{
                            background: "var(--void-light)",
                            border: "1px solid var(--cyan-dim)", borderRadius: "var(--radius-lg)", padding: 24,
                            boxShadow: "0 8px 32px rgba(74,178,196,0.05)",
                        }}>
                            <div style={{
                                fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700,
                                color: "var(--cyan)", textTransform: "uppercase",
                                letterSpacing: "0.08em", marginBottom: 16,
                            }}>Contribute</div>

                            <div style={{ marginBottom: 16 }}>
                                <div style={{
                                    display: "flex", justifyContent: "space-between", marginBottom: 8,
                                }}>
                                    <label style={{
                                        fontFamily: "var(--font-body)", fontSize: 13,
                                        color: "var(--text-primary)", textTransform: "uppercase",
                                        letterSpacing: "0.08em", fontWeight: 700
                                    }}>HBAR Amount</label>
                                </div>
                                <input
                                    className="input-field"
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    style={{
                                        width: "100%",
                                        fontSize: 18,
                                        padding: "16px",
                                    }}
                                />
                                {estimatedTokens > 0 && (
                                    <div style={{
                                        fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
                                        color: "var(--text-secondary)", marginTop: 8,
                                    }}>
                                        ≈ <span style={{ color: "var(--cyan)" }}>{estimatedTokens.toLocaleString()}</span> {launch.symbol} tokens
                                    </div>
                                )}
                            </div>

                            {!isConnected ? (
                                <ConnectWalletInline label="Connect Wallet" />
                            ) : (
                                <button
                                    className="btn-primary"
                                    disabled={!amount || isNaN(Number(amount)) || Number(amount) <= 0 || isTxPending}
                                    onClick={handleContribute}
                                    style={{
                                        width: "100%", padding: "16px", fontSize: 16,
                                        opacity: (!amount || isNaN(Number(amount)) || Number(amount) <= 0 || isTxPending) ? 0.4 : 1,
                                    }}
                                >
                                    {isTxPending ? "⏳ Confirming..." : `Contribute ${amount ? `${amount} HBAR` : ""}`}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Creator Admin Controls */}
                    {isCreator && (isLive || isSucceeded) && (
                        <div style={{
                            background: "var(--void-light)",
                            border: "1px solid rgba(59,130,246,0.22)",
                            borderRadius: "var(--radius-lg)",
                            padding: 24,
                            boxShadow: "0 12px 26px rgba(15,23,42,0.06)",
                        }}>
                            <div style={{
                                fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                                color: "var(--text-primary)", textTransform: "uppercase",
                                letterSpacing: "0.08em", marginBottom: 12,
                            }}>Admin Controls</div>
                            <p style={{
                                fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500,
                                color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16,
                            }}>
                                You control the full treasury for this bond market. Withdraw raised HBAR anytime, and finalize only when ready.
                            </p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                                <button
                                    className="btn-primary"
                                    onClick={handleWithdrawRaisedAmount}
                                    disabled={isTxPending || liveRaised <= 0}
                                    style={{
                                        width: "100%", padding: "15px", fontSize: 15,
                                        background: "var(--acid)", color: "var(--inverted)",
                                        opacity: (isTxPending || liveRaised <= 0) ? 0.4 : 1,
                                    }}
                                >
                                    {isTxPending ? "⏳ Processing..." : `Withdraw Raised HBAR${liveRaised > 0 ? ` (${liveRaised.toFixed(2)} ℏ)` : ""}`}
                                </button>

                                {isSucceeded && (
                                    <button
                                        className="btn-primary"
                                        onClick={handleFinalize}
                                        disabled={isTxPending}
                                        style={{
                                            width: "100%", padding: "15px", fontSize: 15,
                                            background: "var(--gold)", color: "var(--void)",
                                            opacity: isTxPending ? 0.4 : 1,
                                        }}
                                    >
                                        {isTxPending ? "⏳ Finalizing..." : "Finalize Launch"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Succeeded: Finalize Notice */}
                    {isSucceeded && (
                        <div style={{
                            background: "var(--void-light)",
                            border: "1px solid var(--gold)40", borderRadius: "var(--radius-lg)", padding: 24,
                        }}>
                            <div style={{
                                fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                                color: "var(--gold)", textTransform: "uppercase",
                                letterSpacing: "0.08em", marginBottom: 12,
                            }}>Launch Succeeded</div>
                            <p style={{
                                fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500,
                                color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16,
                            }}>
                                The fundraise is complete. Only the launch creator can finalize and execute LP + token distribution.
                            </p>
                            {!isCreator && (
                                <div style={{
                                    padding: "12px 14px",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid rgba(245,158,11,0.35)",
                                    background: "rgba(245,158,11,0.08)",
                                    fontFamily: "var(--font-body)",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "var(--text-primary)",
                                }}>
                                    Waiting for creator finalization.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Finalized: Claim tokens */}
                    {isFinalized && (
                        <div style={{
                            background: "var(--void-light)",
                            border: "1px solid var(--magenta-dim)", borderRadius: "var(--radius-lg)", padding: 24,
                            boxShadow: "0 8px 32px rgba(193,85,126,0.05)",
                        }}>
                            <div style={{
                                fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                                color: "var(--magenta)", textTransform: "uppercase",
                                letterSpacing: "0.08em", marginBottom: 12,
                            }}>Claim Tokens</div>
                            <p style={{
                                fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500,
                                color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20,
                            }}>
                                The launch has finalized! Your <strong style={{ color: "var(--text-primary)" }}>{launch.symbol}</strong> tokens are ready.
                            </p>
                            {userClaimed ? (
                                <div style={{
                                    padding: "12px 20px", borderRadius: "var(--radius-md)",
                                    background: "rgba(106,168,106,0.1)", border: "1px solid var(--acid)40",
                                    fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--acid)",
                                    fontWeight: 700, textAlign: "center",
                                }}>
                                    ✅ Already Claimed
                                </div>
                            ) : (
                                <button
                                    className="btn-primary"
                                    onClick={handleClaimTokens}
                                    disabled={isTxPending || userContribution <= 0}
                                    style={{
                                        width: "100%", padding: "16px", fontSize: 16,
                                        opacity: (isTxPending || userContribution <= 0) ? 0.4 : 1,
                                    }}
                                >
                                    {isTxPending ? "⏳ Claiming..." : `Claim ${launch.symbol}`}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Failed/Cancelled: Refund */}
                    {(isFailed || isCancelled) && (
                        <div style={{
                            background: "var(--void-light)",
                            border: "1px solid var(--magenta)40", borderRadius: "var(--radius-lg)", padding: 24,
                        }}>
                            <div style={{
                                fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800,
                                color: "var(--magenta)", textTransform: "uppercase",
                                letterSpacing: "0.08em", marginBottom: 12,
                            }}>{isFailed ? "Launch Failed" : "Launch Cancelled"}</div>
                            <p style={{
                                fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500,
                                color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16,
                            }}>
                                {isFailed ? "Soft cap was not reached." : "The creator cancelled this launch."} Claim your refund below.
                            </p>
                            <button
                                className="btn-primary"
                                onClick={handleClaimRefund}
                                disabled={isTxPending || userContribution <= 0}
                                style={{
                                    width: "100%", padding: "16px", fontSize: 16,
                                    background: "var(--magenta)",
                                    opacity: (isTxPending || userContribution <= 0) ? 0.4 : 1,
                                }}
                            >
                                {isTxPending ? "⏳ Refunding..." : `Claim Refund${userContribution > 0 ? ` (${userContribution.toFixed(4)} ℏ)` : ""}`}
                            </button>
                        </div>
                    )}

                    {/* Check State button (when live and time may have ended) */}
                    {isLive && liveTimeRemaining <= 0 && (
                        <button
                            onClick={handleCheckState}
                            disabled={isTxPending}
                            style={{
                                width: "100%", padding: "14px", fontSize: 14,
                                background: "var(--void-light)",
                                border: "1px solid var(--void-border)",
                                borderRadius: "var(--radius-md)",
                                color: "var(--text-primary)",
                                fontFamily: "var(--font-display)", fontWeight: 700,
                                cursor: "pointer", textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                opacity: isTxPending ? 0.4 : 1,
                            }}
                        >
                            ⚡ Update Launch State
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoChip({ label, value }: { label: string; value: string }) {
    return (
        <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "var(--void-elevated)",
            border: "1px solid var(--void-border)",
            borderRadius: 6, padding: "4px 10px",
        }}>
            <span style={{
                fontFamily: "var(--font-body)", fontSize: 11,
                color: "var(--text-dim)", textTransform: "uppercase",
                letterSpacing: "0.05em", fontWeight: 600,
            }}>{label}</span>
            <span style={{
                fontFamily: "var(--font-mono)", fontSize: 12,
                color: "var(--text-secondary)", fontWeight: 700,
            }}>{value}</span>
        </div>
    );
}
