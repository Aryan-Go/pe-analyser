"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStore } from "@/stores/dashboard";

export function SummaryCards() {
	const analysis = useDashboardStore((s) => s.filteredAnalysis);

	if (!analysis) return null;

	const s = analysis.metrics.summary;
	const avgTxn = s.totalCount > 0 ? Math.round(s.totalOutflow / s.totalCount) : 0;
	const cards = [
		{ label: "Total Inflow", value: `₹${s.totalInflow.toLocaleString("en-IN")}`, tone: "text-emerald-500" },
		{ label: "Total Outflow", value: `₹${s.totalOutflow.toLocaleString("en-IN")}`, tone: "text-red-500" },
		{ label: "Net Cashflow", value: `₹${s.netCashflow.toLocaleString("en-IN")}`, tone: s.netCashflow >= 0 ? "text-emerald-500" : "text-red-500" },
		{ label: "Avg Txn Size", value: `₹${avgTxn.toLocaleString("en-IN")}`, tone: "text-foreground" },
		{ label: "Transactions", value: s.totalCount.toLocaleString(), tone: "text-foreground" },
	];

	return (
		<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
			{cards.map((c) => (
				<Card key={c.label} size="sm">
					<CardHeader>
						<CardDescription>{c.label}</CardDescription>
						<CardTitle className={c.tone}>{c.value}</CardTitle>
					</CardHeader>
				</Card>
			))}
		</div>
	);
}
