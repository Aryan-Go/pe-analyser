"use client";

import { useMemo } from "react";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { RuleSection } from "./rule-section";
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

export function GroupedAutoTagRules({ rules, tags, onChange, onDirtyChange, onSave, saving, compact = false }: Props) {
	const grouped = useMemo(() => {
		const map: Record<string, AutoTagRule[]> = {};
		for (const tag of tags) map[tag] = [];
		for (const rule of rules) {
			if (!map[rule.tag]) map[rule.tag] = [];
			map[rule.tag].push(rule);
		}
		return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
	}, [rules, tags]);

	const totalCount = rules.length;
	const canSave = rules.every((r) => r.term.trim() && r.tag.trim()) && !saving;

	const handleSectionChange = (tag: string, sectionRules: AutoTagRule[]) => {
		const others = rules.filter((r) => r.tag !== tag);
		const merged = [...others, ...sectionRules.map((r) => ({ ...r, tag }))];
		onChange(merged);
	};

	return (
		<div className={`flex flex-col ${compact ? "gap-2" : "gap-4"}`}>
			<Accordion multiple>
				{grouped.map(([tag, sectionRules]) => (
					<RuleSection
						key={tag}
						tag={tag}
						rules={sectionRules}
						compact={compact}
						onRulesChange={(r) => handleSectionChange(tag, r)}
						onDirtyChange={onDirtyChange}
					/>
				))}
			</Accordion>

			<div className="flex gap-2 items-center">
				<span className="text-[0.55rem] text-muted-foreground">{totalCount} rule{totalCount !== 1 ? "s" : ""}</span>
				<div className="flex-1" />
				<Button size="xs" onClick={onSave} disabled={!canSave}>
					{saving ? "Saving..." : "Save"}
				</Button>
			</div>
		</div>
	);
}
