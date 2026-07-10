"use client";

import { CategoryChip } from "./category-chip";
import { useDashboardStore } from "@/stores/dashboard";

export function CategoryPills() {
	const analysis = useDashboardStore((s) => s.analysis);
	const setCategory = useDashboardStore((s) => s.setCategory);
	const filters = useDashboardStore((s) => s.filters);
	const setFilter = useDashboardStore((s) => s.setFilter);

	if (!analysis) return null;

	const catMetrics = analysis.metrics.categoryMetrics.filter((c) => c.category !== "Uncategorized");

	return (
		<div className="flex flex-wrap gap-1.5">
			{catMetrics.map((c) => (
				<CategoryChip
					key={c.category}
					category={c.category}
					active={filters.category === c.category}
					onClick={() => setFilter("category", filters.category === c.category ? null : c.category)}
				/>
			))}
			<span className="text-[0.6rem] text-muted-foreground self-center ml-1">click to filter</span>
		</div>
	);
}
