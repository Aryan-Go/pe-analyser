"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { AutoTagRule } from "@/lib/autotag";

type Props = {
	rule: AutoTagRule;
	index: number;
	total: number;
	tags: string[];
	compact?: boolean;
	onChange: (rule: AutoTagRule) => void;
	onDelete: () => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
};

export function AutoTagRuleRow({ rule, index, total, tags, compact = false, onChange, onDelete, onMoveUp, onMoveDown }: Props) {
	return (
		<div className={`flex items-center gap-1 border-b last:border-b-0 ${compact ? "px-2 py-1" : "px-4 py-2"}`}>
			{compact ? (
				<span className="w-5 text-center text-[0.55rem] tabular-nums text-muted-foreground">
					{index + 1}
				</span>
			) : (
				<span className="w-8 text-center text-[0.6rem] tabular-nums text-muted-foreground">
					{index + 1}
				</span>
			)}

			<div className="flex gap-0.5">
				<Button
					variant="ghost"
					size="xs"
					className={`p-0 ${compact ? "h-3 w-3 text-[0.5rem]" : "h-4 w-4"}`}
					disabled={index === 0}
					onClick={onMoveUp}
					aria-label="Move up"
				>
					▲
				</Button>
				<Button
					variant="ghost"
					size="xs"
					className={`p-0 ${compact ? "h-3 w-3 text-[0.5rem]" : "h-4 w-4"}`}
					disabled={index === total - 1}
					onClick={onMoveDown}
					aria-label="Move down"
				>
					▼
				</Button>
			</div>

			<input
				type="text"
				className={`flex-1 rounded-md border bg-background px-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring ${compact ? "h-6 text-[0.65rem]" : "h-8"}`}
				placeholder={compact ? 'e.g. "swiggy"' : 'Term in sender name (e.g. "swiggy")'}
				value={rule.term}
				onChange={(e) => onChange({ ...rule, term: e.target.value })}
			/>

			<Select value={rule.tag || undefined} onValueChange={(v) => { if (v) onChange({ ...rule, tag: v }); }}>
				<SelectTrigger size="sm" className={compact ? "w-24" : "w-36"}>
					<SelectValue placeholder="Tag" />
				</SelectTrigger>
				<SelectContent>
					{tags.map((t) => (
						<SelectItem key={t} value={t}>
							{t}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Button
				variant="ghost"
				size="xs"
				className={`shrink-0 text-destructive ${compact ? "h-4 w-4 p-0 text-[0.5rem]" : ""}`}
				onClick={onDelete}
			>
				✕
			</Button>
		</div>
	);
}
