"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/stores/dashboard";

export function BudgetCard() {
	const [budget, setBudget] = useState(0);
	const [editing, setEditing] = useState(false);
	const [editAmount, setEditAmount] = useState("");
	const [saving, setSaving] = useState(false);

	const analysis = useDashboardStore((s) => s.filteredAnalysis);
	const filters = useDashboardStore((s) => s.filters);

	useEffect(() => {
		fetch("/api/budget")
			.then((r) => r.json())
			.then((d) => { if (d.ok) setBudget(d.amount); });
	}, []);

	const handleSave = useCallback(async () => {
		const amount = Number(editAmount) || 0;
		setSaving(true);
		await fetch("/api/budget", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ amount }),
		});
		setBudget(amount);
		setSaving(false);
		setEditing(false);
	}, [editAmount]);

	const hasFilters = (filters.month || filters.categories.length > 0);
	const net = analysis?.metrics.summary.netCashflow ?? null;
	const totalInflow = analysis?.metrics.summary.totalInflow ?? 0;
	const totalOutflow = analysis?.metrics.summary.totalOutflow ?? 0;
	const available = net !== null ? budget + net : 0;

	return (
		<Card size="sm">
			<CardHeader>
				<CardDescription>
					<div className="flex items-center gap-2">
						Available to Spend
						<Button
							variant="ghost"
							size="xs"
							className="h-4 w-4 p-0 text-[0.55rem] text-muted-foreground hover:text-foreground"
							onClick={() => { setEditAmount(String(budget)); setEditing(true); }}
						>
							✎
						</Button>
					</div>
				</CardDescription>
				<CardTitle className={available >= 0 ? "text-emerald-500" : "text-red-500"}>
					{net === null ? "—" : `${available < 0 ? "-" : ""}₹${Math.abs(available).toLocaleString("en-IN")}`}
				</CardTitle>
				<div className="mt-0.5 flex flex-col gap-0.5 text-[0.55rem] text-muted-foreground">
					<div className="flex items-center justify-between">
						<span>Budget</span>
						<span>₹{budget.toLocaleString("en-IN")}</span>
					</div>
					<div className="flex items-center justify-between">
						<span>{hasFilters ? "Net" : "Net (all)"}</span>
						<span>{net !== null ? `${net >= 0 ? "+" : ""}₹${net.toLocaleString("en-IN")}` : "—"}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-emerald-500">In</span>
						<span className="text-emerald-500">₹{totalInflow.toLocaleString("en-IN")}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-red-500">Out</span>
						<span className="text-red-500">₹{totalOutflow.toLocaleString("en-IN")}</span>
					</div>
				</div>
			</CardHeader>

			{editing && (
				<div className="border-t px-3 pb-2 pt-1.5">
					<div className="flex items-center gap-1">
						<span className="text-[0.55rem] text-muted-foreground">₹</span>
						<input
							type="number"
							min={0}
							autoFocus
							className="h-5 w-20 rounded border px-1 text-[0.55rem] focus:outline-none focus:ring-1 focus:ring-ring"
							value={editAmount}
							onChange={(e) => setEditAmount(e.target.value)}
							onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
						/>
						<Button size="xs" className="h-4 text-[0.5rem]" onClick={handleSave} disabled={saving}>
							{saving ? "..." : "Save"}
						</Button>
						<Button size="xs" variant="ghost" className="h-4 text-[0.5rem]" onClick={() => setEditing(false)}>
							Cancel
						</Button>
					</div>
				</div>
			)}
		</Card>
	);
}
