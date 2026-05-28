"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBonds } from "../lib/hooks";
import { useWallet, tinybarsToHbar } from "../lib/wallet";
import { ConnectWalletInline } from "../components/ConnectWallet";

const STATE_LABEL = ["Raising", "Active", "Matured", "Failed", "Cancelled"];
const STATE_COLOR = [
  "var(--acid)",
  "var(--cyan)",
  "var(--gold)",
  "var(--magenta)",
  "var(--text-dim)",
];

function fmt(n: number, decimals = 2) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(decimals);
}

function StatCard({ label, value, accent, icon }: { label: string; value: string; accent: string; icon: React.ReactNode }) {
  return (
    <div className="glass-card" style={{ padding: "20px 22px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "16px 16px 0 0" }} />
      <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: accent, opacity: 0.06, pointerEvents: "none" }} />
      <div style={{ color: accent, opacity: 0.8 }}>{icon}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--void-surface)", border: "1px solid var(--void-border)", borderRadius: "var(--radius-md)", transition: "border-color 0.2s" }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--void-border)")}
      >
        <span style={{ fontFamily: mono ? "var(--font-mono)" : "var(--font-body)", fontSize: 13, color: "var(--text-primary)", flex: 1, wordBreak: "break-all", lineHeight: 1.5 }}>
          {value || "—"}
        </span>
        {value && (
          <button onClick={handleCopy} style={{ background: "none", border: "none", cursor: "pointer", color: copied ? "var(--acid)" : "var(--text-dim)", padding: 4, borderRadius: 4, flexShrink: 0, transition: "color 0.2s", display: "flex", alignItems: "center" }} title="Copy">
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const { bonds, isLoading } = useBonds();
  const wallet = useWallet();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await wallet.refreshBalance();
    setRefreshing(false);
  };

  const walletAddress = wallet.evmAddress ?? wallet.accountId;

  const myCreatedBonds = useMemo(() => {
    if (!wallet.isConnected || !walletAddress) return [];
    return bonds.filter((b) => b.creator.toLowerCase() === walletAddress.toLowerCase());
  }, [bonds, wallet.isConnected, walletAddress]);

  const stats = useMemo(() => {
    let raised = 0;
    myCreatedBonds.forEach(b => raised += b.totalRaised);
    return { raised, total: myCreatedBonds.length, active: myCreatedBonds.filter(b => b.state === 1).length };
  }, [myCreatedBonds]);

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}>
        <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--void-border)", borderTopColor: "var(--cyan)", animation: "spin-icon 0.8s linear infinite", margin: "0 auto 20px" }} />
          <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontWeight: 600 }}>Loading portfolio…</p>
        </div>
      </div>
    );
  }

  if (!wallet.isConnected) {
    return (
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}>
        <div style={{ maxWidth: 440, margin: "0 auto" }}>
          <div className="glass-card" style={{ padding: 40, textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(167,139,250,0.2))", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-4 0v2" />
                <circle cx="12" cy="14" r="2" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8, letterSpacing: "-0.02em" }}>Connect your wallet</h2>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>Connect your wallet to view your portfolio and profile on Hedera testnet.</p>
            <ConnectWalletInline />
          </div>
        </div>
      </div>
    );
  }

  const balance = tinybarsToHbar(wallet.balanceTinybar);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 6, height: 28, borderRadius: 3, background: "linear-gradient(180deg, #6366f1, #10b981)" }} />
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Portfolio & Profile
          </h1>
        </div>
        <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontSize: 14, marginLeft: 16 }}>
          Manage your identity, track your created bonds, and monitor your earnings.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start", marginBottom: 36 }}>
        
        {/* Left Column: KPI Row & Bond List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* ── KPI row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            <StatCard
              label="Bonds Created"
              value={`${stats.total}`}
              accent="var(--cyan)"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-4 0v2" /></svg>}
            />
            <StatCard
              label="Volume Raised"
              value={`${fmt(stats.raised)} ℏ`}
              accent="var(--acid)"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
            />
            <StatCard
              label="Active Pools"
              value={`${stats.active}`}
              accent="var(--magenta)"
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
            />
          </div>

          {/* ── My Created Bonds ── */}
          <div className="glass-card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "20px 22px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z" />
                </svg>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
                  My Created Bonds
                </span>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "10px 22px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", borderBottom: "1px solid var(--void-border)" }}>Bond</th>
                    <th style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", borderBottom: "1px solid var(--void-border)" }}>Status</th>
                    <th style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", borderBottom: "1px solid var(--void-border)" }}>Raised</th>
                    <th style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", borderBottom: "1px solid var(--void-border)", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myCreatedBonds.map((b) => (
                    <tr key={b.bondContract} style={{ transition: "background 0.15s" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--void-surface)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "11px 22px" }}>
                        <Link href={`/bonds/${b.bondContract}`} style={{ textDecoration: "none" }}>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>{b.name}</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)" }}>${b.symbol}</div>
                        </Link>
                      </td>
                      <td style={{ padding: "11px 12px" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: STATE_COLOR[b.state] ?? "var(--text-dim)", background: `color-mix(in srgb, ${STATE_COLOR[b.state] ?? "var(--text-dim)"} 12%, transparent)`, padding: "3px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {STATE_LABEL[b.state] ?? "—"}
                        </span>
                      </td>
                      <td style={{ padding: "11px 12px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
                        {b.totalRaised.toFixed(2)} ℏ
                      </td>
                      <td style={{ padding: "11px 12px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <Link href={`/bonds/${b.bondContract}`} style={{ textDecoration: "none" }}>
                            <span className="btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }}>Manage</span>
                          </Link>
                          {b.state === 1 && (
                            <Link href={`/pro`} style={{ textDecoration: "none" }}>
                              <span className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }}>Pool</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {myCreatedBonds.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-body)", fontSize: 14 }}>
                        You haven&apos;t created any bonds yet.
                        <div style={{ marginTop: 12 }}>
                          <Link href="/create" style={{ textDecoration: "none" }}>
                            <span className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>Create Bond</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Identity / Wallet Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="glass-card" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -80, right: -80, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.07), transparent 70%)", pointerEvents: "none" }} />
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--acid)", boxShadow: "0 0 0 3px rgba(16,185,129,0.2)", animation: "pulse-glow 1.6s infinite", flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
                  {wallet.accountId}
                </span>
              </div>
            </div>

            <div style={{ background: "var(--void-surface)", border: "1px solid var(--void-border)", borderRadius: "var(--radius-md)", padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                HBAR Balance
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {balance}
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  style={{ background: "var(--void-elevated)", border: "1px solid var(--void-border)", borderRadius: 6, color: "var(--text-secondary)", cursor: refreshing ? "not-allowed" : "pointer", padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: "var(--font-body)", fontWeight: 600, transition: "all 0.2s", opacity: refreshing ? 0.5 : 1 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: refreshing ? "spin-icon 0.8s linear infinite" : "none" }}>
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  {refreshing ? "..." : "Refresh"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <CopyField label="Hedera Account ID" value={wallet.accountId ?? ""} />
              {wallet.evmAddress && <CopyField label="EVM Address" value={wallet.evmAddress} />}
            </div>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--void-border)" }}>
              <button
                className="btn-secondary"
                onClick={() => void wallet.disconnect()}
                style={{ width: "100%", color: "var(--magenta)", borderColor: "rgba(244,63,94,0.3)", padding: "10px", fontSize: 13, background: "rgba(244,63,94,0.05)" }}
              >
                Disconnect wallet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
