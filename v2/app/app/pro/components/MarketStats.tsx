"use client";

import { formatUnits } from "viem";
import type { CSSProperties } from "react";
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
  })} HBAR`;
}

export default function MarketStats({ market, factoryConfigured }: MarketStatsProps) {
  if (!market) {
    return (
      <div style={barStyle}>
        <span style={emptyStyle}>
          {factoryConfigured ? "Select an active bond market" : "Set NEXT_PUBLIC_NANOPRO_FACTORY_ADDRESS"}
        </span>
      </div>
    );
  }

  const stats = [
    { label: "Pool", value: market.poolAddress ? "Created" : "Not created", color: market.poolAddress ? "#10b981" : "#f59e0b" },
    { label: "Spot", value: formatPrice(market.spotPrice), color: market.spotPrice > 0n ? "#e2e8f8" : "#7a8aaa" },
    { label: "HBAR reserve", value: `${formatHbar(market.reserveHbar)} HBAR` },
    { label: "Token reserve", value: formatToken(market.reserveToken) },
    { label: "APR", value: `${(market.aprBps / 100).toFixed(2)}%` },
    { label: "Rewards", value: formatToken(market.pendingReward), color: market.pendingReward > 0n ? "#10b981" : "#7a8aaa" },
  ];

  return (
    <div style={barStyle}>
      <div style={identityStyle}>
        <span style={symbolStyle}>{market.pairSymbol}</span>
        <span style={badgeStyle}>{market.poolReady ? "Trading" : market.poolAddress ? "Needs liquidity" : "Pool setup"}</span>
      </div>
      {stats.map((stat) => (
        <div key={stat.label} style={statStyle}>
          <span style={labelStyle}>{stat.label}</span>
          <span style={{ ...valueStyle, color: stat.color ?? "#e2e8f8" }}>{stat.value}</span>
        </div>
      ))}
    </div>
  );
}

const barStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "0 16px",
  height: 54,
  borderBottom: "1px solid #1e2d45",
  background: "#0e1420",
  gap: 20,
  overflowX: "auto",
};

const emptyStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 14,
  color: "#7a8aaa",
};

const identityStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  paddingRight: 16,
  borderRight: "1px solid #1e2d45",
  flexShrink: 0,
};

const symbolStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 15,
  color: "#e2e8f8",
};

const badgeStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  padding: "3px 7px",
  borderRadius: 4,
  background: "rgba(16,185,129,0.12)",
  color: "#10b981",
};

const statStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flexShrink: 0,
  minWidth: 86,
};

const labelStyle: CSSProperties = {
  fontSize: 9,
  color: "#7a8aaa",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 800,
};

const valueStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 700,
};
