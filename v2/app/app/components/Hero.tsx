"use client";

import Link from "next/link";

export default function Hero() {
    return (
        <section
            id="hero"
            style={{
                position: "relative",
                padding: "180px 0 120px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                background: "var(--void)",
            }}
        >
            <div
                style={{
                    position: "relative",
                    zIndex: 10,
                    textAlign: "center",
                    maxWidth: 1020,
                    padding: "0 24px",
                }}
            >
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 20px",
                        marginBottom: 40,
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                        borderRadius: 999,
                        animation: "fade-in-up 0.8s ease-out forwards",
                    }}
                >
                    <span 
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "var(--acid)",
                        }}
                    />
                    Live on Hedera
                </div>

                <h1
                    style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        lineHeight: 1.05,
                        marginBottom: 32,
                        letterSpacing: "-0.03em",
                        animation: "fade-in-up 1s ease-out forwards",
                    }}
                >
                    <span
                        style={{
                            display: "block",
                            fontSize: "clamp(48px, 8vw, 92px)",
                            color: "var(--text-primary)",
                            marginBottom: 8,
                        }}
                    >
                        Build bond markets
                    </span>
                    <span
                        style={{
                            display: "block",
                            fontSize: "clamp(48px, 8vw, 92px)",
                            color: "var(--cyan)",
                        }}
                    >
                        with NanoBond
                    </span>
                </h1>

                <p
                    style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(16px, 2.5vw, 20px)",
                        color: "var(--text-secondary)",
                        maxWidth: 720,
                        margin: "0 auto 52px",
                        lineHeight: 1.6,
                        fontWeight: 500,
                        animation: "fade-in-up 1.2s ease-out forwards",
                        opacity: 0.9,
                    }}
                >
                    Launch, manage, and trade token bond sales on Hedera with
                    creator-set APR, holder reward distribution, and seamless
                    HashPack wallet flows.
                </p>

                <div
                    style={{
                        display: "flex",
                        gap: 20,
                        justifyContent: "center",
                        flexWrap: "wrap",
                        marginBottom: 68,
                        animation: "fade-in-up 1.4s ease-out forwards",
                    }}
                >
                    <Link
                        href="/create"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 15,
                            fontWeight: 700,
                            fontFamily: "var(--font-body)",
                            padding: "16px 40px",
                            textDecoration: "none",
                            background: "var(--cyan)",
                            color: "var(--void)",
                            borderRadius: 12,
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                        }}
                    >
                        Start a Bond Sale
                    </Link>
                    <Link
                        href="/pro"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 15,
                            fontWeight: 700,
                            fontFamily: "var(--font-body)",
                            padding: "16px 40px",
                            textDecoration: "none",
                            background: "var(--void-surface)",
                            color: "var(--text-primary)",
                            borderRadius: 12,
                            border: "1px solid var(--void-border)",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--void-elevated)";
                            e.currentTarget.style.borderColor = "var(--cyan)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "var(--void-surface)";
                            e.currentTarget.style.borderColor = "var(--void-border)";
                        }}
                    >
                        Open Nano Pro
                    </Link>
                </div>
            </div>
            
            <style jsx>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </section>
    );
}
