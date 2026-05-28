"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useWallet } from "../lib/wallet";

export default function EmailPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const wallet = useWallet();

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem("hasSeenEmailPopup");
    if (!hasSeenPopup) {
      const timer = setTimeout(() => setIsOpen(true), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const closePopup = () => {
    setIsOpen(false);
    localStorage.setItem("hasSeenEmailPopup", "true");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      await addDoc(collection(db, "subscribers"), {
        email,
        walletAddress: wallet.evmAddress ?? wallet.accountId,
        timestamp: serverTimestamp(),
      });
      setStatus("success");
      setTimeout(() => closePopup(), 2000);
    } catch (error) {
      console.error("Error adding document: ", error);
      setStatus("error");
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20 }} onClick={(e) => { if (e.target === e.currentTarget) closePopup(); }}>
      <div className="glass-card" style={{ position: "relative", width: "100%", maxWidth: 420, background: "var(--void-light)", border: "1px solid var(--void-border)", borderRadius: "var(--radius-lg)", boxShadow: "0 24px 48px rgba(7,12,20,0.4)", padding: 32, textAlign: "center" }}>
        <button onClick={closePopup} style={{ position: "absolute", top: 12, right: 12, background: "var(--void-surface)", border: "1px solid var(--void-border)", borderRadius: 999, color: "var(--text-secondary)", width: 28, height: 28, cursor: "pointer" }}>x</button>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--text-primary)", marginBottom: 8 }}>Stay Updated</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 20 }}>Get NanoBond testnet updates and launch notifications.</p>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid var(--void-border)", background: "var(--void-surface)", color: "var(--text-primary)" }} />
          <button className="btn-primary" type="submit" disabled={status === "loading"}>{status === "loading" ? "Saving..." : "Subscribe"}</button>
          {status === "success" && <span style={{ color: "var(--acid)", fontSize: 12 }}>Saved</span>}
          {status === "error" && <span style={{ color: "var(--magenta)", fontSize: 12 }}>Could not save email.</span>}
        </form>
      </div>
    </div>
  );
}
