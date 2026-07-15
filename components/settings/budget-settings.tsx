"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

type Props = {
	amount: number;
	onSave: (amount: number) => Promise<void>;
	saving: boolean;
};

export function BudgetSettings({ amount: initialAmount, onSave, saving }: Props) {
	const [amount, setAmount] = useState(initialAmount);
	const [dirty, setDirty] = useState(false);
	const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

	useEffect(() => {
		setAmount(initialAmount);
		setDirty(false);
	}, [initialAmount]);

	const handleSave = async () => {
		if (amount < 0) {
			setMessage({ type: "err", text: "Budget must be a positive number." });
			return;
		}
		setMessage(null);
		await onSave(amount);
		setDirty(false);
		setMessage({ type: "ok", text: "Budget saved." });
	};

	return (
		<div className="rounded-lg border p-4">
			<h3 className="text-sm font-semibold">Monthly Budget</h3>
			<p className="mt-1 text-xs text-muted-foreground">
				Set a global monthly spending limit. The dashboard will show how much you can still
				spend this month.
			</p>

			<div className="mt-3 flex items-center gap-2">
				<span className="text-xs text-muted-foreground">₹</span>
				<input
					type="number"
					min={0}
					className="h-7 w-32 rounded-md border px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
					value={amount || ""}
					onChange={(e) => {
						setAmount(Number(e.target.value) || 0);
						setDirty(true);
					}}
				/>
				<Button size="xs" onClick={handleSave} disabled={!dirty || saving}>
					{saving ? "Saving..." : "Save"}
				</Button>
			</div>

			{dirty && (
				<div className="mt-2 rounded border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[0.55rem] text-amber-600 dark:text-amber-400">
					Unsaved changes
				</div>
			)}

			{message && (
				<div
					className={`mt-2 rounded border px-2 py-1 text-[0.55rem] ${
						message.type === "ok"
							? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
							: "border-destructive/50 bg-destructive/10 text-destructive"
					}`}
				>
					{message.text}
				</div>
			)}
		</div>
	);
}
