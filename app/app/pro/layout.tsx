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
                background: "#080c14",
                display: "flex",
                flexDirection: "column",
                color: "#e8f0ee",
                /* Override CSS variables for dark pro mode */
                ["--void" as any]: "#080c14",
                ["--void-light" as any]: "#0e1420",
                ["--void-surface" as any]: "#131a28",
                ["--void-elevated" as any]: "#192133",
                ["--void-border" as any]: "#1e2d45",
                ["--text-primary" as any]: "#e8f0ee",
                ["--text-secondary" as any]: "#8a9a95",
                ["--text-dim" as any]: "#556b65",
                ["--inverted" as any]: "#080c14",
            }}
        >
            {children}
        </div>
    );
}
