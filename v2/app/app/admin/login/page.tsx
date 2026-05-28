"use client";

import { ConnectWalletInline } from "../../components/ConnectWallet";
import { HEDERA_NETWORK } from "../../lib/contracts";
import { tinybarsToHbar, useWallet } from "../../lib/wallet";

export default function AdminLoginPage() {
  const wallet = useWallet();

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "120px 24px" }}>
      <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, marginBottom: 16 }}>Admin Wallet</h1>
        {!wallet.isConnected ? (
          <div style={{ display: "grid", gap: 16 }}>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>V2 admin access uses WalletConnect on Hedera {HEDERA_NETWORK}.</p>
            <ConnectWalletInline />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ background: "var(--void-surface)", padding: 16, borderRadius: 12, border: "1px solid var(--void-border)" }}>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8, textTransform: "uppercase" }}>Connected Account</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--cyan)", wordBreak: "break-all" }}>{wallet.accountId}</div>
              {wallet.evmAddress && <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", wordBreak: "break-all", marginTop: 8 }}>{wallet.evmAddress}</div>}
              <div style={{ color: "var(--acid)", marginTop: 12 }}>{tinybarsToHbar(wallet.balanceTinybar)} HBAR</div>
            </div>
            <button className="btn-secondary" onClick={() => void wallet.disconnect()}>Disconnect</button>
          </div>
        )}
      </div>
    </div>
  );
}
