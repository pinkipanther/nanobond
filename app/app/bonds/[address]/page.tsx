"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import BondDetail from "../../components/BondDetail";
import { useBonds } from "../../lib/hooks";

export default function BondDetailPage({ params }: { params: Promise<{ address: string }> }) {
    const { address } = use(params);
    const router = useRouter();
    const { bonds, isLoading } = useBonds();

    const bond = bonds.find(
        (b) => b.bondContract.toLowerCase() === address.toLowerCase()
    );

    if (isLoading) {
        return (
            <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}>
                <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 16, animation: "float 2s ease-in-out infinite" }}>⏳</div>
                    <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontWeight: 600 }}>
                        Loading bond data from Hedera...
                    </p>
                </div>
            </div>
        );
    }

    if (!bond) {
        return (
            <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}>
                <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12 }}>
                        Bond Not Found
                    </h2>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-dim)", marginBottom: 24, wordBreak: "break-all" }}>
                        {address}
                    </p>
                    <button className="btn-primary" onClick={() => router.push("/")} style={{ padding: "12px 32px" }}>
                        ← Back to Bonds
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}>
            <BondDetail bond={bond} onBack={() => router.push("/")} />
        </div>
    );
}
