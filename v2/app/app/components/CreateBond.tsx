"use client";

import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { encodeFunctionData } from "viem";
import { CONTRACTS, FACTORY_ABI, isConfiguredAddress, isEvmAddress } from "../lib/contracts";
import { createBondTransaction, parseHbar, parseTokenAmount } from "../lib/contractActions";
import { useWallet } from "../lib/wallet";
import { WalletReadinessPanel } from "./ConnectWallet";
import BondCard from "./BondCard";
import type { BondCardData } from "../lib/hooks";

interface CreateBondProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const STEP_LABELS = ["Identity", "Supply", "Raise", "Yield", "Review"];

export default function CreateBond({ onClose, onSuccess }: CreateBondProps) {
  const wallet = useWallet();
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    totalSupply: "",
    hardCap: "",
    softCap: "",
    duration: "",
    yieldRate: "",
    epochDuration: "",
  });

  // Clear any stale wallet errors when the wizard mounts
  useEffect(() => {
    wallet.clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDeploy = async () => {
    setLocalError(null);
    wallet.clearError();
    if (!wallet.accountId && !wallet.evmAddress) {
      await wallet.connect();
      return;
    }
    if (!isConfiguredAddress(CONTRACTS.FACTORY)) {
      setLocalError("Set NEXT_PUBLIC_NANOBOND_FACTORY_ADDRESS to a V2 testnet factory address.");
      return;
    }

    try {
      const createBondArgs = {
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        totalSupply: parseTokenAmount(formData.totalSupply),
        hardCapTinybar: parseHbar(formData.hardCap),
        softCapTinybar: parseHbar(formData.softCap),
        raiseDurationSeconds: BigInt(Math.floor(parseFloat(formData.duration || "0") * 86400)),
        yieldRateBps: BigInt(Math.floor(parseFloat(formData.yieldRate || "0") * 100)),
        epochDurationSeconds: BigInt(Math.floor(parseFloat(formData.epochDuration || "0") * 3600)),
      };

      if (wallet.evmAddress && isEvmAddress(CONTRACTS.FACTORY)) {
        const data = encodeFunctionData({
          abi: FACTORY_ABI,
          functionName: "createBond",
          args: [
            createBondArgs.name,
            createBondArgs.symbol,
            createBondArgs.description,
            createBondArgs.totalSupply,
            createBondArgs.hardCapTinybar,
            createBondArgs.softCapTinybar,
            createBondArgs.raiseDurationSeconds,
            createBondArgs.yieldRateBps,
            createBondArgs.epochDurationSeconds,
          ],
        });
        await wallet.sendEvmTx({
          to: CONTRACTS.FACTORY,
          data,
          description: "Create bond",
        });
        setIsSuccess(true);
        return;
      }

      const yieldBps = BigInt(Math.floor(parseFloat(formData.yieldRate || "0") * 100));
      const epochSec = BigInt(Math.floor(parseFloat(formData.epochDuration || "0") * 3600));
      const tx = createBondTransaction(CONTRACTS.FACTORY, {
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        totalSupply: parseTokenAmount(formData.totalSupply),
        hardCapTinybar: parseHbar(formData.hardCap),
        softCapTinybar: parseHbar(formData.softCap),
        raiseDurationSeconds: BigInt(Math.floor(parseFloat(formData.duration || "0") * 86400)),
        yieldRateBps: yieldBps,
        epochDurationSeconds: epochSec,
      });
      await wallet.sendTx(tx, { description: "Create bond" });
      setIsSuccess(true);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Bond deployment failed");
    }
  };

  const isValid = () => {
    const { name, symbol, totalSupply, hardCap, softCap, duration, yieldRate, epochDuration } = formData;
    if (step === 1) return name.length > 0 && symbol.length > 0;
    if (step === 2) return parseFloat(totalSupply) > 0;
    if (step === 3) return parseFloat(hardCap) > 0 && parseFloat(softCap) > 0 && parseFloat(softCap) <= parseFloat(hardCap) && parseFloat(duration) > 0;
    if (step === 4) return parseFloat(yieldRate) > 0 && parseFloat(yieldRate) <= 500 && parseFloat(epochDuration) >= 1;
    return true;
  };

  const previewBond = useMemo((): BondCardData | null => {
    const n = formData.name || "Bond Name";
    const s = formData.symbol || "BOND";
    const supply = parseFloat(formData.totalSupply) || 100000;
    const hard = parseFloat(formData.hardCap) || 100;
    const soft = parseFloat(formData.softCap) || 20;
    const yRate = parseFloat(formData.yieldRate) || 15;
    const dur = parseFloat(formData.duration) || 30;
    return {
      id: 0,
      bondContract: "",
      name: n,
      symbol: s,
      description: formData.description || "Bond description will appear here.",
      totalSupply: supply,
      hardCap: hard,
      softCap: soft,
      totalRaised: 0,
      timeRemaining: dur * 86400,
      state: 0,
      tokenAddress: "",
      creator: "",
      yieldRateBps: Math.round(yRate * 100),
      epochDuration: (parseFloat(formData.epochDuration) || 24) * 3600,
      totalYieldMinted: 0,
      totalStaked: 0,
      contributors: 0,
    };
  }, [formData]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  const nav = (dir: number) => {
    // Clear stale errors whenever the user moves between steps
    setLocalError(null);
    wallet.clearError();
    setStep((s) => s + dir);
  };
  const isPending = !!wallet.pendingTx;
  const isCompleted = (s: number) => step > s;
  const isActive = (s: number) => step === s;
  const factoryConfigured = isConfiguredAddress(CONTRACTS.FACTORY);
  const walletCanDeploy = Boolean(wallet.evmAddress || wallet.accountId);
  const deployLabel = !factoryConfigured
    ? "Factory Not Configured"
    : !walletCanDeploy
      ? wallet.isPairing
        ? "Pairing..."
        : "Connect Wallet"
      : "Deploy Bond";

  /** Translate raw wallet errors into user-friendly messages. */
  function friendlyError(raw: string): string {
    const r = raw.toLowerCase();
    if (r.includes("session expired") || r.includes("reconnect"))
      return raw; // already friendly from wallet.tsx recovery
    if (r.includes("list is locked") || r.includes("no matching key"))
      return "Wallet session expired. Reconnect your wallet and approve the pairing again.";
    if (r.includes("wallet is locked"))
      return "Your wallet is locked. Unlock it and try again.";
    if (r.includes("user rejected") || r.includes("user cancelled") || r.includes("rejected by user"))
      return "Transaction was rejected in your wallet.";
    if (r.includes("set next_public_nanobond_factory_address"))
      return "Factory contract address is not configured. Set NEXT_PUBLIC_NANOBOND_FACTORY_ADDRESS in .env.local.";
    if (r.includes("insufficient") || r.includes("not enough"))
      return "Insufficient HBAR balance to cover this transaction.";
    if (r.includes("gas") || r.includes("out of gas"))
      return "Transaction ran out of gas. The contract call may have reverted.";
    return raw.length > 160 ? raw.slice(0, 160) + "…" : raw;
  }

  if (isSuccess) {
    return (
      <div className="create-bond-overlay">
        <div className="create-bond-card" style={{ maxWidth: 520 }}>
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px",
              background: "var(--acid-dim)", border: "2px solid var(--acid)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--acid)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Bond Created</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: "0 0 4px" }}>
              <strong>{formData.name}</strong> submitted to Hedera testnet
            </p>
            <p style={{ color: "var(--text-dim)", fontSize: 12, fontFamily: "var(--font-mono)", wordBreak: "break-all", margin: "0 0 24px" }}>
              TX: {wallet.lastTxId?.slice(0, 40) ?? "pending confirmation"}
            </p>
            <div className="bond-summary" style={{ textAlign: "left", marginBottom: 24 }}>
              <div className="summary-row"><span>Yield Rate</span><span>{formData.yieldRate}% APR</span></div>
              <div className="summary-row"><span>Hard Cap</span><span>{formData.hardCap} HBAR</span></div>
              <div className="summary-row"><span>Duration</span><span>{formData.duration} days</span></div>
              <div className="summary-row"><span>Epoch</span><span>Every {formData.epochDuration}h</span></div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => { onSuccess?.(); onClose(); }}>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-bond-overlay">
      <div className="create-bond-split">
        <div className="create-bond-form">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                Create a Bond
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                Configure your tokenized bond raise
              </p>
            </div>
            <button className="close-btn" onClick={onClose} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="step-label-indicator">
            <div className="step-track">
              {STEP_LABELS.map((label, i) => {
                const s = i + 1;
                return (
                  <div
                    key={i}
                    className={`step-segment ${isCompleted(s) ? "completed" : isActive(s) ? "active" : ""}`}
                    onClick={() => s < step && nav(-(step - s))}
                    style={{ cursor: s < step ? "pointer" : "default" }}
                  />
                );
              })}
            </div>
            <div className="step-labels">
              {STEP_LABELS.map((label, i) => {
                const s = i + 1;
                return (
                  <span
                    key={i}
                    className={`step-label ${isCompleted(s) ? "completed" : isActive(s) ? "active" : ""}`}
                    onClick={() => s < step && nav(-(step - s))}
                    style={{ cursor: s < step ? "pointer" : "default" }}
                  >
                    {isCompleted(s) ? "✓ " : ""}{label}
                  </span>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait" custom={step}>
            <motion.div
              key={step}
              custom={step}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {step === 1 && (
                <div className="step-content">
                  <h3>Bond Identity</h3>
                  <label>
                    <span>Bond Name</span>
                    <input type="text" value={formData.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. DeFi Infrastructure Bond" />
                    <span className="hint">Display name for your bond offering.</span>
                  </label>
                  <label>
                    <span>Symbol</span>
                    <input type="text" value={formData.symbol} onChange={(e) => updateField("symbol", e.target.value.toUpperCase())} maxLength={8} placeholder="e.g. DIB" />
                    <span className="hint">Short ticker, max 8 characters.</span>
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea value={formData.description} onChange={(e) => updateField("description", e.target.value)} rows={3} placeholder="Describe your project, use of funds, and value to bond holders." />
                  </label>
                </div>
              )}

              {step === 2 && (
                <div className="step-content">
                  <h3>Token Supply</h3>
                  <label>
                    <span>Total Supply</span>
                    <input type="number" value={formData.totalSupply} onChange={(e) => updateField("totalSupply", e.target.value)} placeholder="e.g. 100000" min="1" />
                    <span className="hint">95% distributed to bond buyers, 5% reserved for you as creator.</span>
                  </label>
                </div>
              )}

              {step === 3 && (
                <div className="step-content">
                  <h3>Raise Configuration</h3>
                  <div className="input-row">
                    <label>
                      <span>Hard Cap (HBAR)</span>
                      <input type="number" value={formData.hardCap} onChange={(e) => updateField("hardCap", e.target.value)} placeholder="e.g. 100" min="0.1" step="0.1" />
                    </label>
                    <label>
                      <span>Soft Cap (HBAR)</span>
                      <input type="number" value={formData.softCap} onChange={(e) => updateField("softCap", e.target.value)} placeholder="e.g. 20" min="0.1" step="0.1" />
                    </label>
                  </div>
                  <label>
                    <span>Raise Duration (days)</span>
                    <input type="number" value={formData.duration} onChange={(e) => updateField("duration", e.target.value)} placeholder="e.g. 30" min="1" />
                    <span className="hint">After this period ends, the bond activates (if soft cap met) or fails.</span>
                  </label>
                </div>
              )}

              {step === 4 && (
                <div className="step-content">
                  <h3>Yield Configuration</h3>
                  <label>
                    <span>Annual Yield Rate (%)</span>
                    <input type="number" value={formData.yieldRate} onChange={(e) => updateField("yieldRate", e.target.value)} step="0.1" min="0.1" max="500" placeholder="e.g. 15" />
                    <span className="hint">Yield is paid in bond tokens. Max 500% APR.</span>
                  </label>
                  <label>
                    <span>Epoch Duration (hours)</span>
                    <input type="number" value={formData.epochDuration} onChange={(e) => updateField("epochDuration", e.target.value)} min="1" placeholder="e.g. 24" />
                    <span className="hint">How often yield is distributed. Min 1 hour.</span>
                  </label>
                </div>
              )}

              {step === 5 && (
                <div className="step-content">
                  <h3>Review &amp; Deploy</h3>
                  <WalletReadinessPanel factoryConfigured={factoryConfigured} />
                  <div className="bond-summary">
                    <div className="summary-row"><span>Name</span><span>{formData.name} ({formData.symbol})</span></div>
                    <div className="summary-row"><span>Supply</span><span>{Number(formData.totalSupply).toLocaleString()} tokens</span></div>
                    <div className="summary-row"><span>Hard Cap</span><span>{Number(formData.hardCap).toLocaleString()} HBAR</span></div>
                    <div className="summary-row"><span>Soft Cap</span><span>{Number(formData.softCap).toLocaleString()} HBAR</span></div>
                    <div className="summary-row"><span>Duration</span><span>{formData.duration} days</span></div>
                    <div className="summary-row highlight"><span>Yield Rate</span><span>{formData.yieldRate}% APR</span></div>
                    <div className="summary-row"><span>Epoch</span><span>Every {formData.epochDuration}h</span></div>
                  </div>
                  {formData.description && (
                    <div className="description-preview">
                      <span>Description</span>
                      <p>{formData.description}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {(localError || wallet.error) && (
            <div className="error-box">
              <span>{friendlyError(localError || wallet.error || "Unknown error")}</span>
              <button onClick={() => { setLocalError(null); wallet.clearError(); }} className="retry-link">Dismiss</button>
            </div>
          )}

          <div className="step-nav">
            {step > 1 && (
              <button className="btn-secondary" onClick={() => nav(-1)} disabled={isPending}>
                Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            {step < 5 ? (
              <button className="btn-primary" onClick={() => nav(1)} disabled={!isValid()}>
                Next
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={walletCanDeploy ? handleDeploy : () => void wallet.connect()}
                disabled={isPending || !factoryConfigured || wallet.isPairing}
              >
                {isPending ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      style={{ animation: "spin-icon 0.8s linear infinite", flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Submitting…
                  </span>
                ) : deployLabel}
              </button>
            )}
          </div>
        </div>

        <div className="create-bond-preview">
          <div className="preview-label">Live Preview</div>
          {previewBond && (
            <div style={{ pointerEvents: "none" }}>
              <BondCard bond={previewBond} />
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <div className="glass-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Summary</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <MetricRow label="Supply" value={formData.totalSupply || "—"} unit="tokens" />
                <MetricRow label="Hard Cap" value={formData.hardCap || "—"} unit="HBAR" />
                <MetricRow label="Yield" value={formData.yieldRate || "—"} unit="% APR" />
                <MetricRow label="Epoch" value={formData.epochDuration || "—"} unit="hours" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
        {value} <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>{unit}</span>
      </span>
    </div>
  );
}
