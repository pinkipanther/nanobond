"use client";

import { useState, useEffect } from "react";

export default function EmailPopup() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check if user has already seen the popup
        const hasSeenPopup = localStorage.getItem("hasSeenEmailPopup");
        
        if (!hasSeenPopup) {
            // Show after 5 seconds
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 5000);
            
            return () => clearTimeout(timer);
        }
    }, []);

    const closePopup = () => {
        setIsOpen(false);
        localStorage.setItem("hasSeenEmailPopup", "true");
    };

    if (!isOpen) return null;

    return (
        <div 
            style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 99999, padding: "20px"
            }} 
            onClick={(e) => { if (e.target === e.currentTarget) closePopup(); }}
        >
            <div className="glass-card" style={{
                position: "relative", width: "100%", maxWidth: "480px",
                background: "var(--void-light)",
                border: "1px solid var(--void-border)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "0 24px 48px rgba(0,0,0,0.15)",
                animation: "count-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                overflow: "hidden" // for iframe rounding
            }}>
                {/* Close Button */}
                <button
                    onClick={closePopup}
                    style={{
                        position: "absolute", top: "12px", right: "12px",
                        background: "var(--void-surface)", border: "1px solid var(--void-border)", color: "var(--text-secondary)",
                        cursor: "pointer", fontSize: "16px", width: "32px", height: "32px",
                        borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s", zIndex: 10
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = "var(--void-border)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "var(--void-surface)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                    ✕
                </button>

                <div style={{ width: "100%", height: "320px", position: "relative" }}>
                    <iframe 
                        src="https://tally.so/r/vGBrYg?transparentBackground=1" 
                        width="100%" 
                        height="100%" 
                        style={{ border: "none", margin: 0, padding: 0 }}
                        title="Subscribe"
                    />
                </div>
            </div>
        </div>
    );
}