"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
} from "lightweight-charts";
import { usePriceHistory, type PricePoint } from "../lib/usePriceHistory";

interface PriceChartProps {
  poolAddress: string | null;
  tokenSymbol?: string;
  height?: number;
}

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

function bucketHistoryToCandles(history: PricePoint[], timeframe: Timeframe): CandlestickData[] {
  const interval = TIMEFRAME_SECONDS[timeframe];
  if (history.length === 0) return [];

  const candles: CandlestickData[] = [];
  let currentCandle: CandlestickData | null = null;

  for (const point of history) {
    const bucketTime = (Math.floor(point.time / interval) * interval) as UTCTimestamp;

    if (!currentCandle || currentCandle.time !== bucketTime) {
      if (currentCandle) candles.push(currentCandle);
      currentCandle = {
        time: bucketTime,
        open: point.price,
        high: point.price,
        low: point.price,
        close: point.price,
      };
    } else {
      currentCandle.high = Math.max(currentCandle.high, point.price);
      currentCandle.low = Math.min(currentCandle.low, point.price);
      currentCandle.close = point.price;
    }
  }

  if (currentCandle) candles.push(currentCandle);

  return candles;
}

export default function PriceChart({ poolAddress, tokenSymbol = "TOKEN", height = 300 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const { history, loading, error } = usePriceHistory(poolAddress);
  
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");

  const candles = useMemo(() => bucketHistoryToCandles(history, timeframe), [history, timeframe]);

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
        fontFamily: "var(--font-mono)",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "var(--void-border)", style: 1 },
        horzLines: { color: "var(--void-border)", style: 1 },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: "var(--cyan)", width: 1, style: 2, labelBackgroundColor: "var(--cyan)" },
        horzLine: { color: "var(--cyan)", width: 1, style: 2, labelBackgroundColor: "var(--cyan)" },
      },
      rightPriceScale: {
        borderColor: "var(--void-border)",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "var(--void-border)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#10b981", // var(--acid)
      downColor: "#f43f5e", // var(--magenta)
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
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
  }, [height, poolAddress]); // Only re-create chart if height or pool changes

  useEffect(() => {
    if (!seriesRef.current) return;
    
    seriesRef.current.setData(candles.length > 0 ? candles : [{ 
      time: Math.floor(Date.now() / 1000) as UTCTimestamp, 
      open: 0, high: 0, low: 0, close: 0 
    }]);
    
    if (chartRef.current && candles.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles]);

  if (!poolAddress) return null;

  return (
    <div style={{ padding: "20px 24px", background: "var(--void-surface)", border: "1px solid var(--void-border)", borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            {tokenSymbol}/HBAR
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
            {loading ? "Syncing indexer..." : error ? "Price data unavailable" : `${history.length} trades recorded`}
          </div>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", background: "var(--void-elevated)", borderRadius: 8, padding: 4 }}>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  background: timeframe === tf ? "var(--void-surface)" : "transparent",
                  color: timeframe === tf ? "var(--text-primary)" : "var(--text-dim)",
                  border: timeframe === tf ? "1px solid var(--void-border)" : "1px solid transparent",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  fontWeight: timeframe === tf ? 700 : 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {history.length > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800, color: "var(--cyan)" }}>
                {history[history.length - 1].price.toFixed(6)}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>HBAR</div>
            </div>
          )}
        </div>
      </div>
      
      <div ref={containerRef} style={{ width: "100%" }} />
      
      {history.length === 0 && !loading && !error && (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
          No trading activity yet.
        </div>
      )}
    </div>
  );
}
