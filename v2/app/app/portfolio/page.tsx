"use client";

import Link from "next/link";
import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useBonds, type BondCardData } from "../lib/hooks";
import { useWallet } from "../lib/wallet";

export default function PortfolioPage() {
  const { bonds, isLoading } = useBonds();
  const wallet = useWallet();

  if (isLoading) {
    return <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}><div className="glass-card" style={{ padding: 60, textAlign: "center" }}><p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontWeight: 600 }}>Loading portfolio data...</p></div></div>;
  }

  return <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}><PortfolioContent bonds={bonds} walletAddress={wallet.evmAddress ?? wallet.accountId} isConnected={wallet.isConnected} /></div>;
}

function PortfolioContent({ bonds, walletAddress, isConnected }: { bonds: BondCardData[]; walletAddress: string | null; isConnected: boolean }) {
  const activeBonds = bonds.filter((b) => b.state === 1).length;
  const raisingBonds = bonds.filter((b) => b.state === 0).length;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !isConnected || !walletAddress) return;
    setStatus("loading");
    try {
      await addDoc(collection(db, "subscribers"), { email, walletAddress, timestamp: serverTimestamp(), source: "portfolio_manual_link_v2" });
      setStatus("success");
      setEmail("");
    } catch (error) {
      console.error("Firebase error: ", error);
      setStatus("error");
    }
  };

  const myCreatedBonds = isConnected && walletAddress
    ? bonds.filter((b) => b.creator.toLowerCase() === walletAddress.toLowerCase())
    : [];
  const otherBonds = isConnected && walletAddress
    ? bonds.filter((b) => b.creator.toLowerCase() !== walletAddress.toLowerCase())
    : bonds;

  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, marginBottom: 8, color: "var(--text-primary)" }}>Portfolio</h2>
      <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>Track bonds you have created, contributed to, and market analytics on V2 testnet.</p>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 32 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
          {[{ label: "Total Bonds", value: `${bonds.length}`, color: "var(--cyan)" }, { label: "Raising", value: `${raisingBonds}`, color: "var(--acid)" }, { label: "Active", value: `${activeBonds}`, color: "var(--magenta)" }].map((s) => <div key={s.label} className="glass-card" style={{ padding: 24, position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: s.color }} /><div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div><div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div></div>)}
        </div>
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Link Account</h3>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>Connect your email to receive V2 testnet updates.</p>
          {!isConnected ? <div style={{ padding: 12, background: "var(--void-elevated)", border: "1px solid var(--void-border)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--text-dim)", textAlign: "center" }}>Connect your wallet first.</div> : status === "success" ? <div style={{ padding: 16, background: "var(--acid-dim)", color: "var(--acid)", borderRadius: "var(--radius-md)", fontSize: 14, fontWeight: 600, border: "1px solid var(--acid)" }}>Email linked to {walletAddress?.slice(0, 8)}...</div> : <form onSubmit={handleLinkEmail} style={{ display: "flex", flexDirection: "column", gap: 12 }}><input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={status === "loading"} style={{ width: "100%", padding: "12px 14px", background: "var(--void-light)", border: "1px solid var(--void-border)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-mono)" }} /><button type="submit" className="btn-primary" disabled={status === "loading"} style={{ width: "100%", padding: 12, fontSize: 14, background: "var(--cyan)", color: "var(--void)" }}>{status === "loading" ? "Linking..." : "Connect Email"}</button>{status === "error" && <div style={{ fontSize: 12, color: "var(--magenta)", marginTop: 4 }}>Failed to link email.</div>}</form>}
        </div>
      </div>

      {myCreatedBonds.length > 0 && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 24, borderColor: "rgba(99,102,241,0.35)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--cyan)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z" />
            </svg>
            My Created Bonds ({myCreatedBonds.length})
          </h3>
          {myCreatedBonds.map((b, i) => <CreatorBondRow key={b.bondContract} bond={b} index={i} last={i === myCreatedBonds.length - 1} />)}
        </div>
      )}

      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {myCreatedBonds.length > 0 ? "Other Bonds" : "All Deployed Bonds"}
        </h3>
        {otherBonds.length === 0 ? <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-dim)" }}>No bonds found. Create one to get started.</p> : otherBonds.map((b, i) => <BondRow key={b.bondContract} bond={b} index={i} last={i === otherBonds.length - 1} />)}
      </div>
    </div>
  );
}

function CreatorBondRow({ bond, index, last }: { bond: BondCardData; index: number; last: boolean }) {
  const stateLabels = ["Raising", "Active", "Matured", "Failed", "Cancelled"];
  const stateColors = ["var(--acid)", "var(--cyan)", "var(--gold)", "var(--magenta)", "var(--text-dim)"];
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: !last ? "1px solid var(--void-border)" : "none" }}>
      <Link href={`/bonds/${bond.bondContract}`} style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)", width: 24 }}>#{index + 1}</div>
          <div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>
              {bond.name} <span style={{ color: stateColors[bond.state] || "var(--text-dim)" }}>${bond.symbol}</span>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>
              {stateLabels[bond.state] || "Unknown"} · {bond.totalRaised.toFixed(2)} HBAR raised
            </div>
          </div>
        </div>
      </Link>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Link href={`/bonds/${bond.bondContract}`} style={{ textDecoration: "none" }}>
          <span className="btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }}>Manage</span>
        </Link>
        {bond.state === 1 && (
          <Link href={`/pro`} style={{ textDecoration: "none" }}>
            <span className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }}>Pool</span>
          </Link>
        )}
      </div>
    </div>
  );
}

function BondRow({ bond, index, last }: { bond: BondCardData; index: number; last: boolean }) {
  const stateLabels = ["Raising", "Active", "Matured", "Failed", "Cancelled"];
  const stateColors = ["var(--acid)", "var(--cyan)", "var(--gold)", "var(--magenta)", "var(--text-dim)"];
  return <Link href={`/bonds/${bond.bondContract}`} style={{ textDecoration: "none", color: "inherit" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: !last ? "1px solid var(--void-border)" : "none", cursor: "pointer" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ fontFamily: "var(--font-mono)", color: "var(--text-dim)", width: 24 }}>#{index + 1}</div><div><div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>{bond.name} <span style={{ color: stateColors[bond.state] || "var(--text-dim)" }}>${bond.symbol}</span></div><div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>{stateLabels[bond.state] || "Unknown"} · {bond.totalRaised.toFixed(2)} HBAR raised</div></div></div><div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>{bond.contributors} backers</div></div></Link>;
}
