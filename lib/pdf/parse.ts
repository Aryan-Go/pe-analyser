import { readFile, writeFile } from "node:fs/promises";
import { extname, join, basename } from "node:path";
import pdfParse from "pdf-parse";
import type { StatementSource, TxnRow, TxnType } from "./types";
import { parseStatementFromText } from "./providers";

export function csvEscape(value: string): string {
	if (/[",\n]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}

	return value;
}

export function rowsToCsv(rows: TxnRow[]): string {
	const header = "Txn ID,UTR,Date,Time,Amount,Sent to,CREDIT or DEBIT,Category";
	const body = rows.map((row) =>
		[
			row.txnId,
			row.utr,
			row.date,
			row.time,
			row.amount,
			row.sentTo,
			row.type,
			row.category,
		]
			.map(csvEscape)
			.join(","),
	);

	return [header, ...body].join("\n");
}

export function parseCsvText(rawCsv: string): TxnRow[] {
	const lines = rawCsv.split(/\r?\n/).filter((line) => line.trim().length > 0);
	if (lines.length <= 1) {
		return [];
	}

	function parseLine(line: string): string[] {
		const values: string[] = [];
		let current = "";
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i] ?? "";

			if (char === '"') {
				const next = line[i + 1] ?? "";
				if (inQuotes && next === '"') {
					current += '"';
					i += 1;
					continue;
				}

				inQuotes = !inQuotes;
				continue;
			}

			if (char === "," && !inQuotes) {
				values.push(current);
				current = "";
				continue;
			}

			current += char;
		}

		values.push(current);
		return values;
	}

	const rows: TxnRow[] = [];
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i] ?? "";
		const values = parseLine(line);
		if (values.length < 8) {
			continue;
		}

		const [txnId, utr, date, time, amount, sentTo, type, category] = values;
		rows.push({
			txnId: (txnId ?? "").trim(),
			utr: (utr ?? "").trim(),
			date: (date ?? "").trim(),
			time: (time ?? "").trim(),
			amount: (amount ?? "").trim(),
			sentTo: (sentTo ?? "").trim(),
			type: ((type ?? "").trim().toUpperCase() === "CREDIT" ? "CREDIT" : "DEBIT") as TxnType,
			category: (category ?? "").trim(),
		});
	}

	return rows;
}

export async function readCsvRows(csvPath: string): Promise<TxnRow[]> {
	const rawCsv = await readFile(csvPath, "utf-8");
	return parseCsvText(rawCsv);
}

export async function writeCsvRows(csvPath: string, rows: TxnRow[]): Promise<void> {
	await writeFile(csvPath, rowsToCsv(rows), "utf-8");
}

export async function updateCsvCategories(
	csvPath: string,
	categoryMap: Record<string, string>,
): Promise<TxnRow[]> {
	const rows = await readCsvRows(csvPath);
	const updatedRows = rows.map((row) => ({
		...row,
		category: (categoryMap[row.txnId] ?? row.category ?? "").trim(),
	}));
	await writeCsvRows(csvPath, updatedRows);
	return updatedRows;
}

export type CreateArtifactsResult = {
	parsedTextPath: string;
	csvPath: string;
	parsedText: string;
	csv: string;
	source: StatementSource;
	rowCount: number;
};

export async function createArtifactsFromPdf(
	filePath: string,
	outputDir: string,
	csvFileName?: string,
	source?: StatementSource,
): Promise<CreateArtifactsResult> {
	const fileBuffer = await readFile(filePath);
	const result = await pdfParse(fileBuffer);
	const { source: resolvedSource, cleanText, rows } = parseStatementFromText(result.text, source);
	const baseName = basename(filePath, extname(filePath));
	const parsedTextPath = join(outputDir, `${baseName}-parsed.txt`);
	const csvPath = join(outputDir, csvFileName ?? `${baseName}-data.csv`);
	const csv = rowsToCsv(rows);

	await writeFile(parsedTextPath, cleanText, "utf-8");
	await writeFile(csvPath, csv, "utf-8");

	return {
		parsedTextPath,
		csvPath,
		parsedText: cleanText,
		csv,
		source: resolvedSource,
		rowCount: rows.length,
	};
}

export type { StatementSource, TxnRow, TxnType };
