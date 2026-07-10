"use client";

import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/stores/dashboard";
import { ALLOWED_CATEGORIES } from "@/lib/categories";
import { CategoryChip } from "./category-chip";

export function BatchActionBar() {
	const selection = useDashboardStore((s) => s.selection);
	const batchSetCategory = useDashboardStore((s) => s.batchSetCategory);
	const clearSelection = useDashboardStore((s) => s.clearSelection);

	if (selection.size === 0) return null;

	return (
		<div className="sticky bottom-0 flex items-center gap-3 rounded-lg border bg-background p-2 shadow-lg">
			<span className="text-xs font-medium">{selection.size} selected</span>
			<div className="flex gap-1.5">
				<CategoryChip key="clear" category="" onClick={() => batchSetCategory("")} />
				{ALLOWED_CATEGORIES.map((cat) => (
					<CategoryChip
						key={cat}
						category={cat}
						onClick={() => batchSetCategory(cat)}
					/>
				))}
			</div>
			<Button variant="ghost" size="xs" onClick={clearSelection} className="ml-auto">
				Cancel
			</Button>
		</div>
	);
}
