"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Hero() {
    const [counts, setCounts] = useState({
        launches: 0,
        raised: 0,
        backers: 0,
    });

    // Animate counters
    useEffect(() => {
        const targets = { launches: 142, raised: 2847, backers: 5623 };
        const duration = 2000;
        const start = Date.now();

        const animate = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            setCounts({
                launches: Math.floor(targets.launches * eased),
                raised: Math.floor(targets.raised * eased),
                backers: Math.floor(targets.backers * eased),
            });

            if (progress < 1) requestAnimationFrame(animate);
        };

        const timer = setTimeout(animate, 500);
        return () => clearTimeout(timer);
    }, []);

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
                                "linear-gradient(90deg, #1696b8, #2fb9b2 55%, #0fa483)",
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
                    Launch, manage, and earn yield from token bond sales on Hedera with
                    auto-staking, epoch-based yield distribution, and
                    instant wallet flows tuned for HashPack.
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
                        href="/bonds"
                        className="btn-secondary"
                        style={{
                            fontSize: 15,
                            padding: "15px 34px",
                            textDecoration: "none",
                        }}
                    >
                        Browse Markets
                    </Link>
                </div>
            </div>
        </section>
    );
}
