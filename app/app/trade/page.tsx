"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog, parseAbiItem, parseEther, parseUnits, formatUnits } from "viem";
import type { Hex } from "viem";
import { hedera } from "wagmi/chains";
import { CURVE_ABI, ERC20_ABI, HTS_ABI } from "../lib/contracts";
import { createChart, ColorType, type LineData, type UTCTimestamp } from "lightweight-charts";
import { useBalance } from "wagmi";

const CONTRACT_ADDRESS = "0x7E0C5dB12dE03A323F152670249d1ede879e0360";
const TOKEN_ADDRESS = "0x00000000000000000000000000000000009ED323";
const TOKEN_ID = "0.0.10408739";
const CHAIN_ID = hedera.id;
const TOKEN_DECIMALS = 8;
const HBAR_DECIMALS = 8;
const EVM_HBAR_DECIMALS = 18;
const WEIBARS_PER_TINYBAR = 10n ** 10n;
const MIRROR_NODE_BASE_URL = "https://mainnet.mirrornode.hedera.com/api/v1";
const HASHSCAN_BASE_URL = "https://hashscan.io/mainnet";
const BUY_EVENT = parseAbiItem("event Bought(address indexed buyer, uint256 hbarSpent, uint256 tokensMinted, uint256 price)");
const SELL_EVENT = parseAbiItem("event Sold(address indexed seller, uint256 tokensBurned, uint256 hbarReturned, uint256 price)");

function formatTokenValue(value?: bigint) {
    if (value === undefined) return "...";
    const num = Number(formatUnits(value, TOKEN_DECIMALS));
    return num.toLocaleString(undefined, {
        minimumFractionDigits: num > 0 && num < 1 ? 2 : 0,
        maximumFractionDigits: num > 0 && num < 1 ? 4 : 2,
    });
}

function formatHbarValue(value?: bigint) {
    if (value === undefined) return "...";
    const num = Number(formatUnits(value, HBAR_DECIMALS));
    return formatHbarNumber(num);
}

function formatHbarNumber(num: number) {
    if (num === 0) return "0.00";
    if (num < 0.0001) return "<0.0001";
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatWalletHbarValue(value?: bigint) {
    if (value === undefined) return "...";
    const num = Number(formatUnits(value, EVM_HBAR_DECIMALS));
    return formatHbarNumber(num);
}

function weibarToTinybar(value?: bigint) {
    if (value === undefined) return 0n;
    return value / WEIBARS_PER_TINYBAR;
}

function computeMarketCapAtSupply(supplyRaw: number, basePriceRaw: number, stepSizeRaw: number, growthRateRaw: number) {
    const safeStepSize = stepSizeRaw > 0 ? stepSizeRaw : 10000 * 1e8;
    const steps = Math.floor(supplyRaw / safeStepSize);
    let growth = 1.0;
    const factor = 1 + (growthRateRaw / 10000);
    let tempSteps = steps;
    let currentFactor = factor;

    while (tempSteps > 0) {
        if (tempSteps % 2 === 1) growth *= currentFactor;
        currentFactor *= currentFactor;
        tempSteps = Math.floor(tempSteps / 2);
        if (growth > 1e12) break;
    }

    const priceHbar = basePriceRaw * growth / 10 ** HBAR_DECIMALS;
    const supplyTokens = supplyRaw / 10 ** TOKEN_DECIMALS;

    return {
        priceHbar,
        marketCapHbar: supplyTokens * priceHbar,
    };
}

export default function TradePage() {
    const { address, isConnected } = useAccount();
    const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
    const [amount, setAmount] = useState("");
    const [mounted, setMounted] = useState(false);
    const [copiedValue, setCopiedValue] = useState<string | null>(null);
    const [holderCount, setHolderCount] = useState<number | null>(null);
    const [holderAccounts, setHolderAccounts] = useState<{ account: string; balance: string }[]>([]);
    const [buyVolume, setBuyVolume] = useState<bigint | null>(null);
    const [sellVolume, setSellVolume] = useState<bigint | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Read contract state
    const { data: basePrice } = useReadContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CURVE_ABI,
        functionName: "basePrice",
        chainId: CHAIN_ID,
    });

    const { data: stepSize } = useReadContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CURVE_ABI,
        functionName: "stepSize",
        chainId: CHAIN_ID,
    });

    const { data: growthRateBP } = useReadContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CURVE_ABI,
        functionName: "growthRateBP",
        chainId: CHAIN_ID,
    });

    const { data: currentSupply, refetch: refetchSupply } = useReadContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CURVE_ABI,
        functionName: "internalTotalSupply",
        chainId: CHAIN_ID,
    });

    const { data: currentPrice } = useReadContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CURVE_ABI,
        functionName: "currentPrice",
        args: [currentSupply ?? 0n],
        chainId: CHAIN_ID,
    });

    const { data: ownerAddress } = useReadContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CURVE_ABI,
        functionName: "owner",
        chainId: CHAIN_ID,
    });

    const { data: curveActive } = useReadContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CURVE_ABI,
        functionName: "curveActive",
        chainId: CHAIN_ID,
    });

    const { data: userTokenBalance, refetch: refetchBalance } = useReadContract({
        address: TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address as `0x${string}`] : undefined,
        chainId: CHAIN_ID,
        query: {
            enabled: !!address,
        }
    });

    const { data: contractBalance, refetch: refetchContractBalance } = useBalance({
        address: CONTRACT_ADDRESS as `0x${string}`,
        chainId: CHAIN_ID,
    });

    const sellAmount = amount && !isNaN(Number(amount)) ? parseUnits(amount, 8) : 0n;
    const buyAmountTinybar = amount && !isNaN(Number(amount)) ? parseUnits(amount, 8) : 0n;
    const buyAmountWeibar = amount && !isNaN(Number(amount)) ? parseEther(amount) : 0n;

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address ? [address as `0x${string}`, CONTRACT_ADDRESS as `0x${string}`] : undefined,
        chainId: CHAIN_ID,
        query: { enabled: !!address },
    });

    // Chart logic - market cap projection around live supply
    useEffect(() => {
        if (!chartContainerRef.current) return;
        if (basePrice === undefined || stepSize === undefined || growthRateBP === undefined) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#44535f',
                fontFamily: 'Manrope, sans-serif',
            },
            grid: {
                vertLines: { color: 'rgba(21, 32, 40, 0.06)' },
                horzLines: { color: 'rgba(21, 32, 40, 0.08)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 420,
            rightPriceScale: {
                borderVisible: false,
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
            },
            crosshair: {
                vertLine: { color: 'rgba(22, 150, 184, 0.2)' },
                horzLine: { color: 'rgba(22, 150, 184, 0.2)' },
            },
        });

        const liveSeries = chart.addLineSeries({
            color: '#1696b8',
            lineWidth: 3,
            lastValueVisible: true,
            priceLineVisible: true,
        });

        const projectionSeries = chart.addLineSeries({
            color: 'rgba(22, 150, 184, 0.28)',
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
        });

        const bPrice = Number(basePrice);
        const sSize = Number(stepSize);
        const gRate = Number(growthRateBP);
        const liveSupply = Number(currentSupply ?? 0n);
        const increment = sSize > 0 ? Math.max(sSize / 2, 2500 * 1e8) : 5000 * 1e8;
        const pastPoints = 48;
        const futurePoints = 20;
        const startSupply = Math.max(0, liveSupply - increment * (pastPoints - 1));
        const startTime = Math.floor(Date.now() / 1000) - (pastPoints * 3600);
        const liveData: LineData<UTCTimestamp>[] = [];
        const projectionData: LineData<UTCTimestamp>[] = [];

        for (let i = 0; i < pastPoints + futurePoints; i++) {
            const supplyPoint = startSupply + increment * i;
            const point = computeMarketCapAtSupply(supplyPoint, bPrice, sSize, gRate);
            const chartPoint: LineData<UTCTimestamp> = {
                time: (startTime + (i * 3600)) as UTCTimestamp,
                value: point.marketCapHbar,
            };

            if (supplyPoint <= liveSupply || i === 0) {
                liveData.push(chartPoint);
            }

            if (supplyPoint >= liveSupply) {
                projectionData.push(chartPoint);
            }
        }

        if (projectionData.length > 0 && liveData.length > 0) {
            const lastLivePoint = liveData[liveData.length - 1];
            if (projectionData[0]?.time !== lastLivePoint.time) {
                projectionData.unshift(lastLivePoint);
            }
        }

        liveSeries.setData(liveData);
        projectionSeries.setData(projectionData);

        const handleResize = () => {
            if (!chartContainerRef.current) return;
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, [basePrice, stepSize, growthRateBP, currentSupply]);

    useEffect(() => {
        let cancelled = false;

        async function fetchHolderCount() {
            try {
                let nextUrl = `${MIRROR_NODE_BASE_URL}/tokens/${TOKEN_ID}/balances?limit=100`;
                let count = 0;
                const collected: { account: string; balance: string }[] = [];

                while (nextUrl) {
                    const response = await fetch(nextUrl);
                    if (!response.ok) throw new Error(`Mirror node error: ${response.status}`);

                    const data = await response.json();
                    const balances = Array.isArray(data.balances) ? data.balances : [];
                    count += balances.filter((entry: { balance?: number | string }) => Number(entry.balance ?? 0) > 0).length;
                    for (const entry of balances) {
                        const rawBalance = Number(entry.balance ?? 0);
                        if (rawBalance > 0) {
                            collected.push({
                                account: String(entry.account),
                                balance: String(rawBalance),
                            });
                        }
                    }
                    nextUrl = data.links?.next ? `https://mainnet.mirrornode.hedera.com${data.links.next}` : "";
                }

                if (!cancelled) {
                    setHolderCount(count);
                    setHolderAccounts(
                        collected
                            .sort((a, b) => Number(b.balance) - Number(a.balance))
                            .slice(0, 12)
                            .map((holder) => ({
                                ...holder,
                                balance: formatTokenValue(BigInt(Math.trunc(Number(holder.balance)))),
                            }))
                    );
                }
            } catch {
                if (!cancelled) {
                    setHolderCount(null);
                    setHolderAccounts([]);
                }
            }
        }

        fetchHolderCount();

        return () => {
            cancelled = true;
        };
    }, []);

    const { data: previewBuy } = useReadContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CURVE_ABI,
        functionName: "previewBuy",
        args: [buyAmountTinybar],
        chainId: CHAIN_ID,
        query: {
            enabled: activeTab === "buy" && Number(amount) > 0,
        }
    });

    const { data: previewSell } = useReadContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CURVE_ABI,
        functionName: "previewSell",
        args: [sellAmount], // Token has 8 decimals
        chainId: CHAIN_ID,
        query: {
            enabled: activeTab === "sell" && Number(amount) > 0,
        }
    });

    const { writeContract, data: txHash, isPending } = useWriteContract();

    const { isLoading: isWaiting } = useWaitForTransactionReceipt({
        hash: txHash,
        chainId: CHAIN_ID,
    });

    useEffect(() => {
        if (!isWaiting && txHash) {
            setAmount("");
            refetchBalance();
            refetchSupply();
            refetchAllowance();
            refetchContractBalance();
        }
    }, [isWaiting, txHash, refetchBalance, refetchSupply, refetchAllowance, refetchContractBalance]);

    useEffect(() => {
        let cancelled = false;

        async function fetchVolumes() {
            try {
                let nextUrl = `${MIRROR_NODE_BASE_URL}/contracts/${CONTRACT_ADDRESS}/results/logs?order=asc&limit=100`;
                let totalBuy = 0n;
                let totalSell = 0n;

                while (nextUrl) {
                    const response = await fetch(nextUrl);
                    if (!response.ok) throw new Error(`Mirror node error: ${response.status}`);

                    const data = await response.json();
                    const logs = Array.isArray(data.logs) ? data.logs : [];

                    for (const log of logs) {
                        try {
                            const topics = (log.topics ?? []) as Hex[];
                            if (topics.length === 0) continue;

                            const decoded = decodeEventLog({
                                abi: [BUY_EVENT, SELL_EVENT],
                                data: log.data as `0x${string}`,
                                topics: topics as [Hex, ...Hex[]],
                            });

                            if (decoded.eventName === "Bought") totalBuy += decoded.args.hbarSpent as bigint;
                            if (decoded.eventName === "Sold") totalSell += decoded.args.hbarReturned as bigint;
                        } catch {
                            continue;
                        }
                    }

                    nextUrl = data.links?.next ? `https://mainnet.mirrornode.hedera.com${data.links.next}` : "";
                }

                if (!cancelled) {
                    setBuyVolume(totalBuy);
                    setSellVolume(totalSell);
                }
            } catch {
                if (!cancelled) {
                    setBuyVolume(null);
                    setSellVolume(null);
                }
            }
        }

        fetchVolumes();

        return () => {
            cancelled = true;
        };
    }, [txHash]);

    // Token has 8 decimals in Hedera commonly
    const handleTrade = () => {
        if (!amount || isNaN(Number(amount))) return;
        
        if (activeTab === "buy") {
            writeContract({
                address: CONTRACT_ADDRESS as `0x${string}`,
                abi: CURVE_ABI,
                functionName: "buy",
                value: buyAmountWeibar,
                chainId: CHAIN_ID,
            });
        } else {
            writeContract({
                address: CONTRACT_ADDRESS as `0x${string}`,
                abi: CURVE_ABI,
                functionName: "sell",
                args: [sellAmount],
                chainId: CHAIN_ID,
            });
        }
    };

    const handleApprove = () => {
        if (!address || sellAmount <= 0n) return;
        writeContract({
            address: TOKEN_ADDRESS as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [CONTRACT_ADDRESS as `0x${string}`, sellAmount],
            chainId: CHAIN_ID,
        });
    };

    const handleAssociate = () => {
        if (!address) return;
        writeContract({
            address: "0x0000000000000000000000000000000000000167",
            abi: HTS_ABI,
            functionName: "associateToken",
            args: [address as `0x${string}`, TOKEN_ADDRESS as `0x${string}`],
            chainId: CHAIN_ID,
        });
    };

    const handleWithdrawAll = () => {
        if (!address || !contractBalance?.value || contractBalance.value <= 0n) return;
        writeContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: CURVE_ABI,
            functionName: "withdrawRaised",
            args: [address as `0x${string}`, weibarToTinybar(contractBalance.value)],
            chainId: CHAIN_ID,
        });
    };

    const handleCopy = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedValue(value);
            window.setTimeout(() => setCopiedValue(null), 1800);
        } catch {
            setCopiedValue(null);
        }
    };

    const totalSupplyRaw = (currentSupply as bigint | undefined) ?? 0n;
    const marketCapTinybar = currentPrice !== undefined ? (totalSupplyRaw * (currentPrice as bigint)) / (10n ** BigInt(TOKEN_DECIMALS)) : undefined;
    const holdingsValueTinybar = currentPrice !== undefined && userTokenBalance !== undefined
        ? ((userTokenBalance as bigint) * (currentPrice as bigint)) / (10n ** BigInt(TOKEN_DECIMALS))
        : undefined;
    const currentPriceHbar = currentPrice !== undefined ? formatHbarValue(currentPrice as bigint) : "...";
    const projectedFdvHbar = basePrice !== undefined && stepSize !== undefined && growthRateBP !== undefined && currentSupply !== undefined
        ? formatHbarNumber(
            computeMarketCapAtSupply(
                Number(currentSupply) + Math.max(Number(stepSize) * 10, 50000 * 1e8),
                Number(basePrice),
                Number(stepSize),
                Number(growthRateBP)
            ).marketCapHbar
        )
        : "...";
    const totalVolume = buyVolume !== null && sellVolume !== null ? buyVolume + sellVolume : null;
    const isAdmin = !!address && !!ownerAddress && address.toLowerCase() === (ownerAddress as string).toLowerCase();

    return (
        <div style={{ paddingTop: 100, minHeight: "100vh", background: "var(--void)" }}>
            <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 24px 56px" }}>
                <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
                        <div>
                            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, lineHeight: 1.05, fontWeight: 800, marginBottom: 8 }}>
                                Trade NANO
                            </h1>
                            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                                {curveActive ? "Live on Hedera Testnet" : "Curve closed"}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                                <button
                                    onClick={() => handleCopy(TOKEN_ADDRESS)}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, border: "1px solid var(--void-border)", background: "var(--void-surface)", cursor: "pointer", fontSize: 12, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                                >
                                    <span style={{ fontFamily: "var(--font-body)", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", fontSize: 11 }}>Token</span>
                                    <span>{TOKEN_ADDRESS.slice(0, 6)}...{TOKEN_ADDRESS.slice(-4)}</span>
                                    <span style={{ color: "var(--cyan)", fontFamily: "var(--font-body)", fontWeight: 800 }}>{copiedValue === TOKEN_ADDRESS ? "Copied" : "Copy"}</span>
                                </button>
                                <button
                                    onClick={() => handleCopy(CONTRACT_ADDRESS)}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, border: "1px solid var(--void-border)", background: "var(--void-surface)", cursor: "pointer", fontSize: 12, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
                                >
                                    <span style={{ fontFamily: "var(--font-body)", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", fontSize: 11 }}>Contract</span>
                                    <span>{CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}</span>
                                    <span style={{ color: "var(--cyan)", fontFamily: "var(--font-body)", fontWeight: 800 }}>{copiedValue === CONTRACT_ADDRESS ? "Copied" : "Copy"}</span>
                                </button>
                            </div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 22, flex: "1 1 520px", minWidth: 280, paddingTop: 8 }}>
                            <div>
                                <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 5 }}>Supply</div>
                                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-display)", lineHeight: 1.1 }}>{formatTokenValue(currentSupply as bigint | undefined)}</div>
                                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>NANO</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 5 }}>Price</div>
                                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-display)", lineHeight: 1.1 }}>{currentPriceHbar}</div>
                                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>HBAR / NANO</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 5 }}>Your Value</div>
                                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-display)", lineHeight: 1.1 }}>{holdingsValueTinybar !== undefined ? formatHbarValue(holdingsValueTinybar) : "0.00"}</div>
                                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>HBAR</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
                    <div className="glass-card" style={{ padding: 24, flex: "1 1 720px", minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
                            <div>
                                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                                    Market Cap Curve
                                </h2>
                            </div>
                            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 4 }}>Current Mcap</div>
                                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28 }}>{marketCapTinybar !== undefined ? formatHbarValue(marketCapTinybar) : "..."} <span style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-body)" }}>HBAR</span></div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 4 }}>Projected</div>
                                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28 }}>{projectedFdvHbar} <span style={{ fontSize: 13, color: "var(--text-dim)", fontFamily: "var(--font-body)" }}>HBAR</span></div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 18, padding: "12px 14px", background: "rgba(255,255,255,0.55)", border: "1px solid rgba(21,32,40,0.06)", borderRadius: 14 }}>
                            <div>
                                <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 4 }}>Total Volume</div>
                                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22 }}>{totalVolume !== null ? formatHbarValue(totalVolume) : "..."} <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-body)" }}>HBAR</span></div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 4 }}>Buy Volume</div>
                                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22 }}>{buyVolume !== null ? formatHbarValue(buyVolume) : "..."} <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-body)" }}>HBAR</span></div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 4 }}>Sell Volume</div>
                                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22 }}>{sellVolume !== null ? formatHbarValue(sellVolume) : "..."} <span style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-body)" }}>HBAR</span></div>
                            </div>
                        </div>

                        <div style={{ width: "100%", height: 420, background: "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(237,241,234,0.88) 100%)", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(21,32,40,0.06)" }} ref={chartContainerRef} />

                        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--void-border)" }}>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                                <div>
                                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Holders</h3>
                                    <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Largest visible wallets from Hedera Mirror Node</div>
                                </div>
                                <div style={{ color: "var(--text-dim)", fontSize: 13 }}>{holderCount === null ? "Loading..." : `${holderCount.toLocaleString()} total holders`}</div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                                {holderAccounts.length > 0 ? holderAccounts.map((holder, index) => (
                                    <div key={`${holder.account}-${index}`} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--void-surface)", border: "1px solid rgba(21,32,40,0.06)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                                        <div>
                                            <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.08em", marginBottom: 4 }}>Holder {index + 1}</div>
                                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700 }}>{holder.account}</div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ fontWeight: 800, fontSize: 15 }}>{holder.balance}</div>
                                            <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>NANO</div>
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ color: "var(--text-secondary)", fontSize: 14, padding: "8px 0" }}>No holder data available yet.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: 24, height: "fit-content", flex: "1 1 380px", minWidth: 320, maxWidth: 420, position: "sticky", top: 100 }}>
                        <div style={{ marginBottom: 20 }}>
                            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                                Trade NANO
                            </h3>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                            <button
                                onClick={() => { setActiveTab("buy"); setAmount(""); }}
                                style={{
                                    flex: 1,
                                    padding: "12px 0",
                                    borderRadius: 8,
                                    border: "none",
                                    background: activeTab === "buy" ? "var(--acid)" : "var(--void-elevated)",
                                    color: activeTab === "buy" ? "white" : "var(--text-secondary)",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                BUY
                            </button>
                            <button
                                onClick={() => { setActiveTab("sell"); setAmount(""); }}
                                style={{
                                    flex: 1,
                                    padding: "12px 0",
                                    borderRadius: 8,
                                    border: "none",
                                    background: activeTab === "sell" ? "var(--magenta)" : "var(--void-elevated)",
                                    color: activeTab === "sell" ? "white" : "var(--text-secondary)",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                SELL
                            </button>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: "block", fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>
                                {activeTab === "buy" ? "Amount in HBAR" : "Amount in $NANO"}
                            </label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
                                    className="input-field"
                                    style={{ fontSize: 24, padding: "16px", fontWeight: 700, paddingRight: 80 }}
                                />
                                <div style={{ 
                                    position: "absolute", 
                                    right: 16, 
                                    top: "50%", 
                                    transform: "translateY(-50%)", 
                                    color: "var(--text-dim)", 
                                    fontWeight: 700 
                                }}>
                                    {activeTab === "buy" ? "HBAR" : "NANO"}
                                </div>
                            </div>
                        </div>

                        {Number(amount) > 0 && (activeTab === "buy" ? previewBuy : previewSell) && (
                            <div style={{ padding: 18, background: "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(237,241,234,0.86) 100%)", borderRadius: 14, marginBottom: 24, border: "1px solid var(--void-border)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                    <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>You will receive</span>
                                    <span style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 18, fontFamily: "var(--font-display)" }}>
                                        {activeTab === "buy" 
                                            ? `${formatUnits((previewBuy as unknown as bigint[])?.[0] || 0n, 8)} NANO` 
                                            : `${formatUnits((previewSell as unknown as bigint[])?.[0] || 0n, 8)} HBAR`}
                                    </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                    <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>Average Price</span>
                                    <span style={{ fontWeight: 700, color: "var(--text-dim)", fontSize: 14 }}>
                                        ≈ {activeTab === "buy" 
                                            ? formatUnits((previewBuy as unknown as bigint[])?.[1] || 0n, 8)
                                            : formatUnits((previewSell as unknown as bigint[])?.[1] || 0n, 8)} HBAR
                                    </span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>Market Cap After Trade</span>
                                    <span style={{ fontWeight: 700, color: "var(--text-dim)", fontSize: 14 }}>
                                        {marketCapTinybar !== undefined ? `${formatHbarValue(marketCapTinybar)} HBAR` : "..."}
                                    </span>
                                </div>
                            </div>
                        )}

                        {!mounted || !isConnected ? (
                            <button disabled className="btn-primary" style={{ width: "100%", padding: 16, fontSize: 16, opacity: 0.5 }}>
                                CONNECT WALLET TO {activeTab.toUpperCase()}
                            </button>
                        ) : curveActive === false && activeTab === "buy" ? (
                            <button disabled className="btn-primary" style={{ width: "100%", padding: 16, fontSize: 16, background: "var(--void-elevated)", color: "var(--text-dim)" }}>
                                CURVE COMPLETED
                            </button>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {activeTab === "sell" && isConnected && (allowance === undefined || allowance === null || allowance < sellAmount) && (
                                    <button
                                        className="btn-secondary"
                                        onClick={handleApprove}
                                        disabled={isPending || isWaiting || !amount || Number(amount) <= 0}
                                        style={{ width: "100%", padding: 14, fontSize: 14 }}
                                    >
                                        {allowance && allowance > 0n ? `Increase Approval to ${amount} NANO` : `Approve ${amount || "0"} NANO for Sell`}
                                    </button>
                                )}
                                <button 
                                    className="btn-primary" 
                                    onClick={handleTrade}
                                    disabled={isPending || isWaiting || !amount || Number(amount) <= 0}
                                    style={{ 
                                        width: "100%", 
                                        padding: 16, 
                                        fontSize: 16,
                                        background: activeTab === "sell" ? "var(--magenta)" : undefined
                                    }}
                                >
                                    {isPending || isWaiting 
                                        ? "PROCESSING..." 
                                        : `${activeTab.toUpperCase()} ${activeTab === "buy" ? "NANO" : "FOR HBAR"}`
                                    }
                                </button>
                                
                                {activeTab === "buy" && (
                                    <button 
                                        onClick={handleAssociate}
                                        className="btn-secondary"
                                        style={{ 
                                            width: "100%", 
                                            padding: 14, 
                                            fontSize: 14,
                                        }}
                                        disabled={isPending || isWaiting}
                                    >
                                        Associate $NANO Token (Required Once)
                                    </button>
                                )}
                            </div>
                        )}
                        
                        {txHash && (
                            <div style={{ marginTop: 16, textAlign: "center", fontSize: 12 }}>
                                <a 
                                    href={`${HASHSCAN_BASE_URL}/transaction/${txHash}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    style={{ color: "var(--cyan)", textDecoration: "none" }}
                                >
                                    View on Hashscan ↗
                                </a>
                            </div>
                        )}

                        {isAdmin && (
                            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--void-border)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginBottom: 4 }}>Admin</div>
                                        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Contract balance: {contractBalance?.value !== undefined ? `${formatWalletHbarValue(contractBalance.value)} HBAR` : "..."}</div>
                                    </div>
                                </div>
                                <button
                                    className="btn-secondary"
                                    onClick={handleWithdrawAll}
                                    disabled={isPending || isWaiting || !contractBalance?.value || contractBalance.value <= 0n}
                                    style={{ width: "100%", padding: 14, fontSize: 14 }}
                                >
                                    Withdraw All HBAR
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
