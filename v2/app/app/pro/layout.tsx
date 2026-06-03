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
      style={
        {
          paddingTop: 76,
          minHeight: "100vh",
          background: "#060a12",
          display: "flex",
          flexDirection: "column",
          color: "#e8f0ee",
          ["--void" as keyof CSSProperties]: "#060a12",
          ["--void-light" as keyof CSSProperties]: "#0a0f1a",
          ["--void-surface" as keyof CSSProperties]: "#0f1520",
          ["--void-elevated" as keyof CSSProperties]: "#151d2e",
          ["--void-border" as keyof CSSProperties]: "#1a2540",
          ["--text-primary" as keyof CSSProperties]: "#e8f0ee",
          ["--text-secondary" as keyof CSSProperties]: "#8896b0",
          ["--text-dim" as keyof CSSProperties]: "#5a6a85",
          ["--inverted" as keyof CSSProperties]: "#060a12",
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
