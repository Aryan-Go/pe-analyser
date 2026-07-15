"use client";

import { Card, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { useDashboardStore } from "@/stores/dashboard";
import { BudgetCard } from "./budget-card";

export function SummaryCards() {
	const analysis = useDashboardStore((s) => s.filteredAnalysis);

	const s = analysis?.metrics.summary;
	const statCards = s
		? (() => {
				const avgTxn = s.totalCount > 0 ? Math.round(s.totalOutflow / s.totalCount) : 0;
				return [
					{ key: "total-inflow", label: "Total Inflow", value: `₹${s.totalInflow.toLocaleString("en-IN")}`, tone: "text-emerald-500" },
					{ key: "total-outflow", label: "Total Outflow", value: `₹${s.totalOutflow.toLocaleString("en-IN")}`, tone: "text-red-500" },
					{ key: "net-cashflow", label: "Net Cashflow", value: `₹${s.netCashflow.toLocaleString("en-IN")}`, tone: s.netCashflow >= 0 ? "text-emerald-500" : "text-red-500" },
					{ key: "avg-txn", label: "Avg Txn Size", value: `₹${avgTxn.toLocaleString("en-IN")}`, tone: "text-foreground" },
					{ key: "transactions", label: "Transactions", value: s.totalCount.toLocaleString(), tone: "text-foreground" },
				];
		  })()
		: [];

	return (
		<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
			<BudgetCard />
			{statCards.map((c) => (
				<Card key={c.key} size="sm">
					<CardHeader>
						<CardDescription>{c.label}</CardDescription>
						<CardTitle className={c.tone}>{c.value}</CardTitle>
					</CardHeader>
				</Card>
			))}
		</div>
	);
}
