"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { walletIcons } from "@web3icons/react";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isHashPackConnector(name: string) {
  return name.toLowerCase().includes("hash");
}

function isUnsupportedHederaWallet(name: string) {
  const n = name.toLowerCase();
  return n.includes("phantom");
}

function WalletLogo({ name, size = 34 }: { name: string; size?: number }) {
  const n = name.toLowerCase();
  const iconStyle = { width: size, height: size };

  if (n.includes("walletconnect") || n.includes("wallet connect")) {
    return <walletIcons.WalletWalletConnect style={iconStyle} />;
  }
  if (n.includes("meta")) {
    return <walletIcons.WalletMetamask style={iconStyle} />;
  }
  if (n.includes("coinbase") || n.includes("coin base") || n.includes("coin")) {
    return <walletIcons.WalletCoinbase style={iconStyle} />;
  }
  if (n.includes("rabby")) return <walletIcons.WalletRabby style={iconStyle} />;
  if (n.includes("trust")) return <walletIcons.WalletTrust style={iconStyle} />;
  if (n.includes("okx")) return <walletIcons.WalletOkx style={iconStyle} />;

  if (n.includes("magic")) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          background: "#6851ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{color: "white", fontWeight: "bold", fontSize: size * 0.5, fontFamily: "var(--font-display)"}}>@</span>
      </div>
    );
  }

  if (n.includes("hash")) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          background: "linear-gradient(135deg, #3b2085, #6b4aff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 2L4 7v10l8 5 8-5V7l-8-5z"
            fill="white"
            fillOpacity="0.15"
          />
          <path d="M12 6l-4 2.5v5L12 16l4-2.5v-5L12 6z" fill="white" />
          <circle cx="12" cy="12" r="2" fill="#6b4aff" />
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: "var(--void-surface)",
        border: "1px solid var(--void-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: size * 0.35,
          fontWeight: 700,
          color: "var(--text-secondary)",
        }}
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}

async function copyTextSafe(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { }
  }

  if (typeof document !== "undefined") {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "absolute";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(input);
    return ok;
  }

  return false;
}

export function ConnectWalletButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <button
        className="wallet-connect-btn-v2"
        style={{ opacity: 0 }}
        type="button"
      >
        <span>Connect Wallet</span>
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div style={{ position: "relative" }} ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((p) => !p)}
          className="wallet-connected-btn"
          type="button"
        >
          <span className="wallet-live-dot" />
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
            {shortAddress(address)}
          </span>
          <span style={{ opacity: 0.65, fontSize: 11 }}>
            {dropdownOpen ? "▲" : "▼"}
          </span>
        </button>

        {dropdownOpen && (
          <div
            className="wallet-dropdown-menu"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              zIndex: 1000,
            }}
          >
            <div className="wallet-dropdown-head">
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-dim)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Connected
              </div>
              <div
                style={{
                  fontSize: 13,
                  marginTop: 4,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-primary)",
                }}
              >
                {shortAddress(address)}
              </div>
            </div>

            <button
              className="wallet-dropdown-item"
              type="button"
              onClick={async () => {
                const ok = await copyTextSafe(address);
                setCopied(ok);
                setTimeout(() => setCopied(false), 1200);
              }}
            >
              {copied ? "Address Copied" : "Copy Address"}
            </button>
            <button
              className="wallet-dropdown-item"
              style={{ color: "var(--magenta)" }}
              type="button"
              onClick={() => {
                disconnect();
                setDropdownOpen(false);
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        className="wallet-connect-btn-v2"
        onClick={() => setModalOpen(true)}
        type="button"
      >
        <WalletLogo name="HashPack" size={18} />
        <span>Connect Wallet</span>
      </button>
      <WalletModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export function ConnectWalletInline({
  label = "Connect Wallet",
}: {
  label?: string;
}) {
  const { isConnected } = useAccount();
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isConnected) return null;

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <button
        className="wallet-connect-btn-v2"
        style={{ width: "100%", padding: "14px 16px" }}
        onClick={() =>
          setModalOpen(true)}
        type="button"
      >
        <WalletLogo name="HashPack" size={18} />
        <span>{label}</span>
      </button>
      <WalletModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function WalletModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { connectors, connect, error, isPending } = useConnect();
  const { isConnected } = useAccount();
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && isOpen) onClose();
  }, [isConnected, isOpen, onClose]);

  if (!isOpen) return null;

  const available = connectors.filter(
    (c) => !isUnsupportedHederaWallet(c.name)
  );
  const hashpack = available.find((c) => isHashPackConnector(c.name));
  const walletConnectConnector = available.find(
    (c) => c.type === "walletConnect",
  );
  const magicConnector = available.find((c) => c.name.toLowerCase().includes("magic") || c.id === "magic");
  const primary = hashpack ?? walletConnectConnector ?? available[0];
  const others = available.filter((c) => c.uid !== primary?.uid);

  const onConnect = async (connector: (typeof connectors)[number]) => {
    try {
      setLocalError(null);
      connect({ connector });
    } catch (e: unknown) {
      setLocalError(e instanceof Error ? e.message : "Connection failed");
    }
  };

  return createPortal(
    <div
      className="wallet-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="wallet-modal-shell-v2">
        <button className="wallet-modal-close" onClick={onClose} type="button">
          ✕
        </button>

        <div style={{ marginBottom: 18 }}>
          <div className="wallet-network-pill">Hedera Mainnet</div>
          <h3 className="wallet-modal-title">Connect your wallet</h3>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <button
            className="wallet-choice primary"
            disabled={!primary || isPending}
            onClick={() => primary && onConnect(primary)}
            type="button"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <WalletLogo name={primary?.name || "HashPack"} />
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontFamily: "var(--font-display)",
                    color: "var(--text-primary)",
                  }}
                >
                  {primary?.name || "HashPack"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {hashpack
                    ? "Recommended for Hedera"
                    : "Primary wallet option"}
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                color: "var(--text-secondary)",
              }}
            >
              Connect
            </span>
          </button>

          {!hashpack && (
            <a
              className="wallet-hashpack-link"
              href="https://www.hashpack.app/"
              target="_blank"
              rel="noreferrer"
            >
              Install HashPack extension
            </a>
          )}

          {!hashpack && walletConnectConnector && (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                textAlign: "center",
                marginTop: -4,
              }}
            >
              You can connect HashPack using WalletConnect QR.
            </div>
          )}

          {others.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div className="wallet-other-label">Other wallets</div>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {others.map((c) => (
                  <button
                    key={c.uid}
                    className="wallet-choice"
                    disabled={isPending}
                    onClick={() => onConnect(c)}
                    type="button"
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <WalletLogo name={c.name} />
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {c.name.toLowerCase().includes("magic") ? "Email (Magic)" : c.name}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Connect
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {available.length === 0 && (
            <div className="wallet-empty-state">
              No supported wallet found in this browser.
            </div>
          )}
        </div>

        {isPending && (
          <div className="wallet-pending-state">
            Waiting for wallet confirmation...
          </div>
        )}
        {(error || localError) && (
          <div className="wallet-error-state">
            {localError || error?.message || "Connection failed"}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
