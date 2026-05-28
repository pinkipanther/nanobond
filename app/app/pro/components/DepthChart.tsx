"use client";

import { useEffect, useRef } from "react";
import {
    createChart,
    ColorType,
    type AreaData,
    type UTCTimestamp,
} from "lightweight-charts";

interface DepthChartProps {
    bids: { price: number; volume: number }[];
    asks: { price: number; volume: number }[];
}

export default function DepthChart({ bids, asks }: DepthChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || bids.length === 0 || asks.length === 0)
            return;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#8a9a95",
                fontFamily: "JetBrains Mono, monospace",
            },
            grid: {
                vertLines: { color: "rgba(30, 45, 69, 0.4)" },
                horzLines: { color: "rgba(30, 45, 69, 0.5)" },
            },
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            rightPriceScale: {
                borderVisible: false,
            },
            timeScale: {
                borderVisible: false,
            },
            crosshair: {
                vertLine: { color: "rgba(22, 150, 184, 0.2)" },
                horzLine: { color: "rgba(22, 150, 184, 0.2)" },
            },
        });

        const now = Math.floor(Date.now() / 1000);

        const bidSeries = chart.addAreaSeries({
            lineColor: "#3fb950",
            topColor: "rgba(63, 185, 80, 0.35)",
            bottomColor: "rgba(63, 185, 80, 0.02)",
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        const askSeries = chart.addAreaSeries({
            lineColor: "#f85149",
            topColor: "rgba(248, 81, 73, 0.35)",
            bottomColor: "rgba(248, 81, 73, 0.02)",
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        const bidData: AreaData<UTCTimestamp>[] = bids.map((b, i) => ({
            time: (now - bids.length + i) as UTCTimestamp,
            value: b.volume,
        }));

        const askData: AreaData<UTCTimestamp>[] = asks.map((a, i) => ({
            time: (now + i) as UTCTimestamp,
            value: a.volume,
        }));

        bidSeries.setData(bidData);
        askSeries.setData(askData);

        chart.timeScale().fitContent();

        const handleResize = () => {
            if (!containerRef.current) return;
            chart.applyOptions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight,
            });
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, [bids, asks]);

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                minHeight: 0,
            }}
        />
    );
}
