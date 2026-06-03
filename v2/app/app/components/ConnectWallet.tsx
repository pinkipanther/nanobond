"use client";

import { useState } from "react";
import { HEDERA_NETWORK } from "../lib/contracts";
import { tinybarsToHbar, useWallet } from "../lib/wallet";

function shortValue(value: string) {
  return value.length > 14 ? `${value.slice(0, 7)}...${value.slice(-5)}` : value;
}

async function copyTextSafe(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function WalletLogo({ size = 18 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: "linear-gradient(135deg, #3b2085, #6b4aff)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ color: "white", fontSize: size * 0.55, fontWeight: 800 }}>H</span>
    </div>
  );
}

function walletStatusLabel(status: string) {
  if (status === "initializing") return "Starting";
  if (status === "pairing") return "Pairing";
  if (status === "wrong-network") return "Wrong network";
  if (status === "error") return "Needs attention";
  return "Ready";
}

function WalletRows({ compact = false }: { compact?: boolean }) {
  const wallet = useWallet();
  return (
    <div className={compact ? "wallet-status-rows compact" : "wallet-status-rows"}>
      <div className="wallet-status-row">
        <span>Network</span>
        <strong>Hedera {HEDERA_NETWORK}</strong>
      </div>
      <div className="wallet-status-row">
        <span>Native account</span>
        <strong>{wallet.accountId ? shortValue(wallet.accountId) : wallet.evmAddress ? "EVM signing" : "Not connected"}</strong>
      </div>
      <div className="wallet-status-row">
        <span>Balance</span>
        <strong>{wallet.accountId ? `${tinybarsToHbar(wallet.balanceTinybar)} HBAR` : "-"}</strong>
      </div>
      {wallet.evmAddress && (
        <div className="wallet-status-row">
          <span>EVM alias</span>
          <strong>{shortValue(wallet.evmAddress)}</strong>
        </div>
      )}
    </div>
  );
}

export function WalletReadinessPanel({ factoryConfigured = true }: { factoryConfigured?: boolean }) {
  const wallet = useWallet();
  const ready = Boolean((wallet.accountId || wallet.evmAddress) && factoryConfigured && !wallet.pendingTx);
  const isEvmOnly = Boolean(wallet.evmAddress && !wallet.accountId);

  return (
    <div className={ready ? "wallet-action-card ready" : "wallet-action-card"}>
      <div className="wallet-action-head">
        <div>
          <div className="wallet-action-title">Wallet</div>
          <div className="wallet-action-subtitle">
            {ready
              ? isEvmOnly
                ? "Ready to create bonds with Hedera EVM signing."
                : "Ready to sign Hedera transactions."
              : wallet.pendingTx
                ? wallet.pendingTx
                : !factoryConfigured
                    ? "Factory address is not configured."
                    : "Connect before deploying."}
          </div>
        </div>
        <span className={ready ? "wallet-state-pill ready" : "wallet-state-pill"}>
          {ready ? "Ready" : walletStatusLabel(wallet.status)}
        </span>
      </div>
      <WalletRows />
      {wallet.error && <div className="wallet-inline-error">{wallet.error}</div>}
      <div className="wallet-action-buttons">
        {!wallet.accountId && !wallet.evmAddress ? (
          <button className="wallet-connect-btn-v2" onClick={() => void wallet.connect()} disabled={wallet.isPairing} type="button">
            <WalletLogo />
            <span>{wallet.isPairing ? "Pairing..." : "Connect Wallet"}</span>
          </button>
        ) : (
          <>
            <button className="btn-secondary" type="button" onClick={() => void wallet.refreshBalance()} disabled={Boolean(wallet.pendingTx)}>
              Refresh
            </button>
            <button className="btn-secondary" type="button" onClick={() => void wallet.disconnect()} disabled={Boolean(wallet.pendingTx)}>
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ConnectWalletButton() {
  const wallet = useWallet();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (wallet.isConnected) {
    return (
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setDropdownOpen((value) => !value)}
          className={wallet.accountId ? "wallet-connected-btn" : "wallet-connected-btn evm-connected"}
          type="button"
        >
          <span className="wallet-live-dot" />
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
            {wallet.accountId ? shortValue(wallet.accountId) : shortValue(wallet.evmAddress ?? "")}
          </span>
          <span style={{ opacity: 0.65, fontSize: 11 }}>{dropdownOpen ? "▲" : "▼"}</span>
        </button>

        {dropdownOpen && (
          <div
            className="wallet-dropdown-menu"
            style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 1000 }}
          >
            <div className="wallet-dropdown-head">
              <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Hedera {HEDERA_NETWORK}
              </div>
              <div style={{ fontSize: 13, marginTop: 4, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                {wallet.accountId ?? shortValue(wallet.evmAddress ?? "")}
              </div>
              <div style={{ fontSize: 12, marginTop: 8, color: "var(--cyan)" }}>
                {wallet.accountId ? `${tinybarsToHbar(wallet.balanceTinybar)} HBAR` : "EVM signing"}
              </div>
            </div>
            {wallet.error && <div className="wallet-inline-error">{wallet.error}</div>}

            <button
              className="wallet-dropdown-item"
              type="button"
              onClick={async () => {
                const ok = await copyTextSafe(wallet.evmAddress ?? wallet.accountId ?? "");
                setCopied(ok);
                window.setTimeout(() => setCopied(false), 1200);
              }}
            >
              {copied ? "Copied" : "Copy Address"}
            </button>
            <button className="wallet-dropdown-item" type="button" onClick={() => void wallet.refreshBalance()} disabled={!wallet.accountId}>
              Refresh Balance
            </button>

            <button
              className="wallet-dropdown-item"
              style={{ color: "var(--magenta)" }}
              type="button"
              onClick={() => {
                void wallet.disconnect();
                setDropdownOpen(false);
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      className="wallet-connect-btn-v2"
      onClick={() => void wallet.connect()}
      disabled={wallet.isPairing}
      type="button"
      title={wallet.error ?? undefined}
    >
      <WalletLogo />
      <span>{wallet.status === "wrong-network" ? "Wrong network" : wallet.isPairing ? "Pairing..." : "Connect Wallet"}</span>
    </button>
  );
}

export function ConnectWalletInline({ label = "Connect Wallet" }: { label?: string }) {
  const wallet = useWallet();
  if (wallet.isConnected) return null;
  return (
    <div style={{ width: "100%", display: "grid", gap: 8 }}>
      <button
        className="wallet-connect-btn-v2"
        style={{ width: "100%", padding: "14px 16px" }}
        onClick={() => void wallet.connect()}
        disabled={wallet.isPairing}
        type="button"
      >
        <WalletLogo />
        <span>{wallet.status === "wrong-network" ? "Wrong network" : wallet.isPairing ? "Pairing..." : label}</span>
      </button>
      {wallet.error && (
        <div style={{ fontSize: 12, color: "var(--magenta)", textAlign: "center" }}>{wallet.error}</div>
      )}
    </div>
  );
}
