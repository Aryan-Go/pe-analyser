import { mkdir, readdir, readFile, stat, writeFile, copyFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { readCsvRows, rowsToCsv, type TxnRow } from "./pdf/parse";
import { analyzeCsvFiles, type WebAppPayload } from "./pdf/analyse";

export type FolderSummary = {
	folderName: string;
	generatedAt: string;
	transactionCount: number;
	totalInflow: number;
	totalOutflow: number;
	netCashflow: number;
	categoryCount: number;
	topCategory: string;
};

export type FolderSnapshot = {
	folderName: string;
	folderPath: string;
	pdfPath: string;
	csvPath: string;
	parsedTextPath: string;
	trendPath: string;
	mappingPath: string;
	rows: TxnRow[];
	analysis: WebAppPayload;
};

const adjectives = [
	"curious",
	"ecstatic",
	"silent",
	"vivid",
	"brisk",
	"gentle",
	"lunar",
	"proud",
	"nimble",
	"steady",
	"amber",
	"noisy",
	"mellow",
	"atomic",
	"cosmic",
];

const nouns = [
	"monkey",
	"banana",
	"comet",
	"lantern",
	"falcon",
	"river",
	"forest",
	"ember",
	"harbor",
	"planet",
	"panda",
	"rocket",
	"walnut",
	"signal",
	"valley",
];

function pick<T>(values: T[]): T {
	return values[Math.floor(Math.random() * values.length)] as T;
}

function createBaseName(): string {
	return `${pick(adjectives)}-${pick(nouns)}`;
}

export async function pathExists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

export async function ensureDir(path: string): Promise<void> {
	await mkdir(path, { recursive: true });
}

export function folderPaths(dataDir: string, folderName: string) {
	const folderPath = join(dataDir, folderName);
	return {
		folderPath,
		pdfPath: join(folderPath, `${folderName}.pdf`),
		csvPath: join(folderPath, `${folderName}.csv`),
		parsedTextPath: join(folderPath, `${folderName}-parsed.txt`),
		trendPath: join(folderPath, `${folderName}-trend.json`),
		mappingPath: join(folderPath, `${folderName}-categories.json`),
	};
}

export function isValidFolderName(folderName: string): boolean {
	return /^[a-z0-9-]+$/i.test(folderName);
}

export async function createUniqueFolderName(dataDir: string, prefix = ""): Promise<string> {
	const base = `${prefix}${createBaseName()}`;
	let candidate = base;
	while (await pathExists(join(dataDir, candidate))) {
		candidate = `${base}-${randomUUID().slice(0, 8)}`;
	}

	return candidate;
}

export async function persistTrend(dataDir: string, folderName: string, analysis: WebAppPayload): Promise<void> {
	const { trendPath } = folderPaths(dataDir, folderName);
	await writeFile(trendPath, JSON.stringify(analysis, null, 2), "utf-8");
}

export async function persistCategoryMapping(dataDir: string, folderName: string, rows: TxnRow[]): Promise<void> {
	const { mappingPath } = folderPaths(dataDir, folderName);
	const payload = {
		folderName,
		updatedAt: new Date().toISOString(),
		categories: rows.map((row) => ({ txnId: row.txnId, category: row.category })),
	};

	await writeFile(mappingPath, JSON.stringify(payload, null, 2), "utf-8");
}

export async function readCategories(dataDir: string, folderName: string): Promise<Record<string, string> | null> {
	const { mappingPath } = folderPaths(dataDir, folderName);
	try {
		const raw = await readFile(mappingPath, "utf-8");
		const parsed = JSON.parse(raw) as { categories?: Array<{ txnId: string; category: string }> };
		if (Array.isArray(parsed.categories)) {
			const map: Record<string, string> = {};
			for (const entry of parsed.categories) {
				if (entry.txnId && entry.category) {
					map[entry.txnId] = entry.category;
				}
			}
			return map;
		}
		return null;
	} catch {
		return null;
	}
}

export async function readTrend(dataDir: string, folderName: string): Promise<WebAppPayload | null> {
	const { trendPath } = folderPaths(dataDir, folderName);
	try {
		const raw = await readFile(trendPath, "utf-8");
		const parsed = JSON.parse(raw) as WebAppPayload;
		if (parsed?.metrics?.categoryMetrics?.length !== undefined) {
			return parsed;
		}
		return null;
	} catch {
		return null;
	}
}

export async function getAnalysisFolders(dataDir: string): Promise<string[]> {
	await ensureDir(dataDir);
	const entries = await readdir(dataDir, { withFileTypes: true });
	const folders = entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);

	const validFolders: { name: string; created: number }[] = [];
	for (const folderName of folders) {
		const { csvPath } = folderPaths(dataDir, folderName);
		if (!(await pathExists(csvPath))) continue;
		const folderPath = join(dataDir, folderName);
		const info = await stat(folderPath);
		validFolders.push({ name: folderName, created: info.birthtimeMs ?? info.ctimeMs });
	}

	validFolders.sort((a, b) => b.created - a.created);
	return validFolders.map((f) => f.name);
}

export async function loadAnalysis(dataDir: string, folderName: string): Promise<WebAppPayload> {
	const trend = await readTrend(dataDir, folderName);
	if (trend) {
		return trend;
	}

	const { folderPath } = folderPaths(dataDir, folderName);
	const analysis = await analyzeCsvFiles(folderPath);
	await persistTrend(dataDir, folderName, analysis);
	return analysis;
}

export async function loadFolderSnapshot(dataDir: string, folderName: string): Promise<FolderSnapshot | null> {
	if (!isValidFolderName(folderName)) {
		return null;
	}

	const paths = folderPaths(dataDir, folderName);
	if (!(await pathExists(paths.csvPath))) {
		return null;
	}

	const [analysis, rows] = await Promise.all([
		loadAnalysis(dataDir, folderName),
		readCsvRows(paths.csvPath),
	]);
	await persistCategoryMapping(dataDir, folderName, rows);

	return {
		folderName,
		...paths,
		rows,
		analysis,
	};
}

export async function listFolderSummaries(dataDir: string): Promise<FolderSummary[]> {
	const folders = await getAnalysisFolders(dataDir);
	const snapshots = await Promise.all(
		folders.map((folderName) =>
			loadAnalysis(dataDir, folderName).then((analysis) => ({ folderName, analysis })),
		),
	);

	return snapshots.map(({ folderName, analysis }) => {
		const categoryMetrics = analysis.metrics.categoryMetrics ?? [];
		const topCategory = categoryMetrics[0]?.category ?? "Uncategorized";
		return {
			folderName,
			generatedAt: analysis.meta.generatedAt,
			transactionCount: analysis.meta.transactionCount,
			totalInflow: analysis.metrics.summary.totalInflow,
			totalOutflow: analysis.metrics.summary.totalOutflow,
			netCashflow: analysis.metrics.summary.netCashflow,
			categoryCount: analysis.metrics.categoryMetrics.length,
			topCategory,
		};
	});
}

export async function mergeFolders(dataDir: string, folderNames: [string, string]): Promise<{ folderName: string; snapshot: FolderSnapshot }> {
	if (folderNames[0] === folderNames[1]) {
		throw new Error("Cannot merge a folder with itself.");
	}

	for (const name of folderNames) {
		if (!isValidFolderName(name)) {
			throw new Error(`Invalid folder name: ${name}`);
		}
		const { csvPath } = folderPaths(dataDir, name);
		if (!(await pathExists(csvPath))) {
			throw new Error(`Folder "${name}" has no CSV data.`);
		}
	}

	const rowsA = await readCsvRows(folderPaths(dataDir, folderNames[0]).csvPath);
	const rowsB = await readCsvRows(folderPaths(dataDir, folderNames[1]).csvPath);

	if (rowsA.length === 0) throw new Error(`Folder "${folderNames[0]}" has no transactions.`);
	if (rowsB.length === 0) throw new Error(`Folder "${folderNames[1]}" has no transactions.`);

	const merged = new Map<string, TxnRow>();
	for (const r of rowsA) merged.set(r.txnId, r);

	for (const rB of rowsB) {
		const existing = merged.get(rB.txnId);
		if (!existing) {
			merged.set(rB.txnId, rB);
			continue;
		}

		const tsA = new Date(`${existing.date} ${existing.time}`).getTime();
		const tsB = new Date(`${rB.date} ${rB.time}`).getTime();

		if (tsB > tsA) {
			if (!rB.category && existing.category) {
				merged.set(rB.txnId, { ...rB, category: existing.category });
			} else {
				merged.set(rB.txnId, rB);
			}
		} else if (tsB < tsA) {
			// keep existing — nothing to do
		} else {
			const winner = { ...rB };
			if (!winner.category && existing.category) {
				winner.category = existing.category;
			}
			merged.set(rB.txnId, winner);
		}
	}

	const mergedRows = Array.from(merged.values()).sort((a, b) => {
		const da = new Date(`${a.date} ${a.time}`).getTime();
		const db = new Date(`${b.date} ${b.time}`).getTime();
		return db - da;
	});

	const { loadAutoTagRules, applyAutoTags } = await import("./autotag");
	const rules = await loadAutoTagRules();
	const finalRows = applyAutoTags(mergedRows, rules);

	const folderName = await createUniqueFolderName(dataDir, "merged-");
	const { folderPath, csvPath } = folderPaths(dataDir, folderName);
	await mkdir(folderPath, { recursive: true });
	await writeFile(csvPath, rowsToCsv(finalRows), "utf-8");

	const sourceFolderA = folderPaths(dataDir, folderNames[0]).folderPath;
	const sourceFolderB = folderPaths(dataDir, folderNames[1]).folderPath;
	const pdfsA = (await readdir(sourceFolderA)).filter((f) => f.endsWith(".pdf"));
	const pdfsB = (await readdir(sourceFolderB)).filter((f) => f.endsWith(".pdf"));

	let pdfCounter = 0;
	for (const pdf of pdfsA) {
		pdfCounter++;
		await copyFile(join(sourceFolderA, pdf), join(folderPath, `${folderName}_${pdfCounter}.pdf`));
	}
	for (const pdf of pdfsB) {
		pdfCounter++;
		await copyFile(join(sourceFolderB, pdf), join(folderPath, `${folderName}_${pdfCounter}.pdf`));
	}

	const analysis = await analyzeCsvFiles(folderPath);
	await persistTrend(dataDir, folderName, analysis);
	await persistCategoryMapping(dataDir, folderName, finalRows);

	const snapshot: FolderSnapshot = {
		folderName,
		folderPath,
		pdfPath: pdfCounter > 0 ? join(folderPath, `${folderName}_1.pdf`) : "",
		csvPath,
		parsedTextPath: join(folderPath, `${folderName}-parsed.txt`),
		trendPath: join(folderPath, `${folderName}-trend.json`),
		mappingPath: join(folderPath, `${folderName}-categories.json`),
		rows: finalRows,
		analysis,
	};

	return { folderName, snapshot };
}
