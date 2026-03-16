"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function EmailPopup() {
	const [isOpen, setIsOpen] = useState(false);
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const { address, isConnected } = useAccount();

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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email) return;

		setStatus("loading");

		try {
			await addDoc(collection(db, "subscribers"), {
				email,
				walletAddress: isConnected ? address : null,
				timestamp: serverTimestamp(),
			});
			setStatus("success");
			setTimeout(() => closePopup(), 2000);
		} catch (error) {
			console.error("Error adding document: ", error);
			setStatus("error");
		}
	};

	if (!isOpen) return null;

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: "rgba(15, 23, 42, 0.6)",
				backdropFilter: "blur(8px)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 99999,
				padding: "20px",
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) closePopup();
			}}
		>
			<div
				className="glass-card"
				style={{
					position: "relative",
					width: "100%",
					maxWidth: "420px",
					background: "var(--void-light)",
					border: "1px solid var(--void-border)",
					borderRadius: "var(--radius-lg)",
					boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
					animation: "count-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
					padding: "32px",
					textAlign: "center",
				}}
			>
				{/* Close Button */}
				<button
					onClick={closePopup}
					style={{
						position: "absolute",
						top: "12px",
						right: "12px",
						background: "var(--void-surface)",
						border: "1px solid var(--void-border)",
						color: "var(--text-secondary)",
						cursor: "pointer",
						fontSize: "16px",
						width: "32px",
						height: "32px",
						borderRadius: "50%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						transition: "all 0.2s",
						zIndex: 10,
					}}
					onMouseOver={(e) => {
						e.currentTarget.style.background = "var(--void-border)";
						e.currentTarget.style.color = "var(--text-primary)";
					}}
					onMouseOut={(e) => {
						e.currentTarget.style.background = "var(--void-surface)";
						e.currentTarget.style.color = "var(--text-secondary)";
					}}
				>
					✕
				</button>

				{/* <h2 style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, marginBottom: "12px", color: "var(--text-primary)" }}> */}
				{/*     Join the NanoBond List */}
				{/* </h2> */}
				{/* <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px", lineHeight: "1.5" }}> */}
				{/*     Subscribe to get early access to new launches and exclusive updates.  */}
				{/*     {isConnected ? " Your wallet will be linked for future airdrops!" : " Connect your wallet for extra benefits."} */}
				{/* </p> */}
				{/**/}
				{/* {status === "success" ? ( */}
				{/*     <div style={{ background: "var(--acid-dim)", color: "var(--acid)", padding: "16px", borderRadius: "var(--radius-md)", fontWeight: 600 }}> */}
				{/*         Thanks for subscribing! */}
				{/*     </div> */}
				{/* ) : ( */}
				{/*     <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}> */}
				{/*         <div style={{ position: "relative" }}> */}
				{/*             <input */}
				{/*                 type="email" */}
				{/*                 placeholder="Enter your email address" */}
				{/*                 value={email} */}
				{/*                 onChange={(e) => setEmail(e.target.value)} */}
				{/*                 required */}
				{/*                 className="input-field" */}
				{/*                 style={{ width: "100%", padding: "14px 16px" }} */}
				{/*                 disabled={status === "loading"} */}
				{/*             /> */}
				{/*         </div> */}
				{/**/}
				{/*         {isConnected && address && ( */}
				{/*             <div style={{ background: "var(--cyan-dim)", color: "var(--cyan)", padding: "10px", borderRadius: "var(--radius-md)", fontSize: "12px", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}> */}
				{/*                 Linked Wallet: {address.slice(0, 6)}...{address.slice(-4)} */}
				{/*             </div> */}
				{/*         )} */}
				{/**/}
				{/*         <button  */}
				{/*             type="submit"  */}
				{/*             className="btn-primary"  */}
				{/*             style={{ width: "100%", marginTop: "8px" }} */}
				{/*             disabled={status === "loading"} */}
				{/*         > */}
				{/*             {status === "loading" ? "Subscribing..." : "Subscribe Now"} */}
				{/*         </button> */}
				{/**/}
				{/*         {status === "error" && ( */}
				{/*             <div style={{ color: "var(--magenta)", fontSize: "13px", marginTop: "8px" }}> */}
				{/*                 Something went wrong. Please try again. */}
				{/*             </div> */}
				{/*         )} */}
				{/*     </form> */}
				{/* )} */}

				<div
					style={{
						marginTop: "24px",
						fontSize: "11px",
						color: "var(--text-dim)",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						gap: "6px",
					}}
				>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
					</svg>
					We respect your privacy. No spam.
				</div>
			</div>
		</div>
	);
}
