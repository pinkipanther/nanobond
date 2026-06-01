"use client";

import { useMemo, useState } from "react";
import { useBonds } from "../lib/hooks";
import Link from "next/link";

const STATE_LABEL = ["Raising", "Active", "Matured", "Failed", "Cancelled"];
const STATE_COLOR = [
  "var(--acid)",
  "var(--cyan)",
  "var(--gold)",
  "var(--magenta)",
  "var(--text-dim)",
];

function fmt(n: number, decimals = 2) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(decimals);
}

function StatCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="glass-card"
      style={{
        padding: "20px 22px",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {/* top accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accent,
          borderRadius: "16px 16px 0 0",
        }}
      />
      {/* corner glow */}
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: accent,
          opacity: 0.06,
          pointerEvents: "none",
        }}
      />
      <div style={{ color: accent, opacity: 0.8 }}>{icon}</div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 26,
          fontWeight: 800,
          color: "var(--text-primary)",
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: accent,
            fontWeight: 600,
          }}
        >
          {sub}
        </div>
      )}
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 12,
          color: "var(--text-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function RankRow({
  rank,
  name,
  symbol,
  href,
  barPct,
  barColor,
  valueLabel,
  state,
}: {
  rank: number;
  name: string;
  symbol: string;
  href: string;
  barPct: number;
  barColor: string;
  valueLabel: string;
  state: number;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 0",
          borderBottom: "1px solid var(--void-border)",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.opacity = "0.75")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.opacity = "1")
        }
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 800,
            color: "var(--text-dim)",
            width: 20,
            flexShrink: 0,
            textAlign: "right",
          }}
        >
          {rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {name}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-dim)",
                flexShrink: 0,
              }}
            >
              {symbol}
            </span>
          </div>
          <div style={{ height: "6px", borderRadius: "3px", background: "var(--void-elevated)", overflow: "hidden", marginTop: 5 }}>
            <div style={{
                width: "100%",
                height: "100%",
                borderRadius: "3px",
                background: barColor,
                transform: `scaleX(${Math.max(0.02, Math.min(1, barPct / 100))})`,
                transformOrigin: "left center",
                transition: "transform 1s cubic-bezier(0.16, 1, 0.3, 1)"
            }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, gap: 2 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 700,
              color: barColor,
            }}
          >
            {valueLabel}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: STATE_COLOR[state] ?? "var(--text-dim)",
              textTransform: "uppercase",
            }}
          >
            {STATE_LABEL[state] ?? "—"}
          </span>
        </div>
      </div>
    </Link>
  );
}

type SortKey = "name" | "raised" | "supply" | "yield" | "apr" | "backers" | "state";

export default function AnalyticsPage() {
  const { bonds, isLoading, count } = useBonds();
  const [sortKey, setSortKey] = useState<SortKey>("raised");
  const [sortAsc, setSortAsc] = useState(false);

  const stats = useMemo(() => {
    let totalRaised = 0;
    let totalTokenSupply = 0;
    let totalYield = 0;
    let totalContributors = 0;
    const creators = new Set<string>();
    bonds.forEach((b) => {
      totalRaised += b.totalRaised;
      totalTokenSupply += b.totalSupply;
      totalYield += b.totalYieldMinted;
      totalContributors += b.contributors;
      if (b.creator) creators.add(b.creator);
    });
    return {
      totalRaised,
      totalTokenSupply,
      totalYield,
      totalContributors,
      uniqueCreators: creators.size,
      activeBonds: bonds.filter((b) => b.state === 1).length,
      raisingBonds: bonds.filter((b) => b.state === 0).length,
      otherBonds: bonds.filter((b) => b.state > 1).length,
    };
  }, [bonds]);

  const topByRaised = useMemo(
    () => [...bonds].sort((a, b) => b.totalRaised - a.totalRaised).slice(0, 5),
    [bonds]
  );
  const topByApr = useMemo(
    () =>
      [...bonds].sort((a, b) => b.yieldRateBps - a.yieldRateBps).slice(0, 5),
    [bonds]
  );
  const maxRaised = topByRaised[0]?.totalRaised || 1;
  const maxApr = topByApr[0]?.yieldRateBps || 1;

  const sorted = useMemo(() => {
    const arr = [...bonds];
    arr.sort((a, b) => {
      let av = 0,
        bv = 0;
      if (sortKey === "name") return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      if (sortKey === "raised") { av = a.totalRaised; bv = b.totalRaised; }
      if (sortKey === "supply") { av = a.totalSupply; bv = b.totalSupply; }
      if (sortKey === "yield") { av = a.totalYieldMinted; bv = b.totalYieldMinted; }
      if (sortKey === "apr") { av = a.yieldRateBps; bv = b.yieldRateBps; }
      if (sortKey === "backers") { av = a.contributors; bv = b.contributors; }
      if (sortKey === "state") { av = a.state; bv = b.state; }
      return sortAsc ? av - bv : bv - av;
    });
    return arr;
  }, [bonds, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: "10px 12px",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: sortKey === key ? "var(--cyan)" : "var(--text-dim)",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    textAlign: "left",
    fontWeight: sortKey === key ? 800 : 600,
    borderBottom: "1px solid var(--void-border)",
  });

  const totalSegments = stats.raisingBonds + stats.activeBonds + stats.otherBonds || 1;

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}>
        <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--void-border)", borderTopColor: "var(--cyan)", animation: "spin-icon 0.8s linear infinite", margin: "0 auto 20px" }} />
          <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontWeight: 600 }}>
            Loading analytics…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 6, height: 28, borderRadius: 3, background: "linear-gradient(180deg, #6366f1, #10b981)" }} />
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Protocol Analytics
          </h1>
        </div>
        <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontSize: 14, marginLeft: 16 }}>
          Global statistics across all NanoBond deployments on Hedera testnet.
        </p>
      </div>

      {/* ── KPI row ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <StatCard
          label="Total Volume Raised"
          value={`${fmt(stats.totalRaised)} ℏ`}
          accent="var(--cyan)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
        <StatCard
          label="Total Bonds"
          value={`${count}`}
          sub={`${stats.raisingBonds} raising · ${stats.activeBonds} active`}
          accent="var(--text-primary)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-4 0v2" />
            </svg>
          }
        />
        <StatCard
          label="Yield Distributed"
          value={fmt(stats.totalYield)}
          accent="var(--acid)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          }
        />
        <StatCard
          label="Token Supply"
          value={fmt(stats.totalTokenSupply)}
          accent="var(--magenta)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          }
        />
        <StatCard
          label="Total Backers"
          value={fmt(stats.totalContributors, 0)}
          accent="var(--gold)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          label="Unique Creators"
          value={`${stats.uniqueCreators}`}
          accent="var(--gold)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 1 0-16 0" />
            </svg>
          }
        />
      </div>

      {/* ── Bond state ratio bar ── */}
      {count > 0 && (
        <div className="glass-card" style={{ padding: "18px 22px", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Bond Status Distribution</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)" }}>{count} total</span>
          </div>
          <div style={{ height: 10, borderRadius: 5, overflow: "hidden", display: "flex", gap: 2 }}>
            {stats.raisingBonds > 0 && (
              <div style={{ flex: stats.raisingBonds / totalSegments, background: "var(--acid)", borderRadius: 5, transition: "flex 0.5s" }} title={`${stats.raisingBonds} Raising`} />
            )}
            {stats.activeBonds > 0 && (
              <div style={{ flex: stats.activeBonds / totalSegments, background: "var(--cyan)", borderRadius: 5, transition: "flex 0.5s" }} title={`${stats.activeBonds} Active`} />
            )}
            {stats.otherBonds > 0 && (
              <div style={{ flex: stats.otherBonds / totalSegments, background: "var(--void-elevated)", borderRadius: 5, transition: "flex 0.5s" }} title={`${stats.otherBonds} Closed`} />
            )}
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
            {[
              { label: "Raising", count: stats.raisingBonds, color: "var(--acid)" },
              { label: "Active", count: stats.activeBonds, color: "var(--cyan)" },
              { label: "Closed", count: stats.otherBonds, color: "var(--text-dim)" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
                  {s.label} <strong style={{ color: "var(--text-primary)" }}>{s.count}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Two leaderboards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
          marginBottom: 28,
        }}
      >
        {/* Top by volume */}
        <div className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
              Top by Volume Raised
            </span>
          </div>
          {topByRaised.length === 0 ? (
            <p style={{ color: "var(--text-dim)", fontSize: 13 }}>No data yet.</p>
          ) : (
            topByRaised.map((b, i) => (
              <RankRow
                key={b.id}
                rank={i + 1}
                name={b.name}
                symbol={`$${b.symbol}`}
                href={`/bonds/${b.bondContract}`}
                barPct={(b.totalRaised / maxRaised) * 100}
                barColor="var(--cyan)"
                valueLabel={`${b.totalRaised.toFixed(1)} ℏ`}
                state={b.state}
              />
            ))
          )}
        </div>

        {/* Top by APR */}
        <div className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--acid)" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
              Highest APR
            </span>
          </div>
          {topByApr.length === 0 ? (
            <p style={{ color: "var(--text-dim)", fontSize: 13 }}>No data yet.</p>
          ) : (
            topByApr.map((b, i) => (
              <RankRow
                key={b.id}
                rank={i + 1}
                name={b.name}
                symbol={`$${b.symbol}`}
                href={`/bonds/${b.bondContract}`}
                barPct={(b.yieldRateBps / maxApr) * 100}
                barColor="var(--acid)"
                valueLabel={`${(b.yieldRateBps / 100).toFixed(1)}%`}
                state={b.state}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Full table ── */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "20px 22px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
              All Bonds
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", marginLeft: "auto" }}>
              Click column to sort
            </span>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr>
                {(
                  [
                    ["name", "Bond"],
                    ["state", "Status"],
                    ["raised", "Raised (ℏ)"],
                    ["apr", "APR"],
                    ["supply", "Supply"],
                    ["yield", "Yield Minted"],
                    ["backers", "Backers"],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <th key={key} style={thStyle(key)} onClick={() => handleSort(key)}>
                    {label}
                    {sortKey === key && (
                      <span style={{ marginLeft: 4 }}>{sortAsc ? "↑" : "↓"}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((b) => (
                <tr
                  key={b.id}
                  style={{ transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--void-surface)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "11px 12px" }}>
                    <Link href={`/bonds/${b.bondContract}`} style={{ textDecoration: "none" }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>{b.name}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)" }}>${b.symbol}</div>
                    </Link>
                  </td>
                  <td style={{ padding: "11px 12px" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 700,
                        color: STATE_COLOR[b.state] ?? "var(--text-dim)",
                        background: `color-mix(in srgb, ${STATE_COLOR[b.state] ?? "var(--text-dim)"} 12%, transparent)`,
                        padding: "3px 8px",
                        borderRadius: 999,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {STATE_LABEL[b.state] ?? "—"}
                    </span>
                  </td>
                  <td style={{ padding: "11px 12px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
                    {b.totalRaised.toFixed(2)}
                  </td>
                  <td style={{ padding: "11px 12px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--acid)", fontWeight: 700 }}>
                    {(b.yieldRateBps / 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: "11px 12px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)" }}>
                    {fmt(b.totalSupply)}
                  </td>
                  <td style={{ padding: "11px 12px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)" }}>
                    {fmt(b.totalYieldMinted)}
                  </td>
                  <td style={{ padding: "11px 12px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-secondary)" }}>
                    {b.contributors}
                  </td>
                </tr>
              ))}
              {bonds.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-body)", fontSize: 14 }}>
                    No bonds deployed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
