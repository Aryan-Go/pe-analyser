"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDashboardStore, useFilteredRows } from "@/stores/dashboard";
import { CategoryChip } from "./category-chip";

export function CategoryMetricsTable() {
	const analysis = useDashboardStore((s) => s.analysis);

	if (!analysis || analysis.metrics.categoryMetrics.length === 0) return null;

	return (
		<div className="overflow-x-auto">
			<h3 className="mb-2 text-sm font-semibold">Category Breakdown</h3>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Category</TableHead>
						<TableHead className="text-right">Total</TableHead>
						<TableHead className="text-right">Count</TableHead>
						<TableHead className="text-right">Share</TableHead>
						<TableHead className="text-right">Avg</TableHead>
						<TableHead className="text-right">Credit</TableHead>
						<TableHead className="text-right">Debit</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{analysis.metrics.categoryMetrics.map((c) => (
						<TableRow key={c.category}>
							<TableCell>
								<CategoryChip category={c.category} size="sm" />
							</TableCell>
							<TableCell className="text-right tabular-nums">₹{c.amount.toLocaleString("en-IN")}</TableCell>
							<TableCell className="text-right tabular-nums">{c.count}</TableCell>
							<TableCell className="text-right tabular-nums">{c.share}%</TableCell>
							<TableCell className="text-right tabular-nums">₹{c.averageAmount.toLocaleString("en-IN")}</TableCell>
							<TableCell className="text-right tabular-nums text-emerald-500">₹{c.creditAmount.toLocaleString("en-IN")}</TableCell>
							<TableCell className="text-right tabular-nums text-red-500">₹{c.debitAmount.toLocaleString("en-IN")}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
