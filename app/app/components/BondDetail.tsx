"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useBalance } from "wagmi";
import { parseEther, formatEther, parseUnits, formatUnits } from "viem";
import { BOND_ABI } from "../lib/contracts";
import { useBondDetail, useBondContributors, type BondCardData } from "../lib/hooks";

const STATE_LABELS: Record<number, string> = {
    0: "RAISING", 1: "ACTIVE", 2: "MATURED", 3: "FAILED", 4: "CANCELLED",
};

interface BondDetailProps {
    bond: BondCardData;
    onBack: () => void;
}

export default function BondDetail({ bond, onBack }: BondDetailProps) {
    const { address: userAddress } = useAccount();
    const { data: balanceData } = useBalance({ address: userAddress });
    const { writeContract, isPending, error: writeError } = useWriteContract();
    const [contributeAmt, setContributeAmt] = useState("");
    const [unstakeAmt, setUnstakeAmt] = useState("");
    const [withdrawAmt, setWithdrawAmt] = useState("");

    const bondAddr = bond.bondContract as `0x${string}`;
    const { data } = useBondDetail(bond.bondContract);
    const { contributors: bondContributors, isLoading: isLoadingContributors } = useBondContributors(bond.bondContract);

    // Parse on-chain data
    const get = (idx: number): bigint => {
        if (!data || !data[idx] || data[idx].status !== "success") return 0n;
        return (data[idx].result as bigint) || 0n;
    };
    const getStr = (idx: number): string => {
        if (!data || !data[idx] || data[idx].status !== "success") return "";
        return (data[idx].result as string) || "";
    };
    const getBool = (idx: number): boolean => {
        if (!data || !data[idx] || data[idx].status !== "success") return false;
        return data[idx].result as boolean;
    };

    const totalRaisedRaw = get(0);
    const hardCap = get(1);
    const softCap = get(2);
    const contributors = Number(get(3));
    const timeRemaining = Number(get(4));
    const state = Number(get(5));
    const tokenAddr = getStr(6);
    const yieldRateBps = Number(get(7));
    const epochDuration = Number(get(8));
    const totalStaked = get(9);
    const totalYieldMinted = get(10);
    const nextEpoch = Number(get(11));
    const description = getStr(12);
    const name = getStr(13) || bond.name;
    const symbol = getStr(14) || bond.symbol;
    const totalSupply = get(15);
    const creator = getStr(16);
    const withdrawableHbar = get(17);
    const hbarWithdrawn = get(18);

    // User-specific data (indices 20-23)
    const userContribution = get(20);
    const userClaimed = getBool(21);
    const userStaked = get(22);
    const userPendingYield = get(23);

    const isCreator = userAddress?.toLowerCase() === creator.toLowerCase();
    const apy = (yieldRateBps / 100).toFixed(1);
    const progress = hardCap > 0n ? Number((totalRaisedRaw * 10000n) / hardCap) / 100 : 0;

    const formatTime = (s: number) => {
        if (s <= 0) return "Ended";
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        if (d > 0) return `${d}d ${h}h`;
        return `${h}h ${m}m`;
    };

    const handleContribute = () => {
        if (!contributeAmt) return;
        writeContract({
            address: bondAddr,
            abi: BOND_ABI,
            functionName: "contribute",
            value: parseEther(contributeAmt),
        });
    };

    const handleClaim = () => {
        writeContract({ address: bondAddr, abi: BOND_ABI, functionName: "claimBonds" });
    };

    const handleDistribute = () => {
        writeContract({ address: bondAddr, abi: BOND_ABI, functionName: "distributeYield" });
    };

    const handleClaimYield = () => {
        writeContract({ address: bondAddr, abi: BOND_ABI, functionName: "claimYield" });
    };

    const handleUnstake = () => {
        if (!unstakeAmt) return;
        writeContract({
            address: bondAddr,
            abi: BOND_ABI,
            functionName: "unstake",
            args: [parseEther(unstakeAmt)],
        });
    };

    const handleWithdrawHbar = () => {
        if (!withdrawAmt) return;
        writeContract({
            address: bondAddr,
            abi: BOND_ABI,
            functionName: "withdrawHbar",
            args: [parseUnits(withdrawAmt, 8)],
        });
    };

    const handleActivate = () => {
        writeContract({ address: bondAddr, abi: BOND_ABI, functionName: "activate" });
    };

    const handleCancel = () => {
        writeContract({ address: bondAddr, abi: BOND_ABI, functionName: "cancel" });
    };

    const handleRefund = () => {
        writeContract({ address: bondAddr, abi: BOND_ABI, functionName: "claimRefund" });
    };

    const handleCheckState = () => {
        writeContract({ address: bondAddr, abi: BOND_ABI, functionName: "checkState" });
    };

    const sectionStyle = {
        padding: 24,
        marginBottom: 16,
    };

    return (
        <div>
            {/* Back button */}
            <button onClick={onBack} style={{
                background: "none", border: "none", color: "var(--text-secondary)",
                cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 14, marginBottom: 24,
                padding: 0,
            }}>
                ← Back to Bonds
            </button>

            {/* Header */}
            <div className="glass-card" style={{ ...sectionStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div>
                    <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
                        {name}
                    </h1>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-dim)" }}>
                        ${symbol}
                    </span>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{
                        background: "linear-gradient(135deg, #00e676, #00bfa5)",
                        color: "#000", fontSize: 18, fontWeight: 800,
                        padding: "8px 20px", borderRadius: 10,
                        fontFamily: "var(--font-display)",
                    }}>
                        {apy}% APY
                    </div>
                    <span style={{
                        fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8,
                        color: state === 1 ? "#2979ff" : state === 0 ? "#00e676" : "#f44336",
                        background: state === 1 ? "rgba(41,121,255,0.1)" : state === 0 ? "rgba(0,230,118,0.1)" : "rgba(244,67,54,0.1)",
                        fontFamily: "var(--font-mono)",
                    }}>
                        {STATE_LABELS[state] || "UNKNOWN"}
                    </span>
                </div>
            </div>

            {/* Description */}
            {description && (
                <div className="glass-card" style={sectionStyle}>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-primary)", marginBottom: 8 }}>About</h3>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        {description}
                    </p>
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* ── Left Column: Bond Stats ── */}
                <div>
                    {/* Raise Progress */}
                    <div className="glass-card" style={sectionStyle}>
                        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-primary)", marginBottom: 16 }}>
                            {state === 0 ? "Raise Progress" : "Raise Complete"}
                        </h3>
                        <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", marginBottom: 8 }}>
                            <div style={{
                                width: `${Math.min(100, progress)}%`, height: "100%", borderRadius: 4,
                                background: "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))",
                            }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                            <span>{parseFloat(formatUnits(totalRaisedRaw, 8)).toLocaleString()} HBAR raised</span>
                            <span>{progress.toFixed(1)}%</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
                            <div>
                                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Hard Cap</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{parseFloat(formatUnits(hardCap, 8)).toLocaleString()} ℏ</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Soft Cap</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{parseFloat(formatUnits(softCap, 8)).toLocaleString()} ℏ</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Contributors</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{contributors}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{state === 0 ? "Time Left" : "Epoch"}</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                                    {state === 0 ? formatTime(timeRemaining) : `Every ${Math.floor(epochDuration / 3600)}h`}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Staking & Yield Stats */}
                    {state === 1 && (
                        <div className="glass-card" style={sectionStyle}>
                            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-primary)", marginBottom: 16 }}>
                                Staking & Yield
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <div>
                                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Total Staked</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{parseFloat(formatEther(totalStaked)).toLocaleString()}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Yield Minted</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "#00e676" }}>{parseFloat(formatEther(totalYieldMinted)).toLocaleString()}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Next Epoch</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                                        {nextEpoch === 0 ? "Ready!" : formatTime(nextEpoch)}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>HBAR Withdrawn</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{parseFloat(formatUnits(hbarWithdrawn, 8)).toLocaleString()}</div>
                                </div>
                            </div>
                            {nextEpoch === 0 && (
                                <button className="btn-primary" onClick={handleDistribute} disabled={isPending} style={{ width: "100%", marginTop: 16 }}>
                                    Distribute Yield
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Right Column: User Actions ── */}
                <div>
                    {/* Contribute (RAISING state) */}
                    {state === 0 && (
                        <div className="glass-card" style={sectionStyle}>
                            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-primary)", marginBottom: 8 }}>
                                Buy Bonds
                            </h3>
                            <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
                                Balance: {balanceData ? `${parseFloat(formatEther(balanceData.value)).toFixed(2)} ${balanceData.symbol}` : "0 HBAR"}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                                <input
                                    type="number"
                                    placeholder="HBAR amount"
                                    value={contributeAmt}
                                    onChange={(e) => setContributeAmt(e.target.value)}
                                    style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "var(--text-primary)", fontSize: 14 }}
                                />
                                <button className="btn-primary" onClick={handleContribute} disabled={isPending || !contributeAmt || isNaN(Number(contributeAmt)) || (balanceData && !isNaN(Number(contributeAmt)) && parseEther(contributeAmt || "0") > balanceData.value)}>
                                    {isPending ? "..." : (balanceData && !isNaN(Number(contributeAmt)) && parseEther(contributeAmt || "0") > balanceData.value ? "Insufficient HBAR" : "Contribute")}
                                </button>
                            </div>
                            {userContribution > 0n && (
                                <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>
                                    Your contribution: {parseFloat(formatUnits(userContribution, 8)).toLocaleString()} HBAR
                                </p>
                            )}
                            {writeError && (
                                <div style={{ fontSize: 12, color: "var(--magenta)", marginTop: 8, padding: 8, background: "rgba(244, 67, 54, 0.1)", borderRadius: 6, wordBreak: "break-word" }}>
                                    {writeError.message || "Transaction failed."}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Claim Bonds (ACTIVE, not yet claimed) */}
                    {state === 1 && userContribution > 0n && !userClaimed && (
                        <div className="glass-card" style={sectionStyle}>
                            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-primary)", marginBottom: 8 }}>
                                Claim Your Bonds
                            </h3>
                            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                                Your bonds will be auto-staked to start earning {apy}% APY.
                            </p>
                            <button className="btn-primary" onClick={handleClaim} disabled={isPending} style={{ width: "100%" }}>
                                Claim & Auto-Stake
                            </button>
                        </div>
                    )}

                    {/* Your Staking Position */}
                    {state === 1 && userStaked > 0n && (
                        <div className="glass-card" style={sectionStyle}>
                            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-primary)", marginBottom: 16 }}>
                                Your Position
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Staked</div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                                        {parseFloat(formatEther(userStaked)).toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Pending Yield</div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: "#00e676" }}>
                                        {parseFloat(formatEther(userPendingYield)).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {userPendingYield > 0n && (
                                <button className="btn-primary" onClick={handleClaimYield} disabled={isPending} style={{ width: "100%", marginBottom: 12 }}>
                                    Claim Yield
                                </button>
                            )}

                            <div style={{ display: "flex", gap: 8 }}>
                                <input
                                    type="number"
                                    placeholder="Amount to unstake"
                                    value={unstakeAmt}
                                    onChange={(e) => setUnstakeAmt(e.target.value)}
                                    style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "var(--text-primary)", fontSize: 13 }}
                                />
                                <button className="btn-secondary" onClick={handleUnstake} disabled={isPending || !unstakeAmt}>
                                    Unstake
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Refund (FAILED/CANCELLED) */}
                    {(state === 3 || state === 4) && userContribution > 0n && (
                        <div className="glass-card" style={sectionStyle}>
                            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "#f44336", marginBottom: 8 }}>
                                {state === 3 ? "Bond Failed" : "Bond Cancelled"}
                            </h3>
                            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                                Your contribution of {parseFloat(formatUnits(userContribution, 8)).toLocaleString()} HBAR is refundable.
                            </p>
                            <button className="btn-primary" onClick={handleRefund} disabled={isPending} style={{ width: "100%" }}>
                                Claim Refund
                            </button>
                        </div>
                    )}

                    {/* Creator Admin Panel */}
                    {isCreator && (
                        <div className="glass-card" style={{ ...sectionStyle, borderLeft: "3px solid var(--accent-primary)" }}>
                            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--accent-primary)", marginBottom: 16 }}>
                                Admin Panel
                            </h3>

                            {state === 0 && totalRaisedRaw >= softCap && (
                                <button className="btn-primary" onClick={handleActivate} disabled={isPending} style={{ width: "100%", marginBottom: 8 }}>
                                    Activate Bond
                                </button>
                            )}

                            {state === 0 && (
                                <>
                                    <button className="btn-secondary" onClick={handleCheckState} disabled={isPending} style={{ width: "100%", marginBottom: 8 }}>
                                        Check State
                                    </button>
                                    <button className="btn-secondary" onClick={handleCancel} disabled={isPending} style={{ width: "100%", marginBottom: 8, color: "#f44336" }}>
                                        Cancel Bond
                                    </button>
                                </>
                            )}

                            {state === 1 && withdrawableHbar > 0n && (
                                <div>
                                    <p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>
                                        Withdrawable: {parseFloat(formatUnits(withdrawableHbar, 8)).toLocaleString()} HBAR
                                    </p>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <input
                                            type="number"
                                            placeholder="HBAR amount"
                                            value={withdrawAmt}
                                            onChange={(e) => setWithdrawAmt(e.target.value)}
                                            style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "var(--text-primary)", fontSize: 13 }}
                                        />
                                        <button className="btn-primary" onClick={handleWithdrawHbar} disabled={isPending || !withdrawAmt}>
                                            Withdraw
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Contributors Section */}
            <div className="glass-card" style={{ ...sectionStyle, marginTop: 16 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-primary)", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Contributors ({contributors})</span>
                    {isLoadingContributors && <span style={{ fontSize: 14, color: "var(--text-dim)" }}>Loading...</span>}
                </h3>
                {bondContributors.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {bondContributors.map((c, i) => (
                            <div key={c.address} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-dim)", width: 24 }}>#{i + 1}</div>
                                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-primary)" }}>
                                        {c.address.slice(0, 6)}...{c.address.slice(-4)}
                                    </div>
                                </div>
                                <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--cyan)", fontWeight: 600 }}>
                                    {parseFloat(formatUnits(c.amount, 8)).toLocaleString()} ℏ
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-dim)", textAlign: "center", padding: "24px 0" }}>
                        {isLoadingContributors ? "Fetching contributors..." : "No contributors yet."}
                    </p>
                )}
            </div>

            {/* Contract info footer */}
            <div className="glass-card" style={{ ...sectionStyle, marginTop: 16, opacity: 0.7 }}>
                <div style={{ display: "flex", gap: 32, fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-mono)", flexWrap: "wrap" }}>
                    <span>Bond: {bond.bondContract}</span>
                    <span>Token: {tokenAddr}</span>
                    <span>Supply: {parseFloat(formatEther(totalSupply)).toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}
