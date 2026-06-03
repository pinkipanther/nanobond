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
        <div style={emptyIconStyle}>💹</div>
        <div style={emptyTitleStyle}>Select a Market</div>
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
      await wallet.sendEvmTx({
        to: market.tokenAddress,
        data: encodeFunctionData({ abi: TOKEN_ABI, functionName: "approve", args: [market.poolAddress, parseTokenAmount(liquidityToken)] }),
        description: "Approve bond tokens",
      });
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
              background: panel === nextPanel ? "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(167,139,250,0.08) 100%)" : "transparent",
              color: panel === nextPanel ? "#e8f0ee" : "#5a6a85",
              borderColor: panel === nextPanel ? "rgba(99,102,241,0.3)" : "transparent",
            }}
          >
            {nextPanel}
          </button>
        ))}
      </div>

      <div style={bodyStyle}>
        <div style={walletInfoStyle}>
          <InfoRow label="Wallet HBAR" value={`${tinybarsToHbar(wallet.balanceTinybar)} HBAR`} />
          <InfoRow label={`${tokenLabel} balance`} value={formatToken(market.tokenBalance)} />
          <InfoRow label="Pool price" value={formatPrice(market.spotPrice)} />
        </div>

        {!factoryConfigured && (
          <Notice tone="warn">Configure NEXT_PUBLIC_NANOPRO_FACTORY_ADDRESS to enable pool creation.</Notice>
        )}

        {market.state !== 1 && (
          <Notice tone="info">This bond is still raising. Activate it before creating pools, adding liquidity, or trading.</Notice>
        )}

        {factoryConfigured && !market.poolAddress && market.state === 1 && (
          <button
            onClick={createPool}
            disabled={isPending || !wallet.isConnected}
            style={createPoolButtonStyle}
            className="create-pool-btn"
          >
            {isPending ? busy ?? "Pending" : wallet.isPairing ? "Connecting..." : !wallet.isConnected ? "Connect Wallet First" : "✨ Create Pool"}
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
                    background: side === nextSide ? (nextSide === "buy" ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)") : "transparent",
                    color: side === nextSide ? "#fff" : nextSide === "buy" ? "#10b981" : "#f43f5e",
                    borderColor: side === nextSide ? "transparent" : nextSide === "buy" ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)",
                    boxShadow: side === nextSide ? (nextSide === "buy" ? "0 8px 20px -12px rgba(16,185,129,0.5)" : "0 8px 20px -12px rgba(244,63,94,0.5)") : "none",
                  }}
                >
                  {nextSide}
                </button>
              ))}
            </div>

            <div style={fieldContainerStyle}>
              <label style={fieldLabelStyle}>{side === "buy" ? "HBAR Amount" : `${tokenLabel} Amount`}</label>
              <input
                type="number"
                min="0"
                step="any"
                value={tradeAmount}
                onChange={(event) => setTradeAmount(event.target.value)}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>

            {estimated && <div style={hintStyle}>{estimated}</div>}

            <button
              onClick={trade}
              disabled={isPending || market.state !== 1 || !market.poolReady || !tradeAmount || !wallet.isConnected}
              style={{
                ...tradeButtonStyle,
                background: side === "buy" ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
              }}
            >
              {isPending ? busy ?? "Pending" : wallet.isPairing ? "Connecting..." : !wallet.isConnected ? "Connect Wallet First" : `${side === "buy" ? "Buy" : "Sell"} ${tokenLabel}`}
            </button>
          </>
        )}

        {panel === "liquidity" && (
          <>
            <div style={fieldContainerStyle}>
              <label style={fieldLabelStyle}>Token Amount</label>
              <input
                type="number"
                min="0"
                step="any"
                value={liquidityToken}
                onChange={(event) => setLiquidityToken(event.target.value)}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>

            <div style={fieldContainerStyle}>
              <label style={fieldLabelStyle}>HBAR Amount</label>
              <input
                type="number"
                min="0"
                step="any"
                value={liquidityHbar}
                onChange={(event) => setLiquidityHbar(event.target.value)}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>

            <button
              onClick={addLiquidity}
              disabled={isPending || market.state !== 1 || !market.poolAddress || !liquidityToken || !liquidityHbar}
              style={liquidityButtonStyle}
            >
              {isPending ? busy ?? "Pending" : "💧 Add Liquidity"}
            </button>

            <div style={dividerStyle} />

            <div style={lpSectionStyle}>
              <InfoRow label="Your LP Balance" value={formatToken(market.lpBalance)} />

              <div style={fieldContainerStyle}>
                <label style={fieldLabelStyle}>LP Amount</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={lpAmount}
                  onChange={(event) => setLpAmount(event.target.value)}
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>

              <button
                onClick={removeLiquidity}
                disabled={isPending || market.state !== 1 || market.lpBalance === 0n || !lpAmount}
                style={removeLiquidityButtonStyle}
              >
                Remove Liquidity
              </button>
            </div>
          </>
        )}

        <div style={dividerStyle} />

        <div style={rewardsSectionStyle}>
          <InfoRow label="Claimable Rewards" value={formatToken(market.pendingReward)} accent={market.pendingReward > 0n} />
          <button
            onClick={claimRewards}
            disabled={isPending || market.state !== 1 || market.pendingReward === 0n}
            style={rewardsButtonStyle}
          >
            🎁 Claim Rewards
          </button>
        </div>

        {message && <div style={messageStyle}>{message}</div>}
      </div>
    </div>
  );
}

function InfoRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={infoRowStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <span style={{ ...infoValueStyle, color: accent ? "#10b981" : "#e8f0ee" }}>{value}</span>
    </div>
  );
}

function Notice({ children, tone }: { children: ReactNode; tone: "warn" | "info" }) {
  return (
    <div
      style={{
        ...noticeStyle,
        color: tone === "warn" ? "#f59e0b" : "#818cf8",
        borderColor: tone === "warn" ? "rgba(245,158,11,0.25)" : "rgba(129,140,248,0.25)",
        background: tone === "warn" ? "rgba(245,158,11,0.06)" : "rgba(129,140,248,0.06)",
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
  background: "#0a0f1a",
  border: "1px solid #1a2540",
  borderRadius: 12,
  overflow: "hidden",
};

const tabsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  borderBottom: "1px solid #1a2540",
  padding: 8,
  gap: 6,
  background: "linear-gradient(180deg, #0f1520 0%, #0a0f1a 100%)",
};

const tabStyle: CSSProperties = {
  border: "1px solid transparent",
  borderRadius: 8,
  padding: "11px 8px",
  fontFamily: "var(--font-body)",
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
  cursor: "pointer",
  letterSpacing: "0.05em",
  transition: "all 0.2s ease",
};

const bodyStyle: CSSProperties = {
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  overflowY: "auto",
};

const walletInfoStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 12,
  background: "#0f1520",
  border: "1px solid #1a2540",
  borderRadius: 10,
};

const segmentedStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
};

const sideButtonStyle: CSSProperties = {
  border: "1px solid",
  borderRadius: 8,
  padding: "12px 8px",
  fontFamily: "var(--font-body)",
  fontWeight: 800,
  textTransform: "uppercase",
  cursor: "pointer",
  letterSpacing: "0.05em",
  fontSize: 13,
  transition: "all 0.2s ease",
};

const fieldContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const fieldLabelStyle: CSSProperties = {
  fontSize: 11,
  color: "#5a6a85",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
};

const inputStyle: CSSProperties = {
  width: "100%",
  background: "#0f1520",
  border: "1px solid #1a2540",
  borderRadius: 8,
  padding: "12px 14px",
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  fontWeight: 700,
  color: "#e8f0ee",
  outline: "none",
  transition: "all 0.2s ease",
};

const tradeButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 44,
  borderRadius: 8,
  border: "none",
  color: "#fff",
  fontFamily: "var(--font-body)",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s ease",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const liquidityButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 44,
  borderRadius: 8,
  border: "none",
  background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
  color: "#fff",
  fontFamily: "var(--font-body)",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s ease",
  boxShadow: "0 8px 20px -12px rgba(99,102,241,0.5)",
};

const removeLiquidityButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 40,
  borderRadius: 8,
  border: "1px solid rgba(244,63,94,0.3)",
  background: "transparent",
  color: "#f43f5e",
  fontFamily: "var(--font-body)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const createPoolButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 44,
  borderRadius: 8,
  border: "none",
  background: "linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)",
  color: "#fff",
  fontFamily: "var(--font-body)",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s ease",
  boxShadow: "0 8px 20px -12px rgba(99,102,241,0.5)",
};

const lpSectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const rewardsSectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 12,
  background: "rgba(16,185,129,0.04)",
  border: "1px solid rgba(16,185,129,0.15)",
  borderRadius: 10,
};

const rewardsButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 40,
  borderRadius: 8,
  border: "1px solid rgba(16,185,129,0.3)",
  background: "rgba(16,185,129,0.08)",
  color: "#10b981",
  fontFamily: "var(--font-body)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const infoRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const infoLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#5a6a85",
  fontWeight: 600,
};

const infoValueStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 700,
};

const hintStyle: CSSProperties = {
  fontSize: 12,
  color: "#5a6a85",
  padding: "8px 0",
};

const dividerStyle: CSSProperties = {
  borderTop: "1px solid #1a2540",
  margin: "4px 0",
};

const noticeStyle: CSSProperties = {
  border: "1px solid",
  borderRadius: 8,
  padding: 12,
  fontSize: 12,
  lineHeight: 1.5,
};

const messageStyle: CSSProperties = {
  padding: 12,
  borderRadius: 8,
  background: "#0f1520",
  border: "1px solid #1a2540",
  color: "#e8f0ee",
  fontSize: 12,
  wordBreak: "break-word",
  fontFamily: "var(--font-mono)",
};

const emptyStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  background: "#0a0f1a",
  borderRadius: 12,
  color: "#5a6a85",
  gap: 10,
  padding: 24,
  textAlign: "center",
};

const emptyIconStyle: CSSProperties = {
  fontSize: 42,
  opacity: 0.4,
};

const emptyTitleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 16,
  fontWeight: 700,
  color: "#e8f0ee",
};

const emptyBodyStyle: CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
};
