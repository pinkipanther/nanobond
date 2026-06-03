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
        <div style={headerContentStyle}>
          <span style={headerTextStyle}>Nano Pro</span>
          <span style={countStyle}>{markets.length}</span>
        </div>
      </div>

      <div style={searchWrapStyle}>
        <div style={searchContainerStyle}>
          <div style={searchIconStyle}>🔍</div>
          <input
            type="text"
            placeholder="Search markets..."
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            style={searchStyle}
          />
        </div>
      </div>

      <div style={listStyle}>
        {filtered.map((market) => {
          const isActive = selected?.tokenAddress.toLowerCase() === market.tokenAddress.toLowerCase();
          const status = market.poolReady ? "Trading" : market.poolAddress ? "No liquidity" : "Create pool";
          const statusColor = market.poolReady ? "#10b981" : "#f59e0b";
          const statusBg = market.poolReady ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)";

          return (
            <button
              key={market.tokenAddress}
              onClick={() => onSelect(market)}
              style={{
                ...marketButtonStyle,
                background: isActive ? "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(167,139,250,0.05) 100%)" : "transparent",
                borderColor: isActive ? "rgba(99,102,241,0.3)" : "transparent",
                borderLeftWidth: isActive ? "3px" : "0px",
              }}
              className="market-item"
            >
              <div style={rowStyle}>
                <div style={symbolContainerStyle}>
                  <span style={symbolStyle}>{market.pairSymbol}</span>
                  <span
                    style={{
                      ...statusStyle,
                      color: statusColor,
                      background: statusBg,
                    }}
                  >
                    {status}
                  </span>
                </div>
                <span style={priceStyle}>{formatPrice(market.spotPrice)}</span>
              </div>

              <div style={rowStyle}>
                <span style={metaStyle}>{(market.aprBps / 100).toFixed(2)}% APR</span>
                <span style={metaStyle}>{formatToken(market.reserveToken)} reserve</span>
              </div>

              <div style={addressRowStyle}>
                <span style={addressStyle}>{market.tokenAddress.slice(0, 6)}...{market.tokenAddress.slice(-4)}</span>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div style={emptyStyle}>
            <div style={emptyIconStyle}>📋</div>
            <div style={emptyTextStyle}>{markets.length === 0 ? "No active bond tokens" : "No markets found"}</div>
          </div>
        )}
      </div>
    </div>
  );
}

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  background: "#0a0f1a",
  borderRight: "1px solid #1a2540",
};

const headerStyle: CSSProperties = {
  padding: "16px 16px 12px",
  borderBottom: "1px solid #1a2540",
  background: "linear-gradient(180deg, #0f1520 0%, #0a0f1a 100%)",
};

const headerContentStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const headerTextStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 800,
  fontSize: 14,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#8896b0",
};

const countStyle: CSSProperties = {
  fontSize: 11,
  color: "#5a6a85",
  background: "#151d2e",
  padding: "3px 8px",
  borderRadius: 999,
  fontFamily: "var(--font-mono)",
  fontWeight: 700,
};

const searchWrapStyle: CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #1a2540",
};

const searchContainerStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const searchIconStyle: CSSProperties = {
  position: "absolute",
  left: 12,
  fontSize: 14,
  opacity: 0.5,
  pointerEvents: "none",
};

const searchStyle: CSSProperties = {
  width: "100%",
  background: "#0f1520",
  border: "1px solid #1a2540",
  borderRadius: 8,
  padding: "10px 12px 10px 36px",
  fontSize: 13,
  fontFamily: "var(--font-body)",
  color: "#e8f0ee",
  outline: "none",
  transition: "all 0.2s ease",
};

const listStyle: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  padding: "8px 0",
};

const marketButtonStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: "14px 16px",
  border: "1px solid transparent",
  borderLeft: "1px solid transparent",
  margin: "2px 8px",
  borderRadius: 10,
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.2s ease",
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
};

const symbolContainerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const symbolStyle: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 800,
  fontSize: 14,
  color: "#e8f0ee",
  letterSpacing: "-0.01em",
};

const statusStyle: CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  padding: "3px 7px",
  borderRadius: 5,
};

const priceStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontWeight: 700,
  fontSize: 14,
  color: "#e8f0ee",
};

const metaStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "#5a6a85",
  fontWeight: 600,
};

const addressRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  marginTop: 2,
};

const addressStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "#3d4f6e",
  fontWeight: 600,
};

const emptyStyle: CSSProperties = {
  padding: 40,
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
};

const emptyIconStyle: CSSProperties = {
  fontSize: 36,
  opacity: 0.4,
};

const emptyTextStyle: CSSProperties = {
  color: "#5a6a85",
  fontSize: 13,
  fontWeight: 600,
};
