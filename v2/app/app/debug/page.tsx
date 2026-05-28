"use client";

import { useBonds } from "../lib/hooks";
import { CONTRACTS, HEDERA_CHAIN_ID, HEDERA_JSON_RPC_URL, HEDERA_NETWORK } from "../lib/contracts";

export default function DebugPage() {
  const { bonds, isLoading, error, count } = useBonds();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "96px 24px 80px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)", marginBottom: 32 }}>Contract Debug</h1>
      <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ color: "var(--cyan)", marginBottom: 16, fontFamily: "var(--font-display)" }}>V2 Config</h3>
        <pre style={{ color: "var(--text-secondary)", fontSize: 13, fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap" }}>{`Network: ${HEDERA_NETWORK}\nChain ID: ${HEDERA_CHAIN_ID}\nRPC: ${HEDERA_JSON_RPC_URL}\nFactory: ${CONTRACTS.FACTORY || "missing"}`}</pre>
      </div>
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ color: "var(--cyan)", marginBottom: 16, fontFamily: "var(--font-display)" }}>Bond Reads</h3>
        <pre style={{ color: "var(--text-secondary)", fontSize: 13, fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap" }}>{JSON.stringify({ isLoading, count, error: error?.message, bonds: bonds.slice(0, 3) }, null, 2)}</pre>
      </div>
    </div>
  );
}
