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
        {isLoading && <StateBlock title="Loading markets" body="Reading launched bond tokens and Nano Pro pools." />}
        {!isLoading && error && <StateBlock title="Market load failed" body={error.message} />}
        {!isLoading && !error && !selected && (
          <StateBlock
            title="No token markets"
            body="Create a NanoBond first, then activate it before opening a live Nano Pro pool."
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
          <div>
            <h2 style={titleStyle}>{market.pairSymbol}</h2>
            <p style={subtitleStyle}>
              {market.state === 1 ? "Secondary market for the launched bond token." : "Bond is still raising. Activate it before trading."}
            </p>
          </div>
          <span style={poolBadgeStyle}>
            {market.state !== 1 ? "Raising" : market.poolReady ? "Live pool" : market.poolAddress ? "Awaiting liquidity" : "Pool not created"}
          </span>
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
        <div style={compactAddressBarStyle}>
          <span style={metricLabelStyle}>Bond</span>
          <span title={market.bondAddress} style={addressValueStyle}>{shortAddress(market.bondAddress)}</span>
          <span style={{ ...metricLabelStyle, marginLeft: 16 }}>Token</span>
          <span title={market.tokenAddress} style={addressValueStyle}>{shortAddress(market.tokenAddress)}</span>
          <span style={{ ...metricLabelStyle, marginLeft: 16 }}>Pool</span>
          <span title={market.poolAddress ?? ""} style={addressValueStyle}>{market.poolAddress ? shortAddress(market.poolAddress) : "Not created"}</span>
        </div>
      )}

      {!market.poolAddress && (
        <div style={compactAddressBarStyle}>
          <span style={metricLabelStyle}>Bond</span>
          <span title={market.bondAddress} style={addressValueStyle}>{shortAddress(market.bondAddress)}</span>
          <span style={{ ...metricLabelStyle, marginLeft: 16 }}>Token</span>
          <span title={market.tokenAddress} style={addressValueStyle}>{shortAddress(market.tokenAddress)}</span>
          <span style={{ ...metricLabelStyle, marginLeft: 16 }}>Pool</span>
          <span style={{ ...addressValueStyle, color: "var(--text-dim)" }}>Not created</span>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={metricStyle}>
      <span style={{ ...metricLabelStyle, marginBottom: 8 }}>{label}</span>
      <span style={{ ...metricValueStyle, color: accent ? "#10b981" : "#e2e8f8" }}>{value}</span>
    </div>
  );
}



function StateBlock({ title, body }: { title: string; body: string }) {
  return (
    <div style={stateBlockStyle}>
      <h2 style={smallTitleStyle}>{title}</h2>
      <p style={subtitleStyle}>{body}</p>
    </div>
  );
}

const terminalStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "270px minmax(0, 1fr) 320px",
  gridTemplateRows: "54px minmax(0, 1fr)",
  gridTemplateAreas: `
    "stats stats stats"
    "selector workspace actions"
  `,
  gap: 16,
  padding: 16,
  minHeight: 0,
  height: "calc(100vh - 76px)",
  background: "var(--void)",
};

const mainPanelStyle: CSSProperties = {
  gridArea: "workspace",
  minHeight: 0,
  overflow: "auto",
  background: "transparent",
  borderRadius: 16,
};

const workspaceStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto auto",
  gap: 24,
  padding: 8,
};

const surfaceStyle: CSSProperties = {
  background: "var(--void-surface)",
  border: "1px solid var(--void-border)",
  borderRadius: 16,
  padding: 24,
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 24,
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 32,
  fontWeight: 800,
  lineHeight: 1,
  letterSpacing: "-0.02em",
  margin: 0,
  color: "var(--text-primary)",
};

const smallTitleStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 20,
  fontWeight: 700,
  margin: 0,
  color: "var(--text-primary)",
};

const subtitleStyle: CSSProperties = {
  fontSize: 14,
  color: "var(--text-secondary)",
  margin: "8px 0 0",
  lineHeight: 1.5,
};

const poolBadgeStyle: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 999,
  background: "rgba(99,102,241,0.1)",
  border: "1px solid rgba(99,102,241,0.2)",
  color: "var(--cyan)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const metricsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 16,
};

const metricStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  background: "var(--void-light)",
  border: "1px solid var(--void-border)",
  borderRadius: 12,
  padding: 16,
};

const metricLabelStyle: CSSProperties = {
  color: "var(--text-dim)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const metricValueStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 18,
  fontWeight: 700,
};



const addressValueStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  color: "var(--text-primary)",
  fontSize: 14,
  fontWeight: 600,
};

const stateBlockStyle: CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: 40,
  background: "var(--void-surface)",
  border: "1px dashed var(--void-border)",
  borderRadius: 16,
};

const compactAddressBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "10px 16px",
  background: "var(--void-surface)",
  border: "1px solid var(--void-border)",
  borderRadius: 10,
  flexWrap: "wrap",
};
