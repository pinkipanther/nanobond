"use client";

import { useState, type CSSProperties } from "react";
import { formatUnits } from "viem";
import { HBAR_DECIMALS, TOKEN_DECIMALS } from "../../lib/contracts";
import type { NanoProMarket } from "../lib/markets";

interface MarketSelectorProps {
  markets: NanoProMarket[];
  selected: NanoProMarket | null;
  onSelect: (market: NanoProMarket) => void;
}

function formatToken(value: bigint) {
  return Number(formatUnits(value, TOKEN_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function formatPrice(value: bigint) {
  if (value === 0n) return "--";
  return Number(formatUnits(value, HBAR_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

export default function MarketSelector({ markets, selected, onSelect }: MarketSelectorProps) {
  const [filter, setFilter] = useState("");

  const filtered = markets.filter(
    (market) =>
      market.pairSymbol.toLowerCase().includes(filter.toLowerCase()) ||
      market.name.toLowerCase().includes(filter.toLowerCase()) ||
      market.tokenAddress.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={headerTextStyle}>Nano Pro</span>
        <span style={countStyle}>{markets.length}</span>
      </div>

      <div style={searchWrapStyle}>
        <input
          type="text"
          placeholder="Search market or token"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          style={searchStyle}
        />
      </div>

      <div style={listStyle}>
        {filtered.map((market) => {
          const isActive = selected?.tokenAddress.toLowerCase() === market.tokenAddress.toLowerCase();
          const status = market.poolReady ? "Trading" : market.poolAddress ? "No liquidity" : "Create pool";

          return (
            <button
              key={market.tokenAddress}
              onClick={() => onSelect(market)}
              style={{
                ...marketButtonStyle,
                background: isActive ? "#131a28" : "transparent",
                borderColor: isActive ? "rgba(99,102,241,0.55)" : "transparent",
              }}
            >
              <div style={rowStyle}>
                <span style={symbolStyle}>{market.pairSymbol}</span>
                <span
                  style={{
                    ...statusStyle,
                    color: market.poolReady ? "#10b981" : "#f59e0b",
                    background: market.poolReady ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                  }}
                >
                  {status}
                </span>
              </div>
              <div style={rowStyle}>
                <span style={metaStyle}>{(market.aprBps / 100).toFixed(2)}% APR</span>
                <span style={priceStyle}>{formatPrice(market.spotPrice)} HBAR</span>
              </div>
              <div style={rowStyle}>
                <span style={addressStyle}>{market.tokenAddress.slice(0, 6)}...{market.tokenAddress.slice(-4)}</span>
                <span style={metaStyle}>{formatToken(market.reserveToken)} reserve</span>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div style={emptyStyle}>{markets.length === 0 ? "No active bond tokens are ready." : "No markets found."}</div>
        )}
      </div>
    </div>
  );
}

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  background: "#0e1420",
  borderRight: "1px solid #1e2d45",
};

const headerStyle: CSSProperties = {
  padding: "14px 12px",
  borderBottom: "1px solid #1e2d45",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const headerTextStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#7a8aaa",
};

const countStyle: CSSProperties = {
  fontSize: 11,
  color: "#7a8aaa",
  background: "#192133",
  padding: "2px 6px",
  borderRadius: 999,
  fontFamily: "var(--font-mono)",
};

const searchWrapStyle: CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #1e2d45",
};

const searchStyle: CSSProperties = {
  width: "100%",
  background: "#131a28",
  border: "1px solid #1e2d45",
  borderRadius: 6,
  padding: "9px 10px",
  fontSize: 12,
  fontFamily: "var(--font-body)",
  color: "#e2e8f8",
  outline: "none",
};

const listStyle: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
};

const marketButtonStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "12px",
  border: "1px solid transparent",
  borderBottom: "1px solid rgba(30,45,69,0.7)",
  borderRadius: 0,
  cursor: "pointer",
  textAlign: "left",
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
};

const symbolStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 13,
  color: "#e2e8f8",
};

const statusStyle: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  padding: "2px 5px",
  borderRadius: 4,
};

const metaStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "#7a8aaa",
};

const priceStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontWeight: 700,
  fontSize: 12,
  color: "#e2e8f8",
};

const addressStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "#3d4f6e",
};

const emptyStyle: CSSProperties = {
  padding: 20,
  textAlign: "center",
  color: "#7a8aaa",
  fontSize: 12,
};
