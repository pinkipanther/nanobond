"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useSwitchChain } from "wagmi";
import { parseEther, parseUnits } from "viem";
import { FACTORY_ABI, CONTRACTS, HEDERA_TESTNET_CHAIN_ID } from "../lib/contracts";

interface CreateBondProps {
    onClose: () => void;
    onSuccess?: () => void;
}

export default function CreateBond({ onClose, onSuccess }: CreateBondProps) {
    const { address, chainId } = useAccount();
    const { switchChain } = useSwitchChain();
    const { writeContract, isPending, isSuccess, error, reset } = useWriteContract();

    const [step, setStep] = useState(1); // 1-5 wizard steps
    const [formData, setFormData] = useState({
        name: "GameFi Growth Bond",
        symbol: "GGB",
        description: "Funding the next generation of web3 gaming. Earning yield from in-game tx fees.",
        totalSupply: "100000",
        hardCap: "100",
        softCap: "20",
        duration: "30",
        yieldRate: "15",
        epochDuration: "24",
    });

    const updateField = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleDeploy = () => {
        if (!address) return;

        // Switch chain if needed
        if (chainId !== HEDERA_TESTNET_CHAIN_ID) {
            switchChain({ chainId: HEDERA_TESTNET_CHAIN_ID });
            return;
        }

        const yieldBps = BigInt(Math.floor(parseFloat(formData.yieldRate || "0") * 100));
        const epochSec = BigInt(Math.floor(parseFloat(formData.epochDuration || "0") * 3600));

        writeContract({
            address: CONTRACTS.FACTORY as `0x${string}`,
            abi: FACTORY_ABI,
            functionName: "createBond",
            args: [
                formData.name,
                formData.symbol,
                formData.description,
                parseEther(formData.totalSupply || "0"),
                parseUnits(formData.hardCap || "0", 8),
                parseUnits(formData.softCap || "0", 8),
                BigInt(Math.floor(parseFloat(formData.duration || "0") * 86400)),
                yieldBps,
                epochSec,
            ],
            gas: BigInt(10_000_000),
        });
    };

    const isValid = () => {
        const { name, symbol, totalSupply, hardCap, softCap, duration, yieldRate, epochDuration } = formData;
        if (step === 1) return name.length > 0 && symbol.length > 0;
        if (step === 2) return parseFloat(totalSupply) > 0;
        if (step === 3) return parseFloat(hardCap) > 0 && parseFloat(softCap) > 0 && parseFloat(softCap) <= parseFloat(hardCap) && parseFloat(duration) > 0;
        if (step === 4) return parseFloat(yieldRate) > 0 && parseFloat(yieldRate) <= 500 && parseFloat(epochDuration) >= 1;
        return true;
    };

    // ── Success screen ──
    if (isSuccess) {
        return (
            <div className="create-bond-overlay">
                <div className="create-bond-card">
                    <div className="success-icon">Check</div>
                    <h2>Bond Created!</h2>
                    <p>Your bond <strong>{formData.name}</strong> has been deployed.</p>
                    <p className="hint">Contributors can now invest HBAR in your bond.</p>
                    <div className="bond-summary">
                        <div className="summary-row"><span>Yield Rate</span><span>{formData.yieldRate}% APY</span></div>
                        <div className="summary-row"><span>Hard Cap</span><span>{formData.hardCap} HBAR</span></div>
                        <div className="summary-row"><span>Duration</span><span>{formData.duration} days</span></div>
                        <div className="summary-row"><span>Epoch</span><span>Every {formData.epochDuration}h</span></div>
                    </div>
                    <button className="btn-primary" style={{ width: "100%", marginTop: 24 }} onClick={() => { onSuccess?.(); onClose(); }}>
                        Done
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="create-bond-overlay">
            <div className="create-bond-card">
                <div className="card-header">
                    <h2>Create a Bond</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="step-indicator">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <div key={s} className={`step-dot ${step >= s ? "active" : ""}`}>
                            {s}
                        </div>
                    ))}
                </div>

                {/* Step 1: Identity */}
                {step === 1 && (
                    <div className="step-content">
                        <h3>Bond Identity</h3>
                        <label>
                            <span>Bond Name</span>
                            <input
                                type="text"
                                placeholder="e.g. GameFi Growth Bond"
                                value={formData.name}
                                onChange={(e) => updateField("name", e.target.value)}
                            />
                        </label>
                        <label>
                            <span>Symbol</span>
                            <input
                                type="text"
                                placeholder="e.g. GGB"
                                value={formData.symbol}
                                onChange={(e) => updateField("symbol", e.target.value.toUpperCase())}
                                maxLength={8}
                            />
                        </label>
                        <label>
                            <span>Description</span>
                            <textarea
                                placeholder="Describe what this bond funds and how yield is generated..."
                                value={formData.description}
                                onChange={(e) => updateField("description", e.target.value)}
                                rows={3}
                            />
                        </label>
                    </div>
                )}

                {/* Step 2: Token Supply */}
                {step === 2 && (
                    <div className="step-content">
                        <h3>Token Supply</h3>
                        <label>
                            <span>Total Supply</span>
                            <input
                                type="number"
                                placeholder="e.g. 1000000"
                                value={formData.totalSupply}
                                onChange={(e) => updateField("totalSupply", e.target.value)}
                            />
                            <span className="hint">95% distributed to bond buyers, 5% to creator</span>
                        </label>
                    </div>
                )}

                {/* Step 3: Raise Config */}
                {step === 3 && (
                    <div className="step-content">
                        <h3>Raise Configuration</h3>
                        <div className="input-row">
                            <label>
                                <span>Hard Cap (HBAR)</span>
                                <input
                                    type="number"
                                    placeholder="e.g. 100000"
                                    value={formData.hardCap}
                                    onChange={(e) => updateField("hardCap", e.target.value)}
                                />
                            </label>
                            <label>
                                <span>Soft Cap (HBAR)</span>
                                <input
                                    type="number"
                                    placeholder="e.g. 25000"
                                    value={formData.softCap}
                                    onChange={(e) => updateField("softCap", e.target.value)}
                                />
                            </label>
                        </div>
                        <label>
                            <span>Raise Duration (days)</span>
                            <input
                                type="number"
                                placeholder="e.g. 7"
                                value={formData.duration}
                                onChange={(e) => updateField("duration", e.target.value)}
                            />
                        </label>
                    </div>
                )}

                {/* Step 4: Yield Config */}
                {step === 4 && (
                    <div className="step-content">
                        <h3>Yield Configuration</h3>
                        <label>
                            <span>Annual Yield Rate (%)</span>
                            <input
                                type="number"
                                placeholder="e.g. 5"
                                value={formData.yieldRate}
                                onChange={(e) => updateField("yieldRate", e.target.value)}
                                step="0.1"
                            />
                            <span className="hint">Yield is paid in bond tokens (minted each epoch)</span>
                        </label>
                        <label>
                            <span>Epoch Duration (hours)</span>
                            <input
                                type="number"
                                placeholder="e.g. 24"
                                value={formData.epochDuration}
                                onChange={(e) => updateField("epochDuration", e.target.value)}
                                min="1"
                            />
                            <span className="hint">How often yield is distributed. Min: 1 hour</span>
                        </label>
                    </div>
                )}

                {/* Step 5: Review & Deploy */}
                {step === 5 && (
                    <div className="step-content">
                        <h3>Review & Deploy</h3>
                        <div className="bond-summary">
                            <div className="summary-row"><span>Name</span><span>{formData.name} ({formData.symbol})</span></div>
                            <div className="summary-row"><span>Supply</span><span>{Number(formData.totalSupply).toLocaleString()} tokens</span></div>
                            <div className="summary-row"><span>Hard Cap</span><span>{Number(formData.hardCap).toLocaleString()} HBAR</span></div>
                            <div className="summary-row"><span>Soft Cap</span><span>{Number(formData.softCap).toLocaleString()} HBAR</span></div>
                            <div className="summary-row"><span>Duration</span><span>{formData.duration} days</span></div>
                            <div className="summary-row highlight"><span>Yield Rate</span><span>{formData.yieldRate}% APY</span></div>
                            <div className="summary-row"><span>Epoch</span><span>Every {formData.epochDuration}h</span></div>
                        </div>
                        {formData.description && (
                            <div className="description-preview">
                                <span>Description</span>
                                <p>{formData.description}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Error display */}
                {error && (
                    <div className="error-box">
                        Error: {error.message?.substring(0, 200)}
                        <button onClick={reset} className="retry-link">Try Again</button>
                    </div>
                )}

                {/* Navigation */}
                <div className="step-nav">
                    {step > 1 && (
                        <button className="btn-secondary" onClick={() => setStep(step - 1)} disabled={isPending}>
                            ← Back
                        </button>
                    )}
                    <div style={{ flex: 1 }} />
                    {step < 5 ? (
                        <button
                            className="btn-primary"
                            onClick={() => setStep(step + 1)}
                            disabled={!isValid()}
                        >
                            Next →
                        </button>
                    ) : (
                        <button
                            className="btn-primary deploy-btn"
                            onClick={handleDeploy}
                            disabled={isPending || !address}
                        >
                            {isPending ? "Deploying..." : "Deploy Bond"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
