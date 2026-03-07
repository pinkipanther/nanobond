"use client";

import { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";

interface TokenChartProps {
    symbol: string;
}

// Generate mock OHLC data
function generateMockData(): CandlestickData<Time>[] {
    const data: CandlestickData<Time>[] = [];
    let price = 0.001 + Math.random() * 0.01;
    const now = Math.floor(Date.now() / 1000);
    const interval = 3600; // 1 hour candles

    for (let i = 200; i >= 0; i--) {
        const time = (now - i * interval) as Time;
        const volatility = 0.02 + Math.random() * 0.05;
        const open = price;
        const close = open * (1 + (Math.random() - 0.48) * volatility);
        const high = Math.max(open, close) * (1 + Math.random() * 0.015);
        const low = Math.min(open, close) * (1 - Math.random() * 0.015);

        data.push({ time, open, high, low, close });
        price = close;
    }

    return data;
}

export default function TokenChart({ symbol }: TokenChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { color: "transparent" },
                textColor: "#8888aa",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: "rgba(26, 26, 64, 0.5)" },
                horzLines: { color: "rgba(26, 26, 64, 0.5)" },
            },
            crosshair: {
                mode: 0,
                vertLine: {
                    color: "rgba(74, 178, 196, 0.3)",
                    labelBackgroundColor: "#0f0f24",
                },
                horzLine: {
                    color: "rgba(74, 178, 196, 0.3)",
                    labelBackgroundColor: "#0f0f24",
                },
            },
            rightPriceScale: {
                borderColor: "rgba(26, 26, 64, 0.5)",
            },
            timeScale: {
                borderColor: "rgba(26, 26, 64, 0.5)",
                timeVisible: true,
            },
            handleScroll: { vertTouchDrag: false },
        });

        const candleSeries = chart.addCandlestickSeries({
            upColor: "#39FF14",
            downColor: "#FF006E",
            borderUpColor: "#39FF14",
            borderDownColor: "#FF006E",
            wickUpColor: "#39FF14",
            wickDownColor: "#FF006E",
        });

        const data = generateMockData();
        candleSeries.setData(data);
        chart.timeScale().fitContent();

        chartRef.current = chart;
        seriesRef.current = candleSeries;

        const handleResize = () => {
            if (containerRef.current) {
                chart.applyOptions({
                    width: containerRef.current.clientWidth,
                });
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, [symbol]);

    return (
        <div style={{ position: "relative" }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    padding: "0 4px",
                }}
            >
                <div
                    style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: 16,
                        color: "var(--text-primary)",
                    }}
                >
                    ${symbol} / HBAR
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                    {["1H", "4H", "1D", "1W"].map((tf) => (
                        <button
                            key={tf}
                            style={{
                                padding: "4px 10px",
                                background: tf === "1H" ? "var(--cyan-glow)" : "transparent",
                                border: `1px solid ${tf === "1H" ? "var(--cyan-dim)" : "var(--void-border)"
                                    }`,
                                borderRadius: 4,
                                color: tf === "1H" ? "var(--cyan)" : "var(--text-dim)",
                                fontFamily: "var(--font-mono)",
                                fontSize: 11,
                                cursor: "pointer",
                                transition: "all 0.2s",
                            }}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>
            <div
                ref={containerRef}
                style={{
                    width: "100%",
                    height: 400,
                    borderRadius: 8,
                    overflow: "hidden",
                }}
            />
        </div>
    );
}
