"use client";

import { Button } from "@/components/ui/button";
import { CategoryChip } from "./category-chip";
import { useDashboardStore } from "@/stores/dashboard";

export function CategoryPills() {
	const analysis = useDashboardStore((s) => s.analysis);
	const filters = useDashboardStore((s) => s.filters);
	const toggleCategoryFilter = useDashboardStore((s) => s.toggleCategoryFilter);
	const clearFilters = useDashboardStore((s) => s.clearFilters);

	if (!analysis) return null;

	const catMetrics = analysis.metrics.categoryMetrics.filter((c) => c.category !== "Uncategorized");
	const hasFilters = filters.month || filters.categories.length > 0;

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{catMetrics.map((c) => (
				<CategoryChip
					key={c.category}
					category={c.category}
					active={filters.categories.includes(c.category)}
					onClick={() => toggleCategoryFilter(c.category)}
				/>
			))}
			{hasFilters && (
				<Button variant="ghost" size="xs" onClick={clearFilters}>
					Clear
				</Button>
			)}
		</div>
	);
}
