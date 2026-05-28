"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "./ConnectWallet";
import { useState } from "react";

export default function Navbar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const navItems = [
        { href: "/bonds", label: "Bonds" },
        { href: "/trade", label: "Trade" },
        { href: "/pro", label: "Pro" },
        { href: "/create", label: "Create" },
        { href: "/portfolio", label: "Portfolio" },
        { href: "/analytics", label: "Analytics" },
        { href: "/profile", label: "Profile" },
    ];

    const isActive = (href: string) => {
        if (href === "/bonds") return pathname === "/bonds" || pathname.startsWith("/bonds/");
        return pathname === href;
    };

    return (
        <nav
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                background: "rgba(8, 12, 20, 0.85)",
                backdropFilter: "blur(18px)",
                borderBottom: "1px solid #1e2d45",
            }}
        >
            <div
                style={{
                    maxWidth: 1400,
                    margin: "0 auto",
                    padding: "0 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    height: 76,
                }}
            >
                {/* Logo */}
                <Link
                    href="/"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                        textDecoration: "none",
                    }}
                >
                    <span
                        style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            fontSize: 24,
                            color: "var(--text-primary)",
                            letterSpacing: "-0.03em",
                        }}
                    >
                        NanoBond
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: 6,
                        borderRadius: 999,
                        background: "rgba(13, 20, 32, 0.72)",
                        border: "1px solid #1e2d45",
                    }}
                    className="hidden md:flex"
                >
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            style={{
                                padding: "8px 16px",
                                borderRadius: 999,
                                border: "none",
                                background: isActive(item.href)
                                    ? "linear-gradient(135deg, #6366f1, #818cf8)"
                                    : "transparent",
                                color: isActive(item.href)
                                    ? "#fff"
                                    : "var(--text-secondary)",
                                fontFamily: "var(--font-body)",
                                fontWeight: 600,
                                fontSize: 13,
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                textTransform: "uppercase",
                                letterSpacing: "0.07em",
                                textDecoration: "none",
                                boxShadow: isActive(item.href) ? "0 8px 20px rgba(99,102,241,0.3)" : "none",
                            }}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* Wallet */}
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <ConnectWalletButton />

                    {/* Mobile menu toggle */}
                    <button
                        className="md:hidden"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        style={{
                            background: "var(--void-light)",
                            border: "1px solid var(--void-border)",
                            borderRadius: 12,
                            color: "var(--text-primary)",
                            fontSize: 18,
                            cursor: "pointer",
                            padding: "8px 10px",
                        }}
                    >
                        {mobileOpen ? "✕" : "☰"}
                    </button>
                </div>
            </div>

            {/* Mobile nav */}
            {mobileOpen && (
                <div
                    className="md:hidden"
                    style={{
                        padding: "8px 24px 20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        borderTop: "1px solid var(--void-border)",
                        background: "rgba(13, 20, 32, 0.98)",
                    }}
                >
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            style={{
                                padding: "12px 14px",
                                borderRadius: 12,
                                border: "none",
                                background: isActive(item.href)
                                    ? "linear-gradient(135deg, rgba(99,102,241,0.16), rgba(167,139,250,0.2))"
                                    : "transparent",
                                color: isActive(item.href)
                                    ? "#818cf8"
                                    : "var(--text-secondary)",
                                fontFamily: "var(--font-body)",
                                fontWeight: 600,
                                fontSize: 14,
                                cursor: "pointer",
                                textAlign: "left",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                textDecoration: "none",
                            }}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            )}
        </nav>
    );
}
