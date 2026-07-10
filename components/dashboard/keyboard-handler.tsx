"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/stores/dashboard";

export function KeyboardHandler() {
	const focusNextRow = useDashboardStore((s) => s.focusNextRow);
	const tagFocusedRow = useDashboardStore((s) => s.tagFocusedRow);
	const clearFocus = useDashboardStore((s) => s.clearFocus);
	const focusedRowTxnId = useDashboardStore((s) => s.focusedRowTxnId);
	const analysis = useDashboardStore((s) => s.analysis);

	useEffect(() => {
		if (!analysis) return;

		function handleKeyDown(e: KeyboardEvent) {
			const active = document.activeElement;
			if (!active) return;

			const tag = active.tagName;
			const isInput = tag === "INPUT" || tag === "TEXTAREA" || (active as HTMLElement).isContentEditable;

			if (isInput) {
				if (active instanceof HTMLInputElement && active.type === "checkbox") {
					if (e.key === "ArrowUp" || e.key === "ArrowDown") {
						e.preventDefault();
						focusNextRow(e.key === "ArrowDown" ? 1 : -1);
					}
				}
				return;
			}

			if (e.key === "ArrowUp" || e.key === "ArrowDown") {
				e.preventDefault();
				focusNextRow(e.key === "ArrowDown" ? 1 : -1);
				return;
			}

			if (/^[0-9]$/.test(e.key) && focusedRowTxnId) {
				e.preventDefault();
				tagFocusedRow(e.key);
				return;
			}

			if (e.key === "Escape") {
				e.preventDefault();
				clearFocus();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [analysis, focusedRowTxnId, focusNextRow, tagFocusedRow, clearFocus]);

	return null;
}
