"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from "lightweight-charts";
import { usePriceHistory } from "../lib/usePriceHistory";

interface PriceChartProps {
  poolAddress: string | null;
  tokenSymbol?: string;
  height?: number;
}

export default function PriceChart({ poolAddress, tokenSymbol = "TOKEN", height = 300 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const { history, loading, error } = usePriceHistory(poolAddress);

  useEffect(() => {
    if (!containerRef.current) return;
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#7a8aaa",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1e2d45", style: 1 },
        horzLines: { color: "#1e2d45", style: 1 },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: "#6366f1", width: 1, style: 2, labelBackgroundColor: "#6366f1" },
        horzLine: { color: "#6366f1", width: 1, style: 2, labelBackgroundColor: "#6366f1" },
      },
      rightPriceScale: {
        borderColor: "#1e2d45",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#1e2d45",
        timeVisible: false,
        secondsVisible: false,
      },
    });

    const series = chart.addLineSeries({
      color: "#6366f1",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceFormat: { type: "price", precision: 6, minMove: 0.000001 },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height, poolAddress]);

  useEffect(() => {
    if (!seriesRef.current) return;
    const data: LineData[] = history.map((p) => ({
      time: p.time as UTCTimestamp,
      value: p.price,
    }));
    seriesRef.current.setData(data.length > 0 ? data : [{ time: Math.floor(Date.now() / 1000) as UTCTimestamp, value: 0 }]);
    if (chartRef.current && data.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [history]);

  if (!poolAddress) return null;

  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            {tokenSymbol}/HBAR Price
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
            {loading ? "Loading..." : error ? "Price data unavailable" : `${history.length} trades`}
          </div>
        </div>
        {history.length > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "var(--cyan)" }}>
              {history[history.length - 1].price.toFixed(6)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>HBAR</div>
          </div>
        )}
      </div>
      <div ref={containerRef} style={{ width: "100%" }} />
      {history.length === 0 && !loading && !error && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
          No trading activity yet.
        </div>
      )}
    </div>
  );
}
