import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "./lib/wallet";
import Navbar from "./components/Navbar";
import FirebaseAnalytics from "./components/FirebaseAnalytics";
import EmailPopup from "./components/EmailPopup";

export const metadata: Metadata = {
  title: "NanoBond — Token Launchpad on Hedera",
  description:
    "Fair launch tokens with automatic LP creation and transparent fundraising on Hedera.",
  keywords: ["hedera", "token", "launchpad", "DeFi", "crypto"],
};

function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--void-border)",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 14,
              color: "var(--text-secondary)",
            }}
          >
            NANOBOND
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-dim)",
          }}
        >
          built with love by team nanobond
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {["Docs", "GitHub", "Discord", "Twitter"].map((link) => (
            <a
              key={link}
              href="#"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: "var(--text-secondary)",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="noise-overlay grid-bg">
        <FirebaseAnalytics />
        <EmailPopup />
        <WalletProvider>
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <Navbar />
            <main style={{ flex: 1 }}>{children}</main>
            <Footer />
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
