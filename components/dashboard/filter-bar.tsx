"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardStore, useAvailableMonths, useAvailableCategories } from "@/stores/dashboard";
import { Button } from "@/components/ui/button";

export function FilterBar() {
	const filters = useDashboardStore((s) => s.filters);
	const setFilter = useDashboardStore((s) => s.setFilter);
	const clearFilters = useDashboardStore((s) => s.clearFilters);
	const months = useAvailableMonths();
	const categories = useAvailableCategories();
	const analysis = useDashboardStore((s) => s.analysis);

	if (!analysis) return null;

	const hasFilters = filters.month || filters.category;

	return (
		<div className="flex items-center gap-2">
			<span className="text-xs font-medium text-muted-foreground">Filters</span>

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

			<Select
				value={filters.category ?? "all"}
				onValueChange={(v) => setFilter("category", v === "all" ? null : v)}
			>
				<SelectTrigger size="sm" className="w-32">
					<SelectValue placeholder="Category" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All categories</SelectItem>
					{categories.map((c) => (
						<SelectItem key={c} value={c}>{c}</SelectItem>
					))}
				</SelectContent>
			</Select>

			{hasFilters && (
				<Button variant="ghost" size="xs" onClick={clearFilters}>
					Clear
				</Button>
			)}
		</div>
	);
}
