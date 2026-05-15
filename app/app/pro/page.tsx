"use client";

import { useBonds } from "../lib/hooks";
import ProTerminal from "./components/ProTerminal";

export default function ProPage() {
    const { bonds, isLoading } = useBonds();

    if (isLoading) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "calc(100vh - 76px)",
                    flexDirection: "column",
                    gap: 16,
                }}
            >
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        border: "3px solid #22332f",
                        borderTopColor: "#1696b8",
                        animation: "spin 0.8s linear infinite",
                    }}
                />
                <style jsx>{`
                    @keyframes spin {
                        to {
                            transform: rotate(360deg);
                        }
                    }
                `}</style>
                <span
                    style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#556b65",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                    }}
                >
                    Loading markets...
                </span>
            </div>
        );
    }

    return <ProTerminal bonds={bonds} />;
}
