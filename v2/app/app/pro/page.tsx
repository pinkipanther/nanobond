"use client";

import { useBonds } from "../lib/hooks";
import ProTerminal from "./components/ProTerminal";

export default function ProPage() {
  const { bonds, isLoading } = useBonds();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100vh - 76px)",
          flexDirection: "column",
          gap: 20,
          background: "radial-gradient(ellipse at center, #0f1520 0%, #060a12 100%)",
        }}
      >
        <div style={{ position: "relative", width: 56, height: 56 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "2px solid #1a2540",
              borderTopColor: "#6366f1",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 8,
              borderRadius: "50%",
              border: "2px solid #1a2540",
              borderBottomColor: "#10b981",
              animation: "spin 1.2s linear infinite reverse",
            }}
          />
        </div>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 15,
              color: "#e8f0ee",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 6,
            }}
          >
            Loading Markets
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#5a6a85",
              fontFamily: "var(--font-mono)",
            }}
          >
            Fetching bond data and pool states...
          </div>
        </div>
      </div>
    );
  }

  return <ProTerminal bonds={bonds} />;
}
