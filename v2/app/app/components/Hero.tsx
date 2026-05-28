"use client";

import Link from "next/link";

export default function Hero() {
    return (
        <section
            id="hero"
            style={{
                position: "relative",
                padding: "168px 0 108px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
            }}
        >
            <div className="hero-aura" />
            <div className="hero-aura hero-aura-secondary" />
            <div
                style={{
                    position: "relative",
                    zIndex: 10,
                    textAlign: "center",
                    maxWidth: 980,
                    padding: "0 24px",
                }}
            >
                <div
                    className="hero-chip"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "7px 16px",
                        marginBottom: 32,
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                    }}
                >
                    <span className="status-dot" />
                    Live on Hedera
                </div>

                <h1
                    style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        lineHeight: 1.03,
                        marginBottom: 22,
                        letterSpacing: "-0.04em",
                    }}
                >
                    <span
                        style={{
                            display: "block",
                            fontSize: "clamp(44px, 8vw, 84px)",
                            color: "var(--text-primary)",
                        }}
                    >
                        Build bond markets
                    </span>
                    <span
                        style={{
                            display: "block",
                            fontSize: "clamp(44px, 8vw, 84px)",
                            color: "transparent",
                            backgroundImage:
                                "linear-gradient(90deg, #6366f1, #818cf8 55%, #a78bfa)",
                            backgroundClip: "text",
                            WebkitBackgroundClip: "text",
                        }}
                    >
                        with NanoBond
                    </span>
                </h1>

                <p
                    style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(16px, 2vw, 19px)",
                        color: "var(--text-secondary)",
                        maxWidth: 670,
                        margin: "0 auto 44px",
                        lineHeight: 1.6,
                        fontWeight: 500,
                    }}
                >
                    Launch, manage, and trade token bond sales on Hedera with
                    creator-set APR, holder reward distribution, and
                    HashPack wallet flows.
                </p>

                <div
                    style={{
                        display: "flex",
                        gap: 16,
                        justifyContent: "center",
                        flexWrap: "wrap",
                        marginBottom: 68,
                    }}
                >
                    <Link
                        href="/create"
                        className="btn-primary hero-cta"
                        style={{
                            fontSize: 15,
                            padding: "15px 34px",
                            textDecoration: "none",
                        }}
                    >
                        Start a Bond Sale
                    </Link>
                    <Link
                        href="/pro"
                        className="btn-secondary"
                        style={{
                            fontSize: 15,
                            padding: "15px 34px",
                            textDecoration: "none",
                        }}
                    >
                        Open Nano Pro
                    </Link>
                </div>
            </div>
        </section>
    );
}
