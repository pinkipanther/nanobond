"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "nanobondMigrationNoticeDismissed";

export default function MigrationModal() {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		if (window.localStorage.getItem(DISMISS_KEY) !== "true") {
			const timer = window.setTimeout(() => setIsOpen(true), 0);
			return () => window.clearTimeout(timer);
		}
	}, []);

	const closeModal = () => {
		window.localStorage.setItem(DISMISS_KEY, "true");
		setIsOpen(false);
	};

	if (!isOpen) return null;

	return (
		<div
			className="migration-modal-overlay"
			onClick={(event) => {
				if (event.target === event.currentTarget) closeModal();
			}}
		>
			<section
				className="migration-modal-shell"
				aria-labelledby="migration-modal-title"
				aria-modal="true"
				role="dialog"
			>
				<button
					aria-label="Close migration notice"
					className="migration-modal-close"
					onClick={closeModal}
					type="button"
				>
					&times;
				</button>

				<p className="migration-modal-kicker">NanoBond update</p>
				<h2 className="migration-modal-title" id="migration-modal-title">
					NanoBond is migrating
				</h2>
				<p className="migration-modal-copy">
					We are moving NanoBond to a refreshed V2 experience with better UX,
					usability, and more launch tools. Continue on the upgraded app at
					v2.nanobond.xyz.
				</p>

				<div className="migration-modal-actions">
					<a
						className="migration-modal-primary"
						href="https://v2.nanobond.xyz"
						rel="noreferrer"
						target="_blank"
					>
						Open V2
					</a>
					<button
						className="migration-modal-secondary"
						onClick={closeModal}
						type="button"
					>
						Stay here
					</button>
				</div>
			</section>
		</div>
	);
}
