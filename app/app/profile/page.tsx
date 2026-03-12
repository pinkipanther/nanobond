"use client";

import { useAccount, useDisconnect, useBalance } from "wagmi";
import { formatEther } from "viem";
import { useEffect, useState } from "react";
import { Magic } from "magic-sdk";

export default function ProfilePage() {
    const { address, isConnected, connector } = useAccount();
    const { data: balanceData } = useBalance({ address });
    const { disconnect } = useDisconnect();
    const [magicInstance, setMagicInstance] = useState<Magic | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const isMagic = connector?.id === "magic" || connector?.name.toLowerCase().includes("magic");

    useEffect(() => {
        if (isMagic && typeof window !== "undefined") {
            const apiKey = process.env.NEXT_PUBLIC_MAGIC_API_KEY || "pk_live_0000000000000000";
            const magic = new Magic(apiKey);
            setMagicInstance(magic);

            // Try to fetch user info if available
            magic.user.getInfo().then((info) => {
                if (info.email) {
                    setUserEmail(info.email);
                }
            }).catch(console.error);
        }
    }, [isMagic]);

    const handleShowSettings = async () => {
        if (!magicInstance) return;
        setIsLoading(true);
        try {
            await magicInstance.user.showSettings();
        } catch (e) {
            console.error("Failed to show settings", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportKey = async () => {
        if (!magicInstance) return;
        setIsLoading(true);
        try {
            await magicInstance.user.revealEVMPrivateKey();
        } catch (e) {
            console.error("Failed to reveal private key", e);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isConnected) {
        return (
            <div style={{ maxWidth: 1400, margin: "0 auto", padding: "96px 24px 80px" }}>
                <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12 }}>
                        Not Connected
                    </h2>
                    <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", marginBottom: 24 }}>
                        Please connect your wallet to view your profile.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "96px 24px 80px" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, marginBottom: 8, color: "var(--text-primary)" }}>
                Your Profile
            </h2>
            <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>
                Manage your connected wallet and account settings.
            </p>

            <div className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                    <div>
                        <div style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                            Connected Address
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--cyan)", fontWeight: 600, wordBreak: "break-all" }}>
                            {address}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                            Current Balance
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--acid)", fontWeight: 600, wordBreak: "break-all" }}>
                            {balanceData ? `${parseFloat(formatEther(balanceData.value)).toFixed(4)} ${balanceData.symbol}` : "0 HBAR"}
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                        Wallet Provider
                    </div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-primary)", fontWeight: 500 }}>
                        {isMagic ? "Email Login (Magic Link)" : connector?.name || "Unknown Wallet"}
                    </div>
                </div>

                {isMagic && userEmail && (
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
                            Email Address
                        </div>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-primary)", fontWeight: 500 }}>
                            {userEmail}
                        </div>
                    </div>
                )}

                <div style={{ borderTop: "1px solid var(--void-border)", paddingTop: 24, marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button 
                        className="btn-secondary" 
                        onClick={() => disconnect()}
                        style={{ color: "var(--magenta)", borderColor: "rgba(244, 67, 54, 0.3)" }}
                    >
                        Disconnect Wallet
                    </button>
                </div>
            </div>

            {isMagic && (
                <div className="glass-card" style={{ padding: 32, borderLeft: "3px solid #6851ff" }}>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: "#6851ff", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontFamily: "var(--font-display)" }}>@</div>
                        Magic Link Settings
                    </h3>
                    <p style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                        Because you logged in using your email, your wallet is secured by Magic. You can manage your account settings (like recovery) or securely export your private key to use in another wallet like HashPack or MetaMask.
                    </p>
                    
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <button 
                            className="btn-primary" 
                            onClick={handleShowSettings}
                            disabled={isLoading}
                            style={{ background: "#6851ff", color: "white" }}
                        >
                            {isLoading ? "Loading..." : "Account Settings"}
                        </button>
                        <button 
                            className="btn-secondary" 
                            onClick={handleExportKey}
                            disabled={isLoading}
                        >
                            {isLoading ? "Loading..." : "Export Private Key"}
                        </button>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 16 }}>
                        <strong style={{ color: "var(--magenta)" }}>Warning:</strong> Never share your private key with anyone. Anyone with your private key has full control over your funds.
                    </p>
                </div>
            )}
        </div>
    );
}
