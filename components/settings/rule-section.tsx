"use client";

import { useState } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { AutoTagRule } from "@/lib/autotag";

type Props = {
	tag: string;
	rules: AutoTagRule[];
	compact?: boolean;
	onRulesChange: (rules: AutoTagRule[]) => void;
	onDirtyChange: (dirty: boolean) => void;
};

export function RuleSection({ tag, rules, compact = false, onRulesChange, onDirtyChange }: Props) {
	const [newTerm, setNewTerm] = useState("");

	const handleTermChange = (idx: number, term: string) => {
		onDirtyChange(true);
		onRulesChange(rules.map((r, i) => (i === idx ? { ...r, term } : r)));
	};

	const handleDelete = (idx: number) => {
		onDirtyChange(true);
		onRulesChange(rules.filter((_, i) => i !== idx));
	};

	const handleMoveUp = (idx: number) => {
		if (idx === 0) return;
		onDirtyChange(true);
		const updated = [...rules];
		[updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]] as [AutoTagRule, AutoTagRule];
		onRulesChange(updated);
	};

	const handleMoveDown = (idx: number) => {
		if (idx === rules.length - 1) return;
		onDirtyChange(true);
		const updated = [...rules];
		[updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]] as [AutoTagRule, AutoTagRule];
		onRulesChange(updated);
	};

	const handleAdd = () => {
		const term = newTerm.trim();
		if (!term) return;
		onDirtyChange(true);
		onRulesChange([...rules, { index: -1, term, tag }]);
		setNewTerm("");
	};

	return (
		<AccordionItem value={tag}>
			<AccordionTrigger className={compact ? "px-1.5 py-1 text-[0.55rem]" : "px-2 py-1.5 text-xs"}>
				<span className="flex items-center gap-2">
					{tag}
					<span className="rounded-full bg-muted px-1.5 py-0 text-[0.55rem] tabular-nums text-muted-foreground">
						{rules.length}
					</span>
				</span>
			</AccordionTrigger>
			<AccordionContent>
				<div className={compact ? "pb-1" : "pb-2"}>
					{rules.length === 0 ? (
						<p className="px-2 py-2 text-[0.6rem] text-muted-foreground">
							No rules for this tag.
						</p>
					) : (
						<div className="mb-1 rounded-md border">
							{rules.map((rule, i) => (
								<div
									key={i}
									className={`flex items-center gap-1 border-b last:border-b-0 ${compact ? "px-1.5 py-0.5" : "px-2 py-1"}`}
								>
									<div className="flex flex-col gap-0">
										<Button
											variant="ghost"
											size="xs"
											className={`p-0 ${compact ? "h-2.5 w-3 text-[0.45rem] leading-none" : "h-3.5 w-3.5 text-[0.5rem]"}`}
											disabled={i === 0}
											onClick={() => handleMoveUp(i)}
											aria-label="Move up"
										>
											▲
										</Button>
										<Button
											variant="ghost"
											size="xs"
											className={`p-0 ${compact ? "h-2.5 w-3 text-[0.45rem] leading-none" : "h-3.5 w-3.5 text-[0.5rem]"}`}
											disabled={i === rules.length - 1}
											onClick={() => handleMoveDown(i)}
											aria-label="Move down"
										>
											▼
										</Button>
									</div>

									<input
										type="text"
										className={`flex-1 rounded-md border bg-background px-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring ${compact ? "h-5 text-[0.6rem]" : "h-6"}`}
										placeholder='e.g. "swiggy"'
										value={rule.term}
										onChange={(e) => handleTermChange(i, e.target.value)}
									/>

									<Button
										variant="ghost"
										size="xs"
										className={`shrink-0 text-destructive ${compact ? "h-4 w-4 p-0 text-[0.5rem]" : ""}`}
										onClick={() => handleDelete(i)}
									>
										✕
									</Button>
								</div>
							))}
						</div>
					)}

					<div className={`flex gap-1 ${compact ? "px-1.5" : "px-2"}`}>
						<input
							type="text"
							className={`flex-1 rounded-md border bg-background px-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring ${compact ? "h-5 text-[0.6rem]" : "h-6"}`}
							placeholder={`Add "${tag}" rule...`}
							value={newTerm}
							onChange={(e) => setNewTerm(e.target.value)}
							onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
						/>
						<Button size="xs" variant="outline" onClick={handleAdd} disabled={!newTerm.trim()}>
							Add
						</Button>
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
