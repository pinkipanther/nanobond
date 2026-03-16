"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useEffect, useState } from "react";
import { Magic } from "magic-sdk";

export default function AdminLoginPage() {
    const { address, isConnected, connector } = useAccount();
    const { connectors, connect } = useConnect();
    const { disconnect } = useDisconnect();
    
    const [magicInstance, setMagicInstance] = useState<Magic | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");

    const isMagic = connector?.id === "magic" || connector?.name.toLowerCase().includes("magic");

    useEffect(() => {
        if (isMagic && typeof window !== "undefined") {
            const apiKey = process.env.NEXT_PUBLIC_MAGIC_API_KEY || "pk_live_0000000000000000";
            const magic = new Magic(apiKey);
            setMagicInstance(magic);
        }
    }, [isMagic]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const magicConnector = connectors.find((c) => c.id === "magic" || c.name.toLowerCase().includes("magic"));
        if (magicConnector) {
            connect({ connector: magicConnector });
        } else {
            alert("Magic connector not found.");
        }
    };

    const handleExportKey = async () => {
        if (!magicInstance) {
            alert("Magic instance not initialized.");
            return;
        }
        setIsLoading(true);
        try {
            await magicInstance.user.revealEVMPrivateKey();
        } catch (e) {
            console.error("Failed to reveal private key", e);
            alert("Failed to reveal private key");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "120px 24px" }}>
            <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, marginBottom: 16 }}>
                    Admin / Magic Login
                </h1>
                
                {!isConnected ? (
                    <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                            Select the Magic connector to log in via Email.
                        </p>
                        <button type="submit" className="btn-primary" style={{ padding: "12px 24px" }}>
                            Log in with Magic
                        </button>
                    </form>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        <div style={{ background: "var(--void-surface)", padding: 16, borderRadius: 12, border: "1px solid var(--void-border)" }}>
                            <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8, textTransform: "uppercase" }}>Connected Address</div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--cyan)", wordBreak: "break-all" }}>
                                {address}
                            </div>
                        </div>

                        {isMagic ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <button 
                                    className="btn-primary" 
                                    onClick={handleExportKey} 
                                    disabled={isLoading}
                                    style={{ background: "#6851ff", color: "white" }}
                                >
                                    {isLoading ? "Loading..." : "Reveal Private Key"}
                                </button>
                                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                    This will open the Magic SDK UI to reveal your private key.
                                </p>
                            </div>
                        ) : (
                            <p style={{ color: "var(--magenta)", fontSize: 14 }}>
                                You are not connected via Magic Link. Please disconnect and use Magic.
                            </p>
                        )}

                        <button 
                            className="btn-secondary" 
                            onClick={() => disconnect()}
                        >
                            Disconnect
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
