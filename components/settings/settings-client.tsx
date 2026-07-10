"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GroupedAutoTagRules } from "./grouped-auto-tag-rules";
import type { AutoTagRule } from "@/lib/autotag";
import { ALLOWED_CATEGORIES } from "@/lib/categories";

export function SettingsClient() {
	const router = useRouter();
	const [rules, setRules] = useState<AutoTagRule[]>([]);
	const [tags, setTags] = useState<string[]>([...ALLOWED_CATEGORIES]);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
	const [dirty, setDirty] = useState(false);

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
			setMessage({ type: "err", text: "Failed to load settings." });
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

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
					text: `Saved ${data.rules.length} rules. ${data.reprocessedFolders} folder(s) updated.`,
				});
			} else {
				setMessage({ type: "err", text: data.error || "Failed to save rules." });
			}
		} catch {
			setMessage({ type: "err", text: "Failed to save rules." });
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="flex h-screen overflow-hidden">
			<aside className="flex w-52 shrink-0 flex-col gap-4 border-r p-3">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold">Settings</h2>
				</div>
				<Button variant="ghost" size="xs" onClick={() => router.push("/dashboard")}>
					← Back to Dashboard
				</Button>
			</aside>
			<main className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
				<div>
					<h1 className="text-lg font-semibold">Auto-Tag Rules</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Auto-tag rules are applied to untagged transactions during upload and after saving. Rules at
						the top have higher priority. Transactions you've already tagged manually will never be
						overwritten. Re-ordering or adding rules only affects untagged rows.
					</p>
				</div>

				{dirty && (
					<div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
						You have unsaved changes.
					</div>
				)}

				{message && (
					<div
						className={`rounded-md border px-3 py-2 text-xs ${
							message.type === "ok"
								? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
								: "border-destructive/50 bg-destructive/10 text-destructive"
						}`}
					>
						{message.text}
					</div>
				)}

				<GroupedAutoTagRules rules={rules} tags={tags} onChange={setRules} onDirtyChange={setDirty} onSave={handleSave} saving={saving} />
			</main>
		</div>
	);
}
