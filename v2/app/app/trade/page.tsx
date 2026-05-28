"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { CONTRACTS, CURVE_ABI, HBAR_DECIMALS, isConfiguredAddress, isEvmAddress } from "../lib/contracts";
import { curveBuyTransaction, curveSellTransaction, parseHbar } from "../lib/contractActions";
import { publicClient } from "../lib/hooks";
import { tinybarsToHbar, useWallet } from "../lib/wallet";

type CurveState = {
  owner: string;
  supply: bigint;
  price: bigint;
  basePrice: bigint;
  growthRateBP: bigint;
  stepSize: bigint;
  active: boolean;
  token: string;
};

export default function TradePage() {
  const wallet = useWallet();
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [curve, setCurve] = useState<CurveState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadCurve = async () => {
    if (!isConfiguredAddress(CONTRACTS.CURVE) || !isEvmAddress(CONTRACTS.CURVE)) return;
    setIsLoading(true);
    try {
      const [owner, supply, basePrice, growthRateBP, stepSize, active, token] = await Promise.all([
        publicClient.readContract({ address: CONTRACTS.CURVE, abi: CURVE_ABI, functionName: "owner" }) as Promise<string>,
        publicClient.readContract({ address: CONTRACTS.CURVE, abi: CURVE_ABI, functionName: "internalTotalSupply" }) as Promise<bigint>,
        publicClient.readContract({ address: CONTRACTS.CURVE, abi: CURVE_ABI, functionName: "basePrice" }) as Promise<bigint>,
        publicClient.readContract({ address: CONTRACTS.CURVE, abi: CURVE_ABI, functionName: "growthRateBP" }) as Promise<bigint>,
        publicClient.readContract({ address: CONTRACTS.CURVE, abi: CURVE_ABI, functionName: "stepSize" }) as Promise<bigint>,
        publicClient.readContract({ address: CONTRACTS.CURVE, abi: CURVE_ABI, functionName: "curveActive" }) as Promise<boolean>,
        publicClient.readContract({ address: CONTRACTS.CURVE, abi: CURVE_ABI, functionName: "token" }) as Promise<string>,
      ]);
      const price = (await publicClient.readContract({ address: CONTRACTS.CURVE, abi: CURVE_ABI, functionName: "currentPrice", args: [supply] })) as bigint;
      setCurve({ owner, supply, price, basePrice, growthRateBP, stepSize, active, token });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load curve");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCurve();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleTrade = async () => {
    setError(null);
    if (!wallet.isConnected) {
      await wallet.connect();
      return;
    }
    if (!isConfiguredAddress(CONTRACTS.CURVE)) {
      setError("Set NEXT_PUBLIC_NANOBOND_CURVE_ADDRESS to enable V2 trading.");
      return;
    }
    try {
      const tx = activeTab === "buy" ? curveBuyTransaction(CONTRACTS.CURVE, amount) : curveSellTransaction(CONTRACTS.CURVE, amount);
      await wallet.sendTx(tx, { description: activeTab === "buy" ? "Buy NANO" : "Sell NANO" });
      setAmount("");
      await loadCurve();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trade failed");
    }
  };

  const balanceTooLow = activeTab === "buy" && amount ? parseHbar(amount) > (wallet.balanceTinybar ?? 0n) : false;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>NanoBond V2 Trade</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>WalletConnect-powered testnet trading for the bonding curve token.</p>
        </div>
        <button className="btn-secondary" onClick={() => void loadCurve()} disabled={isLoading}>Refresh</button>
      </div>

      {!isConfiguredAddress(CONTRACTS.CURVE) && <div className="glass-card" style={{ padding: 24, marginBottom: 24, color: "var(--gold)" }}>Set NEXT_PUBLIC_NANOBOND_CURVE_ADDRESS to enable this screen.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        <section className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)", marginBottom: 18 }}>Curve Stats</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <Stat label="Current Price" value={curve ? `${formatUnits(curve.price, HBAR_DECIMALS)} HBAR` : "-"} />
            <Stat label="Supply" value={curve ? formatUnits(curve.supply, 8) : "-"} />
            <Stat label="Base Price" value={curve ? `${formatUnits(curve.basePrice, HBAR_DECIMALS)} HBAR` : "-"} />
            <Stat label="Growth" value={curve ? `${Number(curve.growthRateBP) / 100}%` : "-"} />
            <Stat label="Status" value={curve?.active ? "Active" : "Inactive"} />
            <Stat label="Wallet HBAR" value={`${tinybarsToHbar(wallet.balanceTinybar)} HBAR`} />
          </div>
          {curve && <div style={{ marginTop: 20, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)", wordBreak: "break-all" }}>Curve: {CONTRACTS.CURVE}<br />Token: {curve.token}<br />Owner: {curve.owner}</div>}
        </section>

        <section className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            <button className={activeTab === "buy" ? "btn-primary" : "btn-secondary"} onClick={() => setActiveTab("buy")}>Buy</button>
            <button className={activeTab === "sell" ? "btn-primary" : "btn-secondary"} onClick={() => setActiveTab("sell")}>Sell</button>
          </div>
          <label style={{ display: "grid", gap: 8, color: "var(--text-secondary)", fontSize: 13 }}>
            {activeTab === "buy" ? "HBAR Amount" : "Token Amount"}
            <input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0" step="0.0001" placeholder="0.0" style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid var(--void-border)", background: "var(--void-surface)", color: "var(--text-primary)", fontSize: 16 }} />
          </label>
          <button className="btn-primary" onClick={handleTrade} disabled={!amount || !!wallet.pendingTx || balanceTooLow} style={{ width: "100%", marginTop: 16 }}>
            {wallet.pendingTx ?? (wallet.isConnected ? balanceTooLow ? "Insufficient HBAR" : activeTab === "buy" ? "Buy" : "Sell" : "Connect Wallet")}
          </button>
          {(error || wallet.error) && <div style={{ color: "var(--magenta)", marginTop: 12, fontSize: 12 }}>{error || wallet.error}</div>}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div style={{ padding: 16, background: "var(--void-surface)", border: "1px solid var(--void-border)", borderRadius: 8 }}><div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{label}</div><div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)", wordBreak: "break-word" }}>{value}</div></div>;
}
