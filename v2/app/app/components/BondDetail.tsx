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

  const sectionStyle = { padding: 24, marginBottom: 16 };
  const balanceTooLow = contributeAmt ? parseHbar(contributeAmt) > (wallet.balanceTinybar ?? 0n) : false;

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 14, marginBottom: 24, padding: 0 }}>
        Back to Bonds
      </button>

      <div className="glass-card" style={{ ...sectionStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>{name}</h1>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-dim)" }}>${symbol}</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ background: "linear-gradient(135deg, #3fb950, #2ea043)", color: "var(--inverted)", fontSize: 18, fontWeight: 800, padding: "8px 20px", borderRadius: 10, fontFamily: "var(--font-display)" }}>{apr}% APR</div>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8, color: state === 1 ? "#58a6ff" : state === 0 ? "#3fb950" : "#f85149", background: state === 1 ? "rgba(88,166,255,0.12)" : state === 0 ? "rgba(63,185,80,0.12)" : "rgba(248,81,73,0.12)", fontFamily: "var(--font-mono)" }}>{STATE_LABELS[state] || "UNKNOWN"}</span>
        </div>
      </div>

      {description && <div className="glass-card" style={sectionStyle}><h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-primary)", marginBottom: 8 }}>About</h3><p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{description}</p></div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div className="glass-card" style={sectionStyle}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-primary)", marginBottom: 16 }}>{state === 0 ? "Raise Progress" : "Raise Complete"}</h3>
            <div style={{ height: 8, borderRadius: 4, background: "rgba(34,51,47,0.5)", marginBottom: 8 }}><div style={{ width: `${Math.min(100, progress)}%`, height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #6366f1, #10b981)" }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}><span>{parseFloat(formatUnits(totalRaisedRaw, HBAR_DECIMALS)).toLocaleString()} HBAR raised</span><span>{progress.toFixed(1)}%</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              <Stat label="Hard Cap" value={`${parseFloat(formatUnits(hardCap, HBAR_DECIMALS)).toLocaleString()} HBAR`} />
              <Stat label="Soft Cap" value={`${parseFloat(formatUnits(softCap, HBAR_DECIMALS)).toLocaleString()} HBAR`} />
              <Stat label="Contributors" value={contributors.toString()} />
              <Stat label={state === 0 ? "Time Left" : "Epoch"} value={state === 0 ? formatTime(timeRemaining) : `Every ${Math.floor(epochDuration / 3600)}h`} />
            </div>
          </div>

          {state === 1 && (
            <div className="glass-card" style={sectionStyle}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-primary)", marginBottom: 16 }}>Holder Rewards</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Stat label="Token Supply" value={parseFloat(formatEther(totalSupply)).toLocaleString()} />
                <Stat label="Yield Minted" value={parseFloat(formatEther(totalYieldMinted)).toLocaleString()} color="#3fb950" />
                <Stat label="Next Epoch" value={nextEpoch === 0 ? "Ready" : formatTime(nextEpoch)} />
                <Stat label="HBAR Withdrawn" value={parseFloat(formatUnits(hbarWithdrawn, HBAR_DECIMALS)).toLocaleString()} />
              </div>
              {nextEpoch === 0 && <button className="btn-primary" onClick={() => send("Distribute yield", () => bondNoArgTransaction(bond.bondContract, "distributeYield"))} disabled={isPending} style={{ width: "100%", marginTop: 16 }}>Distribute Yield</button>}
            </div>
          )}
        </div>

        <div>
          {state === 0 && (
            <div className="glass-card" style={sectionStyle}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-primary)", marginBottom: 8 }}>Buy Bonds</h3>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>Balance: {tinybarsToHbar(wallet.balanceTinybar)} HBAR</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" placeholder="HBAR amount" value={contributeAmt} onChange={(e) => setContributeAmt(e.target.value)} style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid #1e2d45", background: "var(--void-surface)", color: "var(--text-primary)", fontSize: 14 }} />
                <button className="btn-primary" onClick={() => send("Contribute", () => contributeTransaction(bond.bondContract, contributeAmt))} disabled={isPending || !contributeAmt || isNaN(Number(contributeAmt)) || balanceTooLow}>{isPending ? "..." : balanceTooLow ? "Insufficient HBAR" : wallet.isConnected ? "Contribute" : "Connect"}</button>
              </div>
              {userContribution > 0n && <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>Your contribution: {parseFloat(formatUnits(userContribution, HBAR_DECIMALS)).toLocaleString()} HBAR</p>}
            </div>
          )}

          {state === 1 && userContribution > 0n && !userClaimed && <ActionCard title="Claim Your Bonds" body={`Claim transferable ERC-20 bond tokens. Holders receive distributed rewards at ${apr}% APR while they own the tokens.`} label="Claim Bond Tokens" pending={isPending} onClick={() => send("Claim bonds", () => bondNoArgTransaction(bond.bondContract, "claimBonds"))} />}

          {state === 1 && (userClaimed || userPendingYield > 0n) && (
            <div className="glass-card" style={sectionStyle}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-primary)", marginBottom: 16 }}>Your Position</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <Stat label="Bond Tokens" value={userClaimed ? "Claimed" : "Unclaimed"} />
                <Stat label="Pending Yield" value={parseFloat(formatEther(userPendingYield)).toLocaleString()} color="#3fb950" />
              </div>
              {userPendingYield > 0n && <button className="btn-primary" onClick={() => send("Claim yield", () => bondNoArgTransaction(bond.bondContract, "claimYield"))} disabled={isPending} style={{ width: "100%", marginBottom: 12 }}>Claim Yield</button>}
              <p style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>Rewards follow ERC-20 ownership. Use Nano Pro to buy, sell, or provide liquidity for the bond token.</p>
            </div>
          )}

          {(state === 3 || state === 4) && userContribution > 0n && <ActionCard title={state === 3 ? "Bond Failed" : "Bond Cancelled"} body={`Your contribution of ${parseFloat(formatUnits(userContribution, HBAR_DECIMALS)).toLocaleString()} HBAR is refundable.`} label="Claim Refund" pending={isPending} onClick={() => send("Claim refund", () => bondNoArgTransaction(bond.bondContract, "claimRefund"))} />}

          {isCreator && (
            <div className="glass-card" style={{ ...sectionStyle, borderColor: "rgba(99,102,241,0.45)", boxShadow: "0 8px 24px -12px rgba(7, 12, 20, 0.5)" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "#6366f1", marginBottom: 16 }}>Admin Panel</h3>
              {state === 0 && totalRaisedRaw >= softCap && <button className="btn-primary" onClick={() => send("Activate bond", () => bondNoArgTransaction(bond.bondContract, "activate"))} disabled={isPending} style={{ width: "100%", marginBottom: 8 }}>Activate Bond</button>}
              {state === 0 && <><button className="btn-secondary" onClick={() => send("Check state", () => bondNoArgTransaction(bond.bondContract, "checkState"))} disabled={isPending} style={{ width: "100%", marginBottom: 8 }}>Check State</button><button className="btn-secondary" onClick={() => send("Cancel bond", () => bondNoArgTransaction(bond.bondContract, "cancel"))} disabled={isPending} style={{ width: "100%", marginBottom: 8, color: "#f85149" }}>Cancel Bond</button></>}
              {state === 1 && withdrawableHbar > 0n && <div><p style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>Withdrawable: {parseFloat(formatUnits(withdrawableHbar, HBAR_DECIMALS)).toLocaleString()} HBAR</p><div style={{ display: "flex", gap: 8 }}><input type="number" placeholder="HBAR amount" value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #1e2d45", background: "var(--void-surface)", color: "var(--text-primary)", fontSize: 13 }} /><button className="btn-primary" onClick={() => send("Withdraw HBAR", () => withdrawHbarTransaction(bond.bondContract, withdrawAmt))} disabled={isPending || !withdrawAmt || parseHbar(withdrawAmt) > withdrawableHbar}>Withdraw</button></div></div>}
            </div>
          )}
        </div>
      </div>

      {(localError || wallet.error) && <div style={{ fontSize: 12, color: "var(--magenta)", marginTop: 8, padding: 8, background: "rgba(224, 71, 104, 0.12)", borderRadius: 6, wordBreak: "break-word" }}>{localError || wallet.error}</div>}

      {state === 1 && poolAddress && (
        <div style={{ marginTop: 16 }}>
          <PriceChart poolAddress={poolAddress} tokenSymbol={symbol} height={260} />
        </div>
      )}

      <div className="glass-card" style={{ ...sectionStyle, marginTop: 16 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-primary)", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Contributors ({contributors})</span>{isLoadingContributors && <span style={{ fontSize: 14, color: "var(--text-dim)" }}>Loading...</span>}</h3>
        {bondContributors.length > 0 ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{bondContributors.map((c, i) => <div key={c.address} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--void-surface)", borderRadius: 8, border: "1px solid var(--void-border)" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-dim)", width: 24 }}>#{i + 1}</div><div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-primary)" }}>{c.address.slice(0, 6)}...{c.address.slice(-4)}</div></div><div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--cyan)", fontWeight: 600 }}>{parseFloat(formatUnits(c.amount, HBAR_DECIMALS)).toLocaleString()} HBAR</div></div>)}</div> : <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-dim)", textAlign: "center", padding: "24px 0" }}>{isLoadingContributors ? "Fetching contributors..." : "No contributors yet."}</p>}
      </div>

      <div className="glass-card" style={{ ...sectionStyle, marginTop: 16, opacity: 0.7 }}><div style={{ display: "flex", gap: 32, fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-mono)", flexWrap: "wrap" }}><span>Bond: {bond.bondContract}</span><span>Token: {tokenAddr}</span><span>Supply: {parseFloat(formatEther(totalSupply)).toLocaleString()}</span></div></div>
    </div>
  );
}

function Stat({ label, value, color = "var(--text-primary)" }: { label: string; value: string; color?: string }) {
  return <div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>{label}</div><div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div></div>;
}

function ActionCard({ title, body, label, pending, onClick }: { title: string; body: string; label: string; pending: boolean; onClick: () => void }) {
  return <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}><h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-primary)", marginBottom: 8 }}>{title}</h3><p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>{body}</p><button className="btn-primary" onClick={onClick} disabled={pending} style={{ width: "100%" }}>{label}</button></div>;
}
