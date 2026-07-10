"use client";

import { Button } from "@/components/ui/button";
import { AutoTagRuleRow } from "./auto-tag-rule-row";
import type { AutoTagRule } from "@/lib/autotag";

type Props = {
	rules: AutoTagRule[];
	tags: string[];
	onChange: (rules: AutoTagRule[]) => void;
	onDirtyChange: (dirty: boolean) => void;
	onSave: () => void;
	saving: boolean;
	compact?: boolean;
};

export function AutoTagRules({ rules, tags, onChange, onDirtyChange, onSave, saving, compact = false }: Props) {
	const handleAdd = () => {
		const updated = rules.some((r) => !r.term.trim())
			? [...rules]
			: [...rules, { index: rules.length, term: "", tag: tags[0] ?? "" }];
		onDirtyChange(true);
		onChange(updated);
	};

	const handleChange = (index: number, rule: AutoTagRule) => {
		const updated = rules.map((r, i) => (i === index ? rule : r));
		onDirtyChange(true);
		onChange(updated);
	};

	const handleDelete = (index: number) => {
		const updated = rules.filter((_, i) => i !== index);
		onDirtyChange(true);
		onChange(updated);
	};

	const handleMoveUp = (index: number) => {
		if (index === 0) return;
		const updated = [...rules];
		[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]] as [AutoTagRule, AutoTagRule];
		onDirtyChange(true);
		onChange(updated);
	};

	const handleMoveDown = (index: number) => {
		if (index === rules.length - 1) return;
		const updated = [...rules];
		[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]] as [AutoTagRule, AutoTagRule];
		onDirtyChange(true);
		onChange(updated);
	};

	const canSave = rules.every((r) => r.term.trim() && r.tag.trim()) && !saving;

	return (
		<div className={`flex flex-col ${compact ? "gap-2" : "gap-4"}`}>
			<div className="rounded-md border">
				{rules.length === 0 && (
					<div className="px-4 py-8 text-center text-sm text-muted-foreground">
						No rules yet. Add a rule to automatically tag transactions during upload and merge.
					</div>
				)}
				{rules.map((rule, i) => (
					<AutoTagRuleRow
						key={`${i}-${rule.term}`}
						rule={rule}
						index={i}
						total={rules.length}
						tags={tags}
						compact={compact}
						onChange={(r) => handleChange(i, r)}
						onDelete={() => handleDelete(i)}
						onMoveUp={() => handleMoveUp(i)}
						onMoveDown={() => handleMoveDown(i)}
					/>
				))}
			</div>

			<div className="flex gap-2">
				<Button size="xs" variant="outline" onClick={handleAdd}>
					Add Rule
				</Button>
				<Button size="xs" onClick={onSave} disabled={!canSave}>
					{saving ? "Saving..." : "Save Rules"}
				</Button>
			</div>
		</div>
	);
}
