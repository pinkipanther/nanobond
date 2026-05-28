"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectWalletInline } from "../components/ConnectWallet";
import { HEDERA_NETWORK } from "../lib/contracts";
import { tinybarsToHbar, useWallet } from "../lib/wallet";

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
    } catch {
      /* ignore */
    }
  };
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          fontFamily: "var(--font-mono)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: "var(--void-surface)",
          border: "1px solid var(--void-border)",
          borderRadius: "var(--radius-md)",
          transition: "border-color 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--void-border)")}
      >
        <span
          style={{
            fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
            fontSize: 13,
            color: "var(--text-primary)",
            flex: 1,
            wordBreak: "break-all",
            lineHeight: 1.5,
          }}
        >
          {value || "—"}
        </span>
        {value && (
          <button
            onClick={handleCopy}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: copied ? "var(--acid)" : "var(--text-dim)",
              padding: 4,
              borderRadius: 4,
              flexShrink: 0,
              transition: "color 0.2s",
              display: "flex",
              alignItems: "center",
            }}
            title="Copy"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        )}
      </div>
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: active ? "var(--acid)" : "var(--text-dim)",
        boxShadow: active ? "0 0 0 3px rgba(16,185,129,0.2)" : "none",
        animation: active ? "pulse-glow 1.6s infinite" : "none",
        flexShrink: 0,
      }}
    />
  );
}

export default function ProfilePage() {
  const wallet = useWallet();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await wallet.refreshBalance();
    setRefreshing(false);
  };

  if (!wallet.isConnected) {
    return (
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}>
        <div
          style={{
            maxWidth: 440,
            margin: "0 auto",
          }}
        >
          {/* Not-connected card */}
          <div
            className="glass-card"
            style={{
              padding: 40,
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* background glow */}
            <div
              style={{
                position: "absolute",
                top: -60,
                left: "50%",
                transform: "translateX(-50%)",
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(167,139,250,0.2))",
                border: "1px solid rgba(99,102,241,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-4 0v2" />
                <circle cx="12" cy="14" r="2" />
              </svg>
            </div>

            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 800,
                color: "var(--text-primary)",
                marginBottom: 8,
                letterSpacing: "-0.02em",
              }}
            >
              Connect your wallet
            </h2>
            <p
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--text-secondary)",
                fontSize: 14,
                marginBottom: 28,
                lineHeight: 1.6,
              }}
            >
              Connect your wallet to view your account, balance, and transaction history on Hedera testnet.
            </p>
            <ConnectWalletInline />
          </div>
        </div>
      </div>
    );
  }

  const balance = tinybarsToHbar(wallet.balanceTinybar);
  const networkLabel = HEDERA_NETWORK === "mainnet" ? "Mainnet" : "Testnet";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "96px 24px 80px" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 6, height: 28, borderRadius: 3, background: "linear-gradient(180deg, #6366f1, #10b981)" }} />
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Profile
          </h1>
        </div>
        <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontSize: 14, marginLeft: 16 }}>
          Your connected wallet on Hedera {networkLabel}.
        </p>
      </div>

      {/* ── Identity card ── */}
      <div
        className="glass-card"
        style={{
          padding: 28,
          marginBottom: 20,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* subtle radial bg */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.07), transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Connected indicator + account ID header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusDot active />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
              {wallet.accountId}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                color: HEDERA_NETWORK === "mainnet" ? "var(--gold)" : "var(--cyan)",
                background:
                  HEDERA_NETWORK === "mainnet"
                    ? "rgba(245,158,11,0.12)"
                    : "rgba(99,102,241,0.12)",
                border:
                  HEDERA_NETWORK === "mainnet"
                    ? "1px solid rgba(245,158,11,0.3)"
                    : "1px solid rgba(99,102,241,0.3)",
                padding: "4px 10px",
                borderRadius: 999,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              {networkLabel}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--acid)",
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.25)",
                padding: "4px 10px",
                borderRadius: 999,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              WalletConnect
            </span>
          </div>
        </div>

        {/* Balance hero */}
        <div
          style={{
            background: "var(--void-surface)",
            border: "1px solid var(--void-border)",
            borderRadius: "var(--radius-md)",
            padding: "20px 24px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
              HBAR Balance
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 32,
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {balance}
              <span style={{ fontSize: 16, color: "var(--text-dim)", fontWeight: 500, marginLeft: 8 }}>HBAR</span>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: "var(--void-elevated)",
              border: "1px solid var(--void-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-secondary)",
              cursor: refreshing ? "not-allowed" : "pointer",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              transition: "all 0.2s",
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ animation: refreshing ? "spin-icon 0.8s linear infinite" : "none" }}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Address fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <CopyField label="Hedera Account ID" value={wallet.accountId ?? ""} />
          {wallet.evmAddress && (
            <CopyField label="EVM Address" value={wallet.evmAddress} />
          )}
        </div>

        {/* Last TX */}
        {wallet.lastTxId && (
          <div style={{ marginTop: 16 }}>
            <CopyField label="Last Transaction ID" value={wallet.lastTxId} />
          </div>
        )}

        {/* Error */}
        {wallet.error && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              background: "var(--magenta-dim)",
              border: "1px solid rgba(244,63,94,0.3)",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              color: "var(--magenta)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span>{wallet.error}</span>
            <button
              onClick={wallet.clearError}
              style={{ background: "none", border: "none", color: "var(--magenta)", cursor: "pointer", fontWeight: 700, fontSize: 12, flexShrink: 0 }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* ── Quick links ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { href: "/bonds", label: "View Bonds", icon: "📋" },
          { href: "/create", label: "Create Bond", icon: "✦" },
          { href: "/portfolio", label: "Portfolio", icon: "📊" },
          { href: "/analytics", label: "Analytics", icon: "📈" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{ textDecoration: "none" }}
          >
            <div
              className="glass-card"
              style={{
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                transition: "border-color 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(99,102,241,0.4)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--void-border)";
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                {item.label}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Danger zone ── */}
      <div
        className="glass-card"
        style={{
          padding: "18px 22px",
          borderColor: "rgba(244,63,94,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
            Disconnect
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-dim)" }}>
            Remove this wallet session from the app.
          </div>
        </div>
        <button
          className="btn-secondary"
          onClick={() => void wallet.disconnect()}
          style={{
            color: "var(--magenta)",
            borderColor: "rgba(244,63,94,0.3)",
            padding: "8px 20px",
            fontSize: 13,
          }}
        >
          Disconnect wallet
        </button>
      </div>
    </div>
  );
}
