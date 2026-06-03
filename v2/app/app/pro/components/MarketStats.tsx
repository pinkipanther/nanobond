"use client";

import { formatUnits } from "viem";
import { type CSSProperties } from "react";
import { HBAR_DECIMALS, TOKEN_DECIMALS } from "../../lib/contracts";
import type { NanoProMarket } from "../lib/markets";

interface MarketStatsProps {
  market: NanoProMarket | null;
  factoryConfigured: boolean;
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

function formatPrice(value: bigint) {
  if (value === 0n) return "--";
  return `${Number(formatUnits(value, HBAR_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 8,
  })}`;
}

export default function MarketStats({ market, factoryConfigured }: MarketStatsProps) {
  if (!market) {
    return (
      <div style={barStyle}>
        <div style={emptyContainerStyle}>
          <div style={emptyIconStyle}>📊</div>
          <span style={emptyStyle}>
            {factoryConfigured ? "Select an active bond market" : "Configure NEXT_PUBLIC_NANOPRO_FACTORY_ADDRESS"}
          </span>
        </div>
      </div>
    );
  }

  const poolStatus = market.poolAddress ? "Created" : "Not created";
  const poolColor = market.poolAddress ? "#10b981" : "#f59e0b";
  const poolBg = market.poolAddress ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)";

  const stats = [
    { label: "Spot Price", value: formatPrice(market.spotPrice), suffix: "HBAR", color: market.spotPrice > 0n ? "#e8f0ee" : "#5a6a85" },
    { label: "HBAR Reserve", value: formatHbar(market.reserveHbar), suffix: "HBAR" },
    { label: "Token Reserve", value: formatToken(market.reserveToken), suffix: market.symbol },
    { label: "APR", value: `${(market.aprBps / 100).toFixed(2)}`, suffix: "%" },
    { label: "Rewards", value: formatToken(market.pendingReward), suffix: market.symbol, color: market.pendingReward > 0n ? "#10b981" : "#5a6a85" },
  ];

  return (
    <div style={barStyle}>
      <div style={identityStyle}>
        <div style={symbolContainerStyle}>
          <span style={symbolStyle}>{market.pairSymbol}</span>
          <div style={badgeWrapperStyle}>
            <span
              style={{
                ...badgeStyle,
                background: market.poolReady ? "rgba(16,185,129,0.12)" : market.poolAddress ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.12)",
                color: market.poolReady ? "#10b981" : market.poolAddress ? "#f59e0b" : "#6366f1",
                borderColor: market.poolReady ? "rgba(16,185,129,0.25)" : market.poolAddress ? "rgba(245,158,11,0.25)" : "rgba(99,102,241,0.25)",
              }}
            >
              {market.poolReady ? "Trading" : market.poolAddress ? "Needs liquidity" : "Pool setup"}
            </span>
          </div>
        </div>
      </div>

      <div style={dividerStyle} />

      <div style={poolStatusContainerStyle}>
        <div style={poolLabelStyle}>Pool</div>
        <div style={{ ...poolValueStyle, color: poolColor, background: poolBg }}>
          <div style={{ ...poolDotStyle, background: poolColor }} />
          {poolStatus}
        </div>
      </div>

      {stats.map((stat) => (
        <div key={stat.label} style={statStyle}>
          <span style={labelStyle}>{stat.label}</span>
          <div style={valueWrapperStyle}>
            <span style={{ ...valueStyle, color: stat.color ?? "#e8f0ee" }}>{stat.value}</span>
            {stat.suffix && <span style={suffixStyle}>{stat.suffix}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

const barStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "0 20px",
  height: 64,
  background: "linear-gradient(180deg, #0f1520 0%, #0a0f1a 100%)",
  borderBottom: "1px solid #1a2540",
  gap: 0,
  overflowX: "auto",
  overflowY: "hidden",
  position: "relative",
};

const emptyContainerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const emptyIconStyle: CSSProperties = {
  fontSize: 24,
  opacity: 0.6,
};

const emptyStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 14,
  color: "#5a6a85",
};

const identityStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  paddingRight: 24,
  marginRight: 24,
  flexShrink: 0,
};

const symbolContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const symbolStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 800,
  fontSize: 18,
  color: "#e8f0ee",
  letterSpacing: "-0.02em",
};

const badgeWrapperStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
};

const badgeStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  padding: "3px 8px",
  borderRadius: 6,
  border: "1px solid",
  letterSpacing: "0.04em",
};

const dividerStyle: CSSProperties = {
  width: 1,
  height: 36,
  background: "linear-gradient(180deg, transparent 0%, #1a2540 50%, transparent 100%)",
  margin: "0 4px",
  flexShrink: 0,
};

const poolStatusContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  paddingRight: 24,
  marginRight: 24,
  borderRight: "1px solid #1a2540",
  flexShrink: 0,
};

const poolLabelStyle: CSSProperties = {
  fontSize: 10,
  color: "#5a6a85",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
};

const poolValueStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
};

const poolDotStyle: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  animation: "pulse 2s infinite",
};

const statStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  paddingLeft: 24,
  paddingRight: 24,
  borderRight: "1px solid #1a2540",
  flexShrink: 0,
  minWidth: 100,
};

const labelStyle: CSSProperties = {
  fontSize: 10,
  color: "#5a6a85",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
};

const valueWrapperStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 4,
};

const valueStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "-0.01em",
};

const suffixStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "#5a6a85",
  fontWeight: 600,
};
