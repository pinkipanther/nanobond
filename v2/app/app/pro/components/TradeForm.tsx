"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { encodeFunctionData, formatUnits, parseUnits } from "viem";
import { parseTokenAmount } from "../../lib/contractActions";
import { CONTRACTS, HBAR_DECIMALS, TOKEN_DECIMALS, PRO_FACTORY_ABI, PRO_POOL_ABI, TOKEN_ABI } from "../../lib/contracts";
import { tinybarsToHbar, useWallet } from "../../lib/wallet";
import type { NanoProMarket } from "../lib/markets";

interface TradeFormProps {
  market: NanoProMarket | null;
  factoryConfigured: boolean;
  onRefresh: () => Promise<void>;
}

type Panel = "trade" | "liquidity";
type Side = "buy" | "sell";

function formatToken(value: bigint) {
  return Number(formatUnits(value, TOKEN_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

function formatPrice(value: bigint) {
  if (value === 0n) return "No pool price";
  return `${Number(formatUnits(value, HBAR_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 8,
  })} HBAR`;
}

export default function TradeForm({ market, factoryConfigured, onRefresh }: TradeFormProps) {
  const wallet = useWallet();
  const [panel, setPanel] = useState<Panel>("trade");
  const [side, setSide] = useState<Side>("buy");
  const [tradeAmount, setTradeAmount] = useState("");
  const [liquidityToken, setLiquidityToken] = useState("");
  const [liquidityHbar, setLiquidityHbar] = useState("");
  const [lpAmount, setLpAmount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isPending = !!wallet.pendingTx || !!busy;
  const tokenLabel = market?.symbol ?? "TOKEN";

  const estimated = useMemo(() => {
    if (!market || market.spotPrice === 0n || !tradeAmount) return null;
    const amount = Number(tradeAmount);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    if (side === "buy") return `Pool quote will be priced by reserve curve`;
    return `Spot value about ${(amount * Number(formatUnits(market.spotPrice, HBAR_DECIMALS))).toLocaleString(undefined, { maximumFractionDigits: 6 })} HBAR`;
  }, [market, side, tradeAmount]);

  const runTx = async (label: string, action: () => Promise<void>) => {
    setMessage(null);
    try {
      if (!wallet.isConnected) {
        setMessage("Please connect your wallet first.");
        return;
      }
      setBusy(label);
      await action();
      setMessage(`${label} submitted`);
      await onRefresh();
      await wallet.refreshBalance();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : `${label} failed`);
    } finally {
      setBusy(null);
    }
  };

  if (!market) {
    return (
      <div style={emptyStyle}>
        <div style={emptyTitleStyle}>Select a market</div>
        <div style={emptyBodyStyle}>Bond tokens appear here after creation. Trading unlocks after activation.</div>
      </div>
    );
  }

  const createPool = () =>
    runTx("Create pool", async () => {
      await wallet.sendEvmTx({
        to: CONTRACTS.PRO_FACTORY as `0x${string}`,
        data: encodeFunctionData({ abi: PRO_FACTORY_ABI, functionName: "createPool", args: [market.tokenAddress] }),
        description: "Create Nano Pro pool",
      });
    });

  const addLiquidity = () =>
    runTx("Add liquidity", async () => {
      if (!market.poolAddress) throw new Error("Create the pool before adding liquidity.");
      if (!liquidityToken || !liquidityHbar) throw new Error("Enter token and HBAR liquidity amounts.");
      // Approve tokens
      await wallet.sendEvmTx({
        to: market.tokenAddress,
        data: encodeFunctionData({ abi: TOKEN_ABI, functionName: "approve", args: [market.poolAddress, parseTokenAmount(liquidityToken)] }),
        description: "Approve bond tokens",
      });
      // Add liquidity with HBAR value
      await wallet.sendEvmTx({
        to: market.poolAddress,
        data: encodeFunctionData({ abi: PRO_POOL_ABI, functionName: "addLiquidity", args: [parseTokenAmount(liquidityToken), 1n] }),
        value: parseUnits(liquidityHbar || "0", 18),
        description: "Add Nano Pro liquidity",
      });
      setLiquidityToken("");
      setLiquidityHbar("");
    });

  const removeLiquidity = () =>
    runTx("Remove liquidity", async () => {
      if (!market.poolAddress) throw new Error("No pool exists for this token.");
      if (!lpAmount) throw new Error("Enter LP amount.");
      await wallet.sendEvmTx({
        to: market.poolAddress,
        data: encodeFunctionData({ abi: PRO_POOL_ABI, functionName: "removeLiquidity", args: [parseTokenAmount(lpAmount), 0n, 0n] }),
        description: "Remove Nano Pro liquidity",
      });
      setLpAmount("");
    });

  const trade = () =>
    runTx(side === "buy" ? "Buy bond token" : "Sell bond token", async () => {
      if (!market.poolAddress || !market.poolReady) throw new Error("Pool needs liquidity before trading.");
      if (!tradeAmount) throw new Error("Enter an amount.");

      if (side === "buy") {
        await wallet.sendEvmTx({
          to: market.poolAddress,
          data: encodeFunctionData({ abi: PRO_POOL_ABI, functionName: "buy", args: [0n] }),
          value: parseUnits(tradeAmount || "0", 18),
          description: `Buy ${tokenLabel}`,
        });
      } else {
        // Approve tokens first
        await wallet.sendEvmTx({
          to: market.tokenAddress,
          data: encodeFunctionData({ abi: TOKEN_ABI, functionName: "approve", args: [market.poolAddress, parseTokenAmount(tradeAmount)] }),
          description: "Approve bond tokens",
        });
        await wallet.sendEvmTx({
          to: market.poolAddress,
          data: encodeFunctionData({ abi: PRO_POOL_ABI, functionName: "sell", args: [parseTokenAmount(tradeAmount), 0n] }),
          description: `Sell ${tokenLabel}`,
        });
      }
      setTradeAmount("");
    });

  const claimRewards = () =>
    runTx("Claim rewards", async () => {
      await wallet.sendEvmTx({
        to: market.tokenAddress,
        data: encodeFunctionData({ abi: TOKEN_ABI, functionName: "claimRewards" }),
        description: "Claim bond token rewards",
      });
    });


  return (
    <div style={containerStyle}>
      <div style={tabsStyle}>
        {(["trade", "liquidity"] as const).map((nextPanel) => (
          <button
            key={nextPanel}
            onClick={() => setPanel(nextPanel)}
            style={{
              ...tabStyle,
              background: panel === nextPanel ? "#192133" : "transparent",
              color: panel === nextPanel ? "#e2e8f8" : "#7a8aaa",
            }}
          >
            {nextPanel}
          </button>
        ))}
      </div>

      <div style={bodyStyle}>
        <InfoRow label="Wallet HBAR" value={`${tinybarsToHbar(wallet.balanceTinybar)} HBAR`} />
        <InfoRow label={`${tokenLabel} balance`} value={formatToken(market.tokenBalance)} />
        <InfoRow label="Pool price" value={formatPrice(market.spotPrice)} />

        {!factoryConfigured && (
          <Notice tone="warn">Configure NEXT_PUBLIC_NANOPRO_FACTORY_ADDRESS to enable pool creation.</Notice>
        )}

        {market.state !== 1 && (
          <Notice tone="info">This bond is still raising. Activate it before creating pools, adding liquidity, or trading.</Notice>
        )}

        {factoryConfigured && !market.poolAddress && market.state === 1 && (
          <button className="btn-primary" onClick={createPool} disabled={isPending || !wallet.isConnected} style={fullButtonStyle}>
            {isPending ? busy ?? "Pending" : wallet.isPairing ? "Connecting..." : !wallet.isConnected ? "Connect Wallet First" : "Create Pool"}
          </button>
        )}

        {panel === "trade" && (
          <>
            <div style={segmentedStyle}>
              {(["buy", "sell"] as const).map((nextSide) => (
                <button
                  key={nextSide}
                  onClick={() => setSide(nextSide)}
                  style={{
                    ...sideButtonStyle,
                    background: side === nextSide ? (nextSide === "buy" ? "#10b981" : "#f43f5e") : "transparent",
                    color: side === nextSide ? "var(--inverted)" : nextSide === "buy" ? "#10b981" : "#f43f5e",
                  }}
                >
                  {nextSide}
                </button>
              ))}
            </div>

            <label style={fieldLabelStyle}>{side === "buy" ? "HBAR amount" : `${tokenLabel} amount`}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={tradeAmount}
              onChange={(event) => setTradeAmount(event.target.value)}
              placeholder="0.00"
              style={inputStyle}
            />
            {estimated && <div style={hintStyle}>{estimated}</div>}

            <button
              className="btn-primary"
              onClick={trade}
              disabled={isPending || market.state !== 1 || !market.poolReady || !tradeAmount || !wallet.isConnected}
              style={fullButtonStyle}
            >
              {isPending ? busy ?? "Pending" : wallet.isPairing ? "Connecting..." : !wallet.isConnected ? "Connect Wallet First" : `${side === "buy" ? "Buy" : "Sell"} ${tokenLabel}`}
            </button>
          </>
        )}

        {panel === "liquidity" && (
          <>
            <label style={fieldLabelStyle}>Token amount</label>
            <input
              type="number"
              min="0"
              step="any"
              value={liquidityToken}
              onChange={(event) => setLiquidityToken(event.target.value)}
              placeholder="0.00"
              style={inputStyle}
            />

            <label style={fieldLabelStyle}>HBAR amount</label>
            <input
              type="number"
              min="0"
              step="any"
              value={liquidityHbar}
              onChange={(event) => setLiquidityHbar(event.target.value)}
              placeholder="0.00"
              style={inputStyle}
            />

            <button
              className="btn-primary"
              onClick={addLiquidity}
              disabled={isPending || market.state !== 1 || !market.poolAddress || !liquidityToken || !liquidityHbar}
              style={fullButtonStyle}
            >
              {isPending ? busy ?? "Pending" : "Add Liquidity"}
            </button>

            <div style={dividerStyle} />
            <InfoRow label="Your LP" value={formatToken(market.lpBalance)} />
            <label style={fieldLabelStyle}>LP amount</label>
            <input
              type="number"
              min="0"
              step="any"
              value={lpAmount}
              onChange={(event) => setLpAmount(event.target.value)}
              placeholder="0.00"
              style={inputStyle}
            />
            <button
              className="btn-secondary"
              onClick={removeLiquidity}
              disabled={isPending || market.state !== 1 || market.lpBalance === 0n || !lpAmount}
              style={fullButtonStyle}
            >
              Remove Liquidity
            </button>
          </>
        )}

        <div style={dividerStyle} />
        <InfoRow label="Claimable rewards" value={formatToken(market.pendingReward)} />
        <button
          className="btn-secondary"
          onClick={claimRewards}
          disabled={isPending || market.state !== 1 || market.pendingReward === 0n}
          style={fullButtonStyle}
        >
          Claim Rewards
        </button>

        {message && <div style={messageStyle}>{message}</div>}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoRowStyle}>
      <span>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", color: "#e2e8f8" }}>{value}</span>
    </div>
  );
}

function Notice({ children, tone }: { children: ReactNode; tone: "warn" | "info" }) {
  return (
    <div
      style={{
        ...noticeStyle,
        color: tone === "warn" ? "#f59e0b" : "#818cf8",
        borderColor: tone === "warn" ? "rgba(245,158,11,0.35)" : "rgba(129,140,248,0.35)",
        background: tone === "warn" ? "rgba(245,158,11,0.08)" : "rgba(129,140,248,0.08)",
      }}
    >
      {children}
    </div>
  );
}

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  background: "#0e1420",
  border: "1px solid #1e2d45",
  borderRadius: 8,
  overflow: "hidden",
};

const tabsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  borderBottom: "1px solid #1e2d45",
  padding: 6,
  gap: 6,
};

const tabStyle: CSSProperties = {
  border: "none",
  borderRadius: 6,
  padding: "9px 8px",
  fontFamily: "var(--font-body)",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  cursor: "pointer",
};

const bodyStyle: CSSProperties = {
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  overflowY: "auto",
};

const segmentedStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
};

const sideButtonStyle: CSSProperties = {
  border: "1px solid #1e2d45",
  borderRadius: 6,
  padding: "10px 8px",
  fontFamily: "var(--font-body)",
  fontWeight: 800,
  textTransform: "uppercase",
  cursor: "pointer",
};

const fieldLabelStyle: CSSProperties = {
  fontSize: 10,
  color: "#7a8aaa",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 800,
};

const inputStyle: CSSProperties = {
  width: "100%",
  background: "#131a28",
  border: "1px solid #1e2d45",
  borderRadius: 6,
  padding: "11px 12px",
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 700,
  color: "#e2e8f8",
  outline: "none",
};

const fullButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 40,
  borderRadius: 6,
};

const infoRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 11,
  color: "#7a8aaa",
};

const hintStyle: CSSProperties = {
  fontSize: 11,
  color: "#7a8aaa",
};

const dividerStyle: CSSProperties = {
  borderTop: "1px solid #1e2d45",
  margin: "2px 0",
};

const noticeStyle: CSSProperties = {
  border: "1px solid",
  borderRadius: 6,
  padding: 10,
  fontSize: 12,
  lineHeight: 1.4,
};

const messageStyle: CSSProperties = {
  padding: 10,
  borderRadius: 6,
  background: "rgba(30,45,69,0.5)",
  color: "#e2e8f8",
  fontSize: 12,
  wordBreak: "break-word",
};

const emptyStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  background: "#0e1420",
  borderRadius: 8,
  color: "#7a8aaa",
  gap: 6,
  padding: 20,
  textAlign: "center",
};

const emptyTitleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 15,
  fontWeight: 700,
  color: "#e2e8f8",
};

const emptyBodyStyle: CSSProperties = {
  fontSize: 12,
};
