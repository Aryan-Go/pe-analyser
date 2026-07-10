"use client";

import { Badge } from "@/components/ui/badge";
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
		<Badge
			variant={onClick ? "outline" : "secondary"}
			className={cn(
				"cursor-default",
				onClick && "cursor-pointer hover:bg-accent hover:text-accent-foreground",
				active && "bg-primary text-primary-foreground hover:bg-primary/80",
				size === "sm" && "h-4 px-1.5 text-[0.55rem]",
			)}
			onClick={onClick}
		>
			{abbr}
		</Badge>
	);
}
