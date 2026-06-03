"use client";

import { useState, type CSSProperties } from "react";
import { formatUnits } from "viem";
import type { BondCardData } from "../../lib/hooks";
import { HBAR_DECIMALS, TOKEN_DECIMALS } from "../../lib/contracts";
import MarketSelector from "./MarketSelector";
import MarketStats from "./MarketStats";
import TradeForm from "./TradeForm";
import { useNanoProMarkets, type NanoProMarket } from "../lib/markets";

interface ProTerminalProps {
  bonds: BondCardData[];
}

function formatToken(value: bigint) {
  return Number(formatUnits(value, TOKEN_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function formatHbar(value: bigint) {
  return Number(formatUnits(value, HBAR_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ProTerminal({ bonds }: ProTerminalProps) {
  const { markets, isLoading, error, refresh, factoryConfigured } = useNanoProMarkets(bonds);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const selected =
    markets.find((market) => market.tokenAddress.toLowerCase() === selectedToken?.toLowerCase()) ?? markets[0] ?? null;

  return (
    <div style={terminalStyle}>
      <div style={{ gridArea: "stats", minHeight: 0 }}>
        <MarketStats market={selected} factoryConfigured={factoryConfigured} />
      </div>

      <div style={{ gridArea: "selector", minHeight: 0, overflow: "hidden" }}>
        <MarketSelector markets={markets} selected={selected} onSelect={(market) => setSelectedToken(market.tokenAddress)} />
      </div>

      <main style={mainPanelStyle}>
        {isLoading && <StateBlock title="Loading markets" body="Reading launched bond tokens and Nano Pro pools." icon="⏳" />}
        {!isLoading && error && <StateBlock title="Market load failed" body={error.message} icon="⚠️" />}
        {!isLoading && !error && !selected && (
          <StateBlock
            title="No token markets"
            body="Create a NanoBond first, then activate it before opening a live Nano Pro pool."
            icon="📊"
          />
        )}
        {!isLoading && !error && selected && <MarketWorkspace market={selected} />}
      </main>

      <aside style={{ gridArea: "actions", minHeight: 0, overflow: "hidden" }}>
        <TradeForm market={selected} factoryConfigured={factoryConfigured} onRefresh={refresh} />
      </aside>
    </div>
  );
}

function MarketWorkspace({ market }: { market: NanoProMarket }) {
  return (
    <div style={workspaceStyle}>
      <section style={surfaceStyle}>
        <div style={sectionHeaderStyle}>
          <div style={headerContentStyle}>
            <h2 style={titleStyle}>{market.pairSymbol}</h2>
            <p style={subtitleStyle}>
              {market.state === 1 ? "Secondary market for the launched bond token." : "Bond is still raising. Activate it before trading."}
            </p>
          </div>
          <div style={badgeContainerStyle}>
            <span
              style={{
                ...poolBadgeStyle,
                background: market.state !== 1 ? "rgba(245,158,11,0.1)" : market.poolReady ? "rgba(16,185,129,0.1)" : market.poolAddress ? "rgba(99,102,241,0.1)" : "rgba(90,106,133,0.1)",
                borderColor: market.state !== 1 ? "rgba(245,158,11,0.25)" : market.poolReady ? "rgba(16,185,129,0.25)" : market.poolAddress ? "rgba(99,102,241,0.25)" : "rgba(90,106,133,0.25)",
                color: market.state !== 1 ? "#f59e0b" : market.poolReady ? "#10b981" : market.poolAddress ? "#6366f1" : "#5a6a85",
              }}
            >
              <div
                style={{
                  ...badgeDotStyle,
                  background: market.state !== 1 ? "#f59e0b" : market.poolReady ? "#10b981" : market.poolAddress ? "#6366f1" : "#5a6a85",
                }}
              />
              {market.state !== 1 ? "Raising" : market.poolReady ? "Live pool" : market.poolAddress ? "Awaiting liquidity" : "Pool not created"}
            </span>
          </div>
        </div>

        <div style={metricsGridStyle}>
          <Metric label="APR set by creator" value={`${(market.aprBps / 100).toFixed(2)}%`} />
          <Metric label="HBAR reserve" value={`${formatHbar(market.reserveHbar)} HBAR`} />
          <Metric label="Token reserve" value={formatToken(market.reserveToken)} />
          <Metric label="Your token balance" value={formatToken(market.tokenBalance)} />
          <Metric label="Your LP balance" value={formatToken(market.lpBalance)} />
          <Metric label="Claimable rewards" value={formatToken(market.pendingReward)} accent={market.pendingReward > 0n} />
        </div>
      </section>

      {market.poolAddress && market.poolReady && (
        <div style={addressBarStyle}>
          <AddressChip label="Bond" address={market.bondAddress} />
          <AddressChip label="Token" address={market.tokenAddress} />
          <AddressChip label="Pool" address={market.poolAddress ?? ""} />
        </div>
      )}

      {!market.poolAddress && (
        <div style={addressBarStyle}>
          <AddressChip label="Bond" address={market.bondAddress} />
          <AddressChip label="Token" address={market.tokenAddress} />
          <div style={addressChipContainerStyle}>
            <span style={addressChipLabelStyle}>Pool</span>
            <span style={addressChipValueDimStyle}>Not created</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AddressChip({ label, address }: { label: string; address: string }) {
  return (
    <div style={addressChipContainerStyle}>
      <span style={addressChipLabelStyle}>{label}</span>
      <span title={address} style={addressChipValueStyle}>
        {shortAddress(address)}
      </span>
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={metricStyle}>
      <span style={metricLabelStyle}>{label}</span>
      <span style={{ ...metricValueStyle, color: accent ? "#10b981" : "#e8f0ee" }}>{value}</span>
    </div>
  );
}

function StateBlock({ title, body, icon }: { title: string; body: string; icon: string }) {
  return (
    <div style={stateBlockStyle}>
      <div style={stateIconStyle}>{icon}</div>
      <h2 style={smallTitleStyle}>{title}</h2>
      <p style={subtitleStyle}>{body}</p>
    </div>
  );
}

const terminalStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 1fr) 340px",
  gridTemplateRows: "64px minmax(0, 1fr)",
  gridTemplateAreas: `
    "stats stats stats"
    "selector workspace actions"
  `,
  gap: 1,
  padding: 0,
  minHeight: 0,
  height: "calc(100vh - 76px)",
  background: "#1a2540",
};

const mainPanelStyle: CSSProperties = {
  gridArea: "workspace",
  minHeight: 0,
  overflow: "auto",
  background: "#060a12",
};

const workspaceStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto auto",
  gap: 16,
  padding: 20,
};

const surfaceStyle: CSSProperties = {
  background: "linear-gradient(180deg, #0f1520 0%, #0a0f1a 100%)",
  border: "1px solid #1a2540",
  borderRadius: 16,
  padding: 28,
  position: "relative",
  overflow: "hidden",
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  marginBottom: 28,
};

const headerContentStyle: CSSProperties = {
  flex: 1,
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 32,
  fontWeight: 800,
  lineHeight: 1,
  letterSpacing: "-0.03em",
  margin: 0,
  color: "#e8f0ee",
};

const smallTitleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 22,
  fontWeight: 700,
  margin: 0,
  color: "#e8f0ee",
};

const subtitleStyle: CSSProperties = {
  fontSize: 14,
  color: "#5a6a85",
  margin: "10px 0 0",
  lineHeight: 1.6,
};

const badgeContainerStyle: CSSProperties = {
  flexShrink: 0,
};

const poolBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const badgeDotStyle: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  animation: "pulse 2s infinite",
};

const metricsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 14,
};

const metricStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  background: "#0f1520",
  border: "1px solid #1a2540",
  borderRadius: 12,
  padding: 16,
  transition: "all 0.2s ease",
};

const metricLabelStyle: CSSProperties = {
  color: "#5a6a85",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const metricValueStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: "-0.01em",
};

const addressBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 24,
  padding: "14px 20px",
  background: "linear-gradient(180deg, #0f1520 0%, #0a0f1a 100%)",
  border: "1px solid #1a2540",
  borderRadius: 12,
  flexWrap: "wrap",
};

const addressChipContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const addressChipLabelStyle: CSSProperties = {
  color: "#5a6a85",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const addressChipValueStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "#e8f0ee",
  fontSize: 13,
  fontWeight: 700,
};

const addressChipValueDimStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "#5a6a85",
  fontSize: 13,
  fontWeight: 700,
};

const stateBlockStyle: CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: 48,
  background: "linear-gradient(180deg, #0f1520 0%, #0a0f1a 100%)",
  border: "1px solid #1a2540",
  borderRadius: 16,
};

const stateIconStyle: CSSProperties = {
  fontSize: 48,
  marginBottom: 20,
  opacity: 0.6,
};
