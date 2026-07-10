"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GroupedAutoTagRules } from "@/components/settings/grouped-auto-tag-rules";
import type { AutoTagRule } from "@/lib/autotag";
import { ALLOWED_CATEGORIES } from "@/lib/categories";

type Props = {
	open: boolean;
	onClose: () => void;
	anchorEl: HTMLElement | null;
};

export function RulesPopup({ open, onClose, anchorEl }: Props) {
	const [rules, setRules] = useState<AutoTagRule[]>([]);
	const [tags, setTags] = useState<string[]>([...ALLOWED_CATEGORIES]);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
	const [dirty, setDirty] = useState(false);
	const panelRef = useRef<HTMLDivElement>(null);

	const fetchData = useCallback(async () => {
		try {
			const [tagsRes, rulesRes] = await Promise.all([
				fetch("/api/tags"),
				fetch("/api/autotag"),
			]);
			const tagsData = await tagsRes.json();
			const rulesData = await rulesRes.json();

			if (tagsData.ok && Array.isArray(tagsData.tags)) {
				setTags((tagsData.tags as Array<{ tag: string }>).map((t) => t.tag));
			}
			if (rulesData.ok && Array.isArray(rulesData.rules)) {
				setRules(rulesData.rules as AutoTagRule[]);
			}
		} catch {
			setMessage({ type: "err", text: "Failed to load rules." });
		}
	}, []);

	useEffect(() => {
		if (open) {
			fetchData();
			setMessage(null);
			setDirty(false);
		}
	}, [open, fetchData]);

	useEffect(() => {
		if (!open) return;
		function handleClick(e: MouseEvent) {
			const target = e.target as Node;
			if (panelRef.current && !panelRef.current.contains(target)) {
				const inSelect = (target as Element).closest('[data-slot="select-content"]');
				if (!inSelect) {
					onClose();
				}
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [open, onClose]);

	const handleSave = async () => {
		const valid = rules.filter((r) => r.term.trim() && r.tag.trim());
		if (valid.length !== rules.length) {
			setMessage({ type: "err", text: "All rules must have both a term and a tag." });
			return;
		}

		setSaving(true);
		setMessage(null);

		try {
			const res = await fetch("/api/autotag", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ rules: valid }),
			});
			const data = await res.json();

			if (data.ok) {
				setRules(data.rules as AutoTagRule[]);
				setDirty(false);
				setMessage({
					type: "ok",
					text: `Saved ${data.rules.length} rules. ${data.reprocessedFolders} folder(s) reprocessed.`,
				});
			} else {
				setMessage({ type: "err", text: data.error || "Failed to save." });
			}
		} catch {
			setMessage({ type: "err", text: "Failed to save." });
		} finally {
			setSaving(false);
		}
	};

	if (!open || !anchorEl) return null;

	const rect = anchorEl.getBoundingClientRect();
	const viewportHeight = window.innerHeight;
	const popupWidth = 360;

	return (
		<div className="fixed inset-0 z-50" ref={panelRef}>
			<div
				className="absolute overflow-y-auto rounded-lg border bg-popover p-3 shadow-lg"
				style={{
					left: Math.max(4, rect.right - popupWidth),
					width: popupWidth,
					bottom: viewportHeight - rect.top + 4,
					maxHeight: `min(85vh, ${rect.top - 8}px)`,
				}}
			>
				<div className="mb-2 flex items-center justify-between">
					<h3 className="text-xs font-semibold">Auto-Tag Rules</h3>
					<Button variant="ghost" size="xs" className="h-5 w-5 p-0 text-[0.6rem]" onClick={onClose}>
						✕
					</Button>
				</div>

				<p className="mb-2 text-[0.55rem] leading-relaxed text-muted-foreground">
					Top rule = highest priority. Only untagged rows are matched. Manual tags are never overwritten.
				</p>

				{message && (
					<div
						className={`mb-2 rounded-md border px-2 py-1 text-[0.55rem] ${
							message.type === "ok"
								? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
								: "border-destructive/50 bg-destructive/10 text-destructive"
						}`}
					>
						{message.text}
					</div>
				)}

				{dirty && (
					<div className="mb-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[0.55rem] text-amber-600 dark:text-amber-400">
						Unsaved changes
					</div>
				)}

				<GroupedAutoTagRules
					rules={rules}
					tags={tags}
					compact
					onChange={setRules}
					onDirtyChange={setDirty}
					onSave={handleSave}
					saving={saving}
				/>
			</div>
		</div>
	);
}
