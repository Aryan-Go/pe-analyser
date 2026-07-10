import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { TxnRow } from "./pdf/parse";
import { readCsvRows, rowsToCsv } from "./pdf/parse";
import { folderPaths, getAnalysisFolders, persistTrend, persistCategoryMapping } from "./storage";
import { analyzeCsvFiles } from "./pdf/analyse";

const DATA_DIR = join(process.cwd(), "data");
const AUTOTAG_PATH = join(DATA_DIR, "autotag.json");
const TAGS_PATH = join(DATA_DIR, "tags.json");

export type AutoTagRule = {
	index: number;
	term: string;
	tag: string;
};

export type TagDef = {
	tag: string;
	short: string;
};

const DEFAULT_TAGS: TagDef[] = [
	{ tag: "FOOD", short: "FOOD" },
	{ tag: "TRANSPORT", short: "TRN" },
	{ tag: "SUBSCRIPTION", short: "SUB" },
	{ tag: "STATIONARY", short: "STN" },
	{ tag: "PERSONAL", short: "PER" },
	{ tag: "OTHERS", short: "OTH" },
	{ tag: "POCKET_MONEY", short: "PKT" },
];

export async function loadTags(): Promise<TagDef[]> {
	try {
		const raw = await readFile(TAGS_PATH, "utf-8");
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed) && parsed.every((t) => t?.tag && t?.short)) {
			return parsed as TagDef[];
		}
		throw new Error("Invalid tags format");
	} catch {
		await writeFile(TAGS_PATH, JSON.stringify(DEFAULT_TAGS, null, 2), "utf-8");
		return [...DEFAULT_TAGS];
	}
}

export async function loadAutoTagRules(): Promise<AutoTagRule[]> {
	try {
		const raw = await readFile(AUTOTAG_PATH, "utf-8");
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) throw new Error("Invalid format");
		const valid = parsed.filter(
			(r: unknown): r is AutoTagRule =>
				typeof (r as AutoTagRule).index === "number" &&
				typeof (r as AutoTagRule).term === "string" &&
				typeof (r as AutoTagRule).tag === "string",
		);
		return valid.sort((a, b) => a.index - b.index);
	} catch {
		await writeFile(AUTOTAG_PATH, JSON.stringify([], null, 2), "utf-8");
		return [];
	}
}

export async function saveAutoTagRules(rules: Pick<AutoTagRule, "term" | "tag">[]): Promise<void> {
	const tags = await loadTags();
	const tagNames = new Set(tags.map((t) => t.tag));

	for (const rule of rules) {
		if (!rule.term || !rule.term.trim()) {
			throw new Error(`Rule with empty term is not allowed.`);
		}
		if (!rule.tag || !tagNames.has(rule.tag)) {
			throw new Error(`Invalid tag "${rule.tag}". Must be one of: ${[...tagNames].join(", ")}`);
		}
	}

	const cleaned: AutoTagRule[] = rules.map((r, i) => ({
		index: i,
		term: r.term.trim(),
		tag: r.tag.trim(),
	}));

	await writeFile(AUTOTAG_PATH, JSON.stringify(cleaned, null, 2), "utf-8");
}

export function applyAutoTags(rows: TxnRow[], rules: AutoTagRule[]): TxnRow[] {
	const sorted = [...rules].filter((r) => r.term.length > 0).sort((a, b) => a.index - b.index);

	return rows.map((row) => {
		if (row.category !== "") return row;

		for (const rule of sorted) {
			if (row.sentTo.toLowerCase().includes(rule.term.toLowerCase())) {
				return { ...row, category: rule.tag };
			}
		}

		return row;
	});
}

export async function reprocessAllFolders(dataDir: string, rules: AutoTagRule[]): Promise<number> {
	const folders = await getAnalysisFolders(dataDir);
	if (folders.length === 0 || rules.length === 0) return 0;

	let changedCount = 0;

	for (const folderName of folders) {
		const paths = folderPaths(dataDir, folderName);
		const rows = await readCsvRows(paths.csvPath);
		const tagged = applyAutoTags(rows, rules);

		const anyChanged = tagged.some((r, i) => r.category !== (rows[i]?.category ?? ""));
		if (!anyChanged) continue;

		await writeFile(paths.csvPath, rowsToCsv(tagged), "utf-8");
		const analysis = await analyzeCsvFiles(paths.folderPath);
		await persistTrend(dataDir, folderName, analysis);
		await persistCategoryMapping(dataDir, folderName, tagged);
		changedCount++;
	}

	return changedCount;
}
