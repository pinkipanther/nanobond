"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { hedera } from "wagmi/chains";
import { CONTRACTS, FACTORY_ABI, BOND_ABI } from "../lib/contracts";
import { formatEther } from "viem";

const CHAIN_ID = hedera.id;
const factoryAddress = CONTRACTS.FACTORY as `0x${string}`;
const factoryAbi = FACTORY_ABI as any;
const bondAbi = BOND_ABI as any;

export default function DebugPage() {
    // Test 1: bondCount
    const { data: countData, error: countError, isLoading: countLoading } = useReadContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "bondCount",
        chainId: CHAIN_ID,
    });

    // Test 2: getBond(0) if count > 0
    const count = countData ? Number(countData) : 0;
    const { data: bondData, error: bondError } = useReadContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: "getBond",
        args: [0n],
        chainId: CHAIN_ID,
        query: { enabled: count > 0 },
    });

    // Test 3: Read bond contract data
    const bondAddr = (bondData as any)?.bondContract as `0x${string}` | undefined;
    const { data: detailData, error: detailError } = useReadContracts({
        contracts: bondAddr ? [
            { address: bondAddr, abi: bondAbi, functionName: "totalRaised" as const, chainId: CHAIN_ID },
            { address: bondAddr, abi: bondAbi, functionName: "hardCap" as const, chainId: CHAIN_ID },
            { address: bondAddr, abi: bondAbi, functionName: "state" as const, chainId: CHAIN_ID },
            { address: bondAddr, abi: bondAbi, functionName: "totalStaked" as const, chainId: CHAIN_ID },
            { address: bondAddr, abi: bondAbi, functionName: "contributorCount" as const, chainId: CHAIN_ID },
        ] : [],
        query: { enabled: !!bondAddr },
    });

    const getResult = (idx: number) => {
        if (!detailData || !detailData[idx]) return "N/A";
        const d = detailData[idx];
        if (d.status === "success") return String(d.result);
        return `ERROR: ${d.error?.message || "unknown"}`;
    };

    return (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "96px 24px 80px" }}>
            <h1 style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)", marginBottom: 32 }}>
                🔧 Contract Debug
            </h1>

            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ color: "var(--cyan)", marginBottom: 16, fontFamily: "var(--font-display)" }}>
                    Config
                </h3>
                <pre style={{ color: "var(--text-secondary)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
                    Factory: {factoryAddress}{"\n"}
                    Chain ID: {CHAIN_ID}{"\n"}
                    RPC: Default Wagmi config
                </pre>
            </div>

            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ color: "var(--cyan)", marginBottom: 16, fontFamily: "var(--font-display)" }}>
                    Test 1: bondCount()
                </h3>
                <pre style={{ color: "var(--text-secondary)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
                    Loading: {String(countLoading)}{"\n"}
                    Result: {countData !== undefined ? String(countData) : "undefined"}{"\n"}
                    Error: {countError ? countError.message : "none"}
                </pre>
                <div style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: count > 0 ? "rgba(106,168,106,0.1)" : "rgba(193,85,126,0.1)",
                    color: count > 0 ? "var(--acid)" : "var(--magenta)",
                    fontWeight: 700,
                    fontSize: 14,
                    marginTop: 8,
                }}>
                    {countLoading ? "⏳ Loading..." : count > 0 ? `✅ PASS — ${count} bonds` : "❌ FAIL — No data"}
                </div>
            </div>

            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ color: "var(--cyan)", marginBottom: 16, fontFamily: "var(--font-display)" }}>
                    Test 2: getBond(0)
                </h3>
                <pre style={{ color: "var(--text-secondary)", fontSize: 13, fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {bondData ? JSON.stringify(bondData, (_, v) => typeof v === "bigint" ? v.toString() : v, 2) : bondError ? `ERROR: ${bondError.message}` : "Waiting for bondCount..."}
                </pre>
                <div style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: bondAddr ? "rgba(106,168,106,0.1)" : "rgba(255,215,0,0.1)",
                    color: bondAddr ? "var(--acid)" : "var(--gold)",
                    fontWeight: 700,
                    fontSize: 14,
                    marginTop: 8,
                }}>
                    {bondAddr ? `✅ PASS — Bond at ${bondAddr}` : "⏳ Waiting..."}
                </div>
            </div>

            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ color: "var(--cyan)", marginBottom: 16, fontFamily: "var(--font-display)" }}>
                    Test 3: Bond Contract Reads
                </h3>
                {!bondAddr ? (
                    <p style={{ color: "var(--text-dim)" }}>Waiting for bond address...</p>
                ) : (
                    <pre style={{ color: "var(--text-secondary)", fontSize: 13, fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap" }}>
                        totalRaised (raw): {getResult(0)}{"\n"}
                        totalRaised (ETH): {detailData?.[0]?.status === "success" ? formatEther(detailData[0].result as bigint) : "N/A"}{"\n"}
                        hardCap (raw): {getResult(1)}{"\n"}
                        hardCap (ETH): {detailData?.[1]?.status === "success" ? formatEther(detailData[1].result as bigint) : "N/A"}{"\n"}
                        state: {getResult(2)}{"\n"}
                        totalStaked (raw): {getResult(3)}{"\n"}
                        contributorCount: {getResult(4)}{"\n"}
                        {detailError ? `\nError: ${detailError.message}` : ""}
                    </pre>
                )}
                <div style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: detailData?.[0]?.status === "success" ? "rgba(106,168,106,0.1)" : "rgba(255,215,0,0.1)",
                    color: detailData?.[0]?.status === "success" ? "var(--acid)" : "var(--gold)",
                    fontWeight: 700,
                    fontSize: 14,
                    marginTop: 8,
                }}>
                    {detailData?.[0]?.status === "success" ? "✅ ALL READS WORKING" : "⏳ Loading / Not yet tested..."}
                </div>
            </div>
        </div>
    );
}
