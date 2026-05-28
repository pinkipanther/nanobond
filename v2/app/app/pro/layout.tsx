import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
    title: "NanoBond Pro — Secondary Bond Market",
    description: "Professional bond token trading terminal on Hedera.",
};

export default function ProLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div
            style={{
                paddingTop: 76,
                minHeight: "100vh",
                background: "#0b1018",
                display: "flex",
                flexDirection: "column",
                color: "#e8f0ee",
                /* Override CSS variables for dark pro mode */
                ["--void" as keyof CSSProperties]: "#0b1018",
                ["--void-light" as keyof CSSProperties]: "#0e1420",
                ["--void-surface" as keyof CSSProperties]: "#131a28",
                ["--void-elevated" as keyof CSSProperties]: "#192133",
                ["--void-border" as keyof CSSProperties]: "#1e2d45",
                ["--text-primary" as keyof CSSProperties]: "#e8f0ee",
                ["--text-secondary" as keyof CSSProperties]: "#9aa6b8",
                ["--text-dim" as keyof CSSProperties]: "#74839a",
                ["--inverted" as keyof CSSProperties]: "#0b1018",
            }}
        >
            {children}
        </div>
    );
}
