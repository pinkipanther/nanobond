"use client";

import { useEffect, useState } from "react";
import { formatEther, formatUnits, createPublicClient, http } from "viem";
import { HBAR_DECIMALS, PRO_FACTORY_ABI, isConfiguredAddress, CONTRACTS } from "../lib/contracts";
import {
  bondNoArgTransaction,
  contributeTransaction,
  parseHbar,
  withdrawHbarTransaction,
} from "../lib/contractActions";
import { useBondContributors, useBondDetail, type BondCardData } from "../lib/hooks";
import { tinybarsToHbar, useWallet } from "../lib/wallet";
import PriceChart from "./PriceChart";

const STATE_LABELS: Record<number, string> = {
  0: "RAISING",
  1: "ACTIVE",
  2: "MATURED",
  3: "FAILED",
  4: "CANCELLED",
};

interface BondDetailProps {
  bond: BondCardData;
  onBack: () => void;
}

export default function BondDetail({ bond, onBack }: BondDetailProps) {
  const wallet = useWallet();
  const [contributeAmt, setContributeAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const { data } = useBondDetail(bond.bondContract);
  const { contributors: bondContributors, isLoadingContributors } = useBondContributors(bond.bondContract);

  const [poolAddress, setPoolAddress] = useState<string | null>(null);

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
  const totalYieldMinted = get(10);
  const nextEpoch = Number(get(11));
  const description = getStr(12);
  const name = getStr(13) || bond.name;
  const symbol = getStr(14) || bond.symbol;
  const totalSupply = get(15);
  const creator = getStr(16);
  const withdrawableHbar = get(17);
  const hbarWithdrawn = get(18);
  const userContribution = get(20);
  const userClaimed = getBool(21);
  const userPendingYield = get(23);

  useEffect(() => {
    if (state !== 1 || !tokenAddr || !isConfiguredAddress(CONTRACTS.PRO_FACTORY)) return;
    const client = createPublicClient({ transport: http() });
    client.readContract({
      address: CONTRACTS.PRO_FACTORY as `0x${string}`,
      abi: PRO_FACTORY_ABI,
      functionName: "getPool",
      args: [tokenAddr as `0x${string}`],
    }).then((addr: string) => {
      if (addr && addr !== "0x0000000000000000000000000000000000000000") {
        setPoolAddress(addr);
      }
    }).catch(() => {});
  }, [state, tokenAddr]);

  const isCreator = !!wallet.evmAddress && wallet.evmAddress.toLowerCase() === creator.toLowerCase();
  const apr = (yieldRateBps / 100).toFixed(1);
  const progress = hardCap > 0n ? Number((totalRaisedRaw * 10000n) / hardCap) / 100 : 0;
  const isPending = !!wallet.pendingTx;

  const formatTime = (s: number) => {
    if (s <= 0) return "Ended";
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
  };

  const send = async (label: string, build: () => ReturnType<typeof bondNoArgTransaction>) => {
    setLocalError(null);
    try {
      if (!wallet.isConnected) {
        await wallet.connect();
        return;
      }
      await wallet.sendTx(build(), { description: label });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : `${label} failed`);
    }
  };

  const balanceTooLow = contributeAmt ? parseHbar(contributeAmt) > (wallet.balanceTinybar ?? 0n) : false;

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* ── Navigation ── */}
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, marginBottom: 32, padding: 0, transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Bonds
      </button>

      {/* ── Hero / Header ── */}
      <div style={{ marginBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{name}</h1>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--cyan)", fontWeight: 700 }}>${symbol}</span>
          </div>
          {description && <p style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 700, margin: 0 }}>{description}</p>}
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, padding: "6px 14px", borderRadius: 999, color: state === 1 ? "var(--cyan)" : state === 0 ? "var(--acid)" : "var(--text-dim)", border: `1px solid ${state === 1 ? "rgba(88,166,255,0.3)" : state === 0 ? "rgba(16,185,129,0.3)" : "var(--void-border)"}`, background: state === 1 ? "rgba(88,166,255,0.05)" : state === 0 ? "rgba(16,185,129,0.05)" : "transparent", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {STATE_LABELS[state] || "UNKNOWN"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 800, color: "var(--acid)", letterSpacing: "-0.02em" }}>{apr}%</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>APR</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 40, alignItems: "start" }}>
        {/* ── Main Content (Left) ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          
          {/* Progress / Stats Area */}
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 20, letterSpacing: "-0.02em" }}>{state === 0 ? "Raise Progress" : "Bond Statistics"}</h2>
            
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>
                  {parseFloat(formatUnits(totalRaisedRaw, HBAR_DECIMALS)).toLocaleString()} <span style={{ fontSize: 16, color: "var(--text-dim)", fontWeight: 600 }}>HBAR Raised</span>
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--cyan)", fontWeight: 700 }}>{progress.toFixed(1)}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "var(--void-elevated)", overflow: "hidden" }}>
                <div style={{ width: "100%", height: "100%", borderRadius: 3, background: "var(--cyan)", transform: `scaleX(${Math.max(0, Math.min(100, progress)) / 100})`, transformOrigin: "left center", transition: "transform 1s cubic-bezier(0.16, 1, 0.3, 1)" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 24, paddingBottom: 32, borderBottom: "1px solid var(--void-border)" }}>
              <Stat label="Hard Cap" value={`${parseFloat(formatUnits(hardCap, HBAR_DECIMALS)).toLocaleString()} ℏ`} />
              <Stat label="Soft Cap" value={`${parseFloat(formatUnits(softCap, HBAR_DECIMALS)).toLocaleString()} ℏ`} />
              <Stat label="Contributors" value={contributors.toString()} />
              <Stat label={state === 0 ? "Time Left" : "Epoch"} value={state === 0 ? formatTime(timeRemaining) : `Every ${Math.floor(epochDuration / 3600)}h`} />
            </div>
          </div>

          {/* Active Rewards Area */}
          {state === 1 && (
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 20, letterSpacing: "-0.02em" }}>Protocol Rewards</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 24, paddingBottom: 32, borderBottom: "1px solid var(--void-border)" }}>
                <Stat label="Token Supply" value={parseFloat(formatEther(totalSupply)).toLocaleString()} />
                <Stat label="Yield Minted" value={parseFloat(formatEther(totalYieldMinted)).toLocaleString()} color="var(--acid)" />
                <Stat label="Next Epoch" value={nextEpoch === 0 ? "Ready" : formatTime(nextEpoch)} />
                <Stat label="HBAR Withdrawn" value={parseFloat(formatUnits(hbarWithdrawn, HBAR_DECIMALS)).toLocaleString()} />
              </div>
            </div>
          )}

          {/* Price Chart */}
          {state === 1 && poolAddress && (
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 20, letterSpacing: "-0.02em" }}>Price History</h2>
              <div style={{ height: 320, background: "var(--void-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--void-border)", padding: 16 }}>
                <PriceChart poolAddress={poolAddress} tokenSymbol={symbol} height={280} />
              </div>
            </div>
          )}

          {/* Contributors List */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Contributors</h2>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-dim)" }}>{contributors} total</span>
            </div>
            
            {bondContributors.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {bondContributors.map((c, i) => (
                  <div key={c.address} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: i < bondContributors.length - 1 ? "1px solid var(--void-border)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-dim)", width: 24, fontWeight: 600 }}>{i + 1}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-primary)" }}>{c.address.slice(0, 8)}...{c.address.slice(-6)}</div>
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--cyan)", fontWeight: 700 }}>
                      {parseFloat(formatUnits(c.amount, HBAR_DECIMALS)).toLocaleString()} <span style={{ color: "var(--text-dim)", fontSize: 12 }}>HBAR</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-dim)", padding: "24px 0", margin: 0 }}>
                {isLoadingContributors ? "Loading contributors..." : "No contributors yet. Be the first!"}
              </p>
            )}
          </div>
        </div>

        {/* ── Sidebar (Right) ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 100 }}>
          
          {(localError || wallet.error) && (
            <div style={{ fontSize: 13, color: "var(--magenta)", padding: "12px 16px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "var(--radius-md)", wordBreak: "break-word", lineHeight: 1.5 }}>
              {localError || wallet.error}
            </div>
          )}

          {/* Action Module: Buy Bonds */}
          {state === 0 && (
            <div className="glass-card" style={{ padding: 28 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-primary)", marginBottom: 8, fontWeight: 700 }}>Invest in {name}</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>Purchase ${symbol} bonds. Funds will be returned if the soft cap is not reached.</p>
              
              <div style={{ background: "var(--void-surface)", border: "1px solid var(--void-border)", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Wallet Balance</span>
                <span style={{ fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{tinybarsToHbar(wallet.balanceTinybar)} ℏ</span>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <input type="number" placeholder="0.00" value={contributeAmt} onChange={(e) => setContributeAmt(e.target.value)} style={{ width: "100%", padding: "16px", paddingRight: 60, borderRadius: "var(--radius-md)", border: "1px solid var(--void-border)", background: "var(--void-light)", color: "var(--text-primary)", fontSize: 18, fontFamily: "var(--font-mono)", outline: "none", transition: "border-color 0.2s" }} onFocus={(e) => e.currentTarget.style.borderColor = "var(--cyan)"} onBlur={(e) => e.currentTarget.style.borderColor = "var(--void-border)"} />
                  <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700 }}>HBAR</span>
                </div>
                <button className="btn-primary" onClick={() => send("Contribute", () => contributeTransaction(bond.bondContract, contributeAmt))} disabled={isPending || !contributeAmt || isNaN(Number(contributeAmt)) || balanceTooLow} style={{ padding: 16, fontSize: 15 }}>
                  {isPending ? "Processing..." : balanceTooLow ? "Insufficient HBAR" : !wallet.isConnected ? "Connect Wallet" : "Invest Now"}
                </button>
              </div>
              {userContribution > 0n && (
                <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "var(--text-secondary)" }}>
                  Your current stake: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{parseFloat(formatUnits(userContribution, HBAR_DECIMALS)).toLocaleString()} HBAR</span>
                </div>
              )}
            </div>
          )}

          {/* Action Module: Active State / Claim */}
          {state === 1 && userContribution > 0n && !userClaimed && (
            <ActionCard title="Claim Your Tokens" body={`Your investment has been converted to ${symbol} tokens. Claim them now to start earning ${apr}% APR.`} label="Claim Tokens" pending={isPending} onClick={() => send("Claim bonds", () => bondNoArgTransaction(bond.bondContract, "claimBonds"))} accent="var(--cyan)" />
          )}

          {/* Action Module: Position & Yield */}
          {state === 1 && (userClaimed || userPendingYield > 0n) && (
            <div className="glass-card" style={{ padding: 28, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--acid)" }} />
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-primary)", marginBottom: 20, fontWeight: 700 }}>Your Position</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-dim)" }}>Tokens</span>
                  <span style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>{userClaimed ? "Claimed to Wallet" : "Unclaimed"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: "1px solid var(--void-border)" }}>
                  <span style={{ fontSize: 13, color: "var(--text-dim)" }}>Pending Yield</span>
                  <span style={{ fontSize: 16, color: "var(--acid)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{parseFloat(formatEther(userPendingYield)).toLocaleString()} ${symbol}</span>
                </div>
              </div>
              
              <button className="btn-primary" onClick={() => send("Claim yield", () => bondNoArgTransaction(bond.bondContract, "claimYield"))} disabled={isPending || userPendingYield === 0n} style={{ width: "100%", padding: 14, background: userPendingYield > 0n ? "var(--acid)" : "var(--void-elevated)", color: userPendingYield > 0n ? "var(--void)" : "var(--text-dim)", opacity: userPendingYield > 0n ? 1 : 0.5 }}>
                {isPending ? "Claiming..." : "Claim Yield"}
              </button>
            </div>
          )}

          {/* Action Module: Refund */}
          {(state === 3 || state === 4) && userContribution > 0n && (
             <ActionCard title="Claim Refund" body={`This bond did not complete successfully. You can refund your ${parseFloat(formatUnits(userContribution, HBAR_DECIMALS)).toLocaleString()} HBAR.`} label="Process Refund" pending={isPending} onClick={() => send("Claim refund", () => bondNoArgTransaction(bond.bondContract, "claimRefund"))} accent="var(--magenta)" />
          )}

          {/* Admin Tools */}
          {state === 1 && nextEpoch === 0 && (
             <div className="glass-card" style={{ padding: 24, border: "1px solid rgba(99,102,241,0.2)" }}>
               <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--cyan)", marginBottom: 12 }}>Global Actions</h3>
               <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>The yield epoch is ready. Anyone can trigger distribution.</p>
               <button className="btn-secondary" onClick={() => send("Distribute yield", () => bondNoArgTransaction(bond.bondContract, "distributeYield"))} disabled={isPending} style={{ width: "100%" }}>Distribute Yield</button>
             </div>
          )}

          {isCreator && (
            <div className="glass-card" style={{ padding: 24, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round"><path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z" /></svg>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--cyan)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Creator Admin</h3>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {state === 0 && totalRaisedRaw >= softCap && <button className="btn-primary" onClick={() => send("Activate bond", () => bondNoArgTransaction(bond.bondContract, "activate"))} disabled={isPending} style={{ padding: 10, fontSize: 13 }}>Activate Bond</button>}
                {state === 0 && <button className="btn-secondary" onClick={() => send("Check state", () => bondNoArgTransaction(bond.bondContract, "checkState"))} disabled={isPending} style={{ padding: 10, fontSize: 13 }}>Refresh State</button>}
                {state === 0 && <button className="btn-secondary" onClick={() => send("Cancel bond", () => bondNoArgTransaction(bond.bondContract, "cancel"))} disabled={isPending} style={{ padding: 10, fontSize: 13, color: "var(--magenta)", borderColor: "rgba(244,63,94,0.3)" }}>Cancel Raise</button>}
                {state === 1 && withdrawableHbar > 0n && (
                  <div style={{ marginTop: 8, paddingTop: 16, borderTop: "1px solid rgba(99,102,241,0.2)" }}>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>Available: {parseFloat(formatUnits(withdrawableHbar, HBAR_DECIMALS)).toLocaleString()} HBAR</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="number" placeholder="Amount" value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--void-border)", background: "var(--void-surface)", color: "var(--text-primary)", fontSize: 13, minWidth: 0 }} />
                      <button className="btn-primary" onClick={() => send("Withdraw HBAR", () => withdrawHbarTransaction(bond.bondContract, withdrawAmt))} disabled={isPending || !withdrawAmt || parseHbar(withdrawAmt) > withdrawableHbar} style={{ padding: "8px 16px", fontSize: 13 }}>Withdraw</button>
                    </div>
                  </div>
                )}
                {state !== 0 && withdrawableHbar === 0n && <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", padding: "8px 0" }}>No admin actions available.</div>}
              </div>
            </div>
          )}

          {/* Dev Info Footer */}
          <div style={{ marginTop: 16, padding: 16, borderRadius: "var(--radius-md)", background: "transparent", border: "1px dashed var(--void-border)" }}>
             <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>
               <div><span style={{ opacity: 0.6 }}>Bond:</span> {bond.bondContract}</div>
               <div><span style={{ opacity: 0.6 }}>Token:</span> {tokenAddr || "Pending"}</div>
               <div><span style={{ opacity: 0.6 }}>Creator:</span> {creator}</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color = "var(--text-primary)" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-mono)" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "var(--font-mono)" }}>{value}</div>
    </div>
  );
}

function ActionCard({ title, body, label, pending, onClick, accent = "var(--cyan)" }: { title: string; body: string; label: string; pending: boolean; onClick: () => void; accent?: string }) {
  return (
    <div className="glass-card" style={{ padding: 28, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-primary)", marginBottom: 8, fontWeight: 700 }}>{title}</h3>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>{body}</p>
      <button className="btn-primary" onClick={onClick} disabled={pending} style={{ width: "100%", padding: 14, background: accent, color: "var(--void)" }}>
        {pending ? "Processing..." : label}
      </button>
    </div>
  );
}
