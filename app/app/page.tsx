"use client";

import { useState } from "react";
import Link from "next/link";
import Hero from "./components/Hero";
import BondCard from "./components/BondCard";
import { useBonds } from "./lib/hooks";

export default function Home() {
  const [filter, setFilter] = useState<"all" | "raising" | "active">("all");
  const { bonds, isLoading, count } = useBonds();

  const filteredBonds = bonds.filter((b) => {
    if (filter === "raising") return b.state === 0;
    if (filter === "active") return b.state === 1;
    return true;
  });

  return (
    <div>
      <Hero />

      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <section id="bonds">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 32,
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 800,
                  marginBottom: 8,
                  color: "var(--text-primary)",
                }}
              >
                Bond Marketplace
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--text-secondary)",
                  fontSize: 14,
                }}
              >
                {isLoading
                  ? "Loading bonds from chain..."
                  : count > 0
                    ? `${count} bond${count !== 1 ? "s" : ""} on Hedera`
                    : "No bonds yet — be the first to create one!"}
              </p>
            </div>

            <div className="tab-group">
              {[
                { id: "all" as const, label: "All" },
                { id: "raising" as const, label: "Raising" },
                { id: "active" as const, label: "Active" },
              ].map((f) => (
                <button
                  key={f.id}
                  className={`tab-item ${filter === f.id ? "active" : ""}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading && (
            <div
              className="glass-card"
              style={{ padding: 60, textAlign: "center" }}
            >
              <div style={{ fontSize: 48, marginBottom: 16, animation: "float 2s ease-in-out infinite" }}>⏳</div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                }}
              >
                Loading bonds from Hedera Mainnet...
              </p>
            </div>
          )}

          {!isLoading && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 16,
              }}
            >
              {filteredBonds.map((bond) => (
                <Link
                  key={bond.id}
                  href={`/bonds/${bond.bondContract}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <BondCard bond={bond} />
                </Link>
              ))}
            </div>
          )}

          {!isLoading && filteredBonds.length === 0 && (
            <div
              className="glass-card"
              style={{ padding: 60, textAlign: "center" }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--text-dim)",
                }}
              >
                {count === 0
                  ? "No bonds deployed yet. Create the first one!"
                  : "No bonds found with the selected filter"}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
