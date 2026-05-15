import type { Metadata } from "next";

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
                background: "#0b0f0e",
                display: "flex",
                flexDirection: "column",
                color: "#e8f0ee",
                /* Override CSS variables for dark pro mode */
                ["--void" as any]: "#0b0f0e",
                ["--void-light" as any]: "#111916",
                ["--void-surface" as any]: "#16201e",
                ["--void-elevated" as any]: "#1a2825",
                ["--void-border" as any]: "#22332f",
                ["--text-primary" as any]: "#e8f0ee",
                ["--text-secondary" as any]: "#8a9a95",
                ["--text-dim" as any]: "#556b65",
                ["--inverted" as any]: "#0b0f0e",
            }}
        >
            {children}
        </div>
    );
}
