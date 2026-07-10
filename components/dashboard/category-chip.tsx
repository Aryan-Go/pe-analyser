"use client";

import { getCategoryAbbreviation, isValidCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";

type CategoryChipProps = {
	category: string;
	onClick?: () => void;
	active?: boolean;
	size?: "sm" | "default";
};

export function CategoryChip({ category, onClick, active, size = "default" }: CategoryChipProps) {
	const isUntagged = category === "" || category === "Uncategorized";
	const label = isUntagged ? "Untagged" : category;
	const abbr = isUntagged ? "—" : isValidCategory(category) ? getCategoryAbbreviation(category) : label.slice(0, 3).toUpperCase();

	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-full border px-2 py-0.5 text-[0.625rem] font-medium select-none",
				"border-border bg-card text-muted-foreground dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
				onClick && "cursor-pointer hover:border-zinc-400 hover:text-foreground dark:hover:border-zinc-500 dark:hover:text-zinc-100",
				active && [
					"bg-primary text-primary-foreground border-primary",
					"dark:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-200",
					"hover:bg-primary/80 hover:text-primary-foreground dark:hover:bg-zinc-300 dark:hover:text-zinc-900",
				],
				size === "sm" && "h-4 px-1.5 text-[0.55rem]",
			)}
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
			onClick={onClick}
			onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
		>
			{abbr}
		</span>
	);
}
