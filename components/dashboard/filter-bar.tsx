"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardStore, useAvailableMonths } from "@/stores/dashboard";

export function FilterBar() {
	const filters = useDashboardStore((s) => s.filters);
	const setFilter = useDashboardStore((s) => s.setFilter);
	const months = useAvailableMonths();
	const analysis = useDashboardStore((s) => s.analysis);

	if (!analysis) return null;

	return (
		<div className="flex items-center gap-2">
			<span className="text-xs font-medium text-muted-foreground">Month</span>

			<Select
				value={filters.month ?? "all"}
				onValueChange={(v) => setFilter("month", v === "all" ? null : v)}
			>
				<SelectTrigger size="sm" className="w-32">
					<SelectValue placeholder="Month" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All months</SelectItem>
					{months.map((m) => (
						<SelectItem key={m} value={m}>{m}</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
