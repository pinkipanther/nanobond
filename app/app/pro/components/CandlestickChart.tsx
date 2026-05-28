"use client";

import { useEffect, useRef } from "react";
import {
    createChart,
    ColorType,
    type CandlestickData,
    type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "../lib/data";

interface CandlestickChartProps {
    candles: Candle[];
}

export default function CandlestickChart({ candles }: CandlestickChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || candles.length === 0) return;

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
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
            },
            crosshair: {
                mode: 0,
                vertLine: {
                    color: "rgba(22, 150, 184, 0.3)",
                    width: 1,
                    style: 2,
                },
                horzLine: {
                    color: "rgba(22, 150, 184, 0.3)",
                    width: 1,
                    style: 2,
                },
            },
        });

        const series = chart.addCandlestickSeries({
            upColor: "#3fb950",
            downColor: "#f85149",
            borderUpColor: "#3fb950",
            borderDownColor: "#f85149",
            wickUpColor: "#3fb950",
            wickDownColor: "#f85149",
        });

        const data: CandlestickData<UTCTimestamp>[] = candles.map((c) => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));

        series.setData(data);
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
    }, [candles]);

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
