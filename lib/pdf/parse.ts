import { readFile, writeFile } from "node:fs/promises";
import { extname, join, basename } from "node:path";
import pdfParse from "pdf-parse";

export function PII(text: string): string {
	const lines = text.split(/\r?\n/);
	const cleaned: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const currentLine = lines[i] ?? "";
		const normalized = currentLine.trim().toLowerCase();

		if (normalized.includes("credited to") || normalized.includes("paid by")) {
			i += 1;
			continue;
		}

		cleaned.push(currentLine);
	}

	return cleaned.join("\n");
}

export function removeNonTransactionInfo(text: string): string {
	const lines = text.split(/\r?\n/);
	const cleaned: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();

		if (trimmed.length === 0) {
			cleaned.push(line);
			continue;
		}

		if (/^transaction statement for\b/i.test(trimmed)) {
			continue;
		}

		if (/^\d{1,2}\s+[A-Za-z]{3},\s+\d{4}\s*-\s*\d{1,2}\s+[A-Za-z]{3},\s+\d{4}$/i.test(trimmed)) {
			continue;
		}

		if (/^datetransaction detailstypeamount$/i.test(trimmed.replace(/\s+/g, ""))) {
			continue;
		}

		if (/^page\s+\d+\s+of\s+\d+$/i.test(trimmed)) {
			continue;
		}

		if (/^this is a system generated statement\./i.test(trimmed)) {
			continue;
		}

		if (/^this is an automatically generated statement\./i.test(trimmed)) {
			continue;
		}

		if (/^of any errors in the statement\b/i.test(trimmed)) {
			continue;
		}

		if (/^terms-conditions\//i.test(trimmed)) {
			continue;
		}

		if (/^disclaimer\s*:/i.test(trimmed)) {
			continue;
		}

		if (/^etc\. through sms, emails and calls\./i.test(trimmed)) {
			continue;
		}

		if (/^the contents of this email and document are confidential\b/i.test(trimmed)) {
			continue;
		}

		if (/^the recipient specified in this document\./i.test(trimmed)) {
			continue;
		}

		if (/^https:\/\/support\.phonepe\.com\/statement\b/i.test(trimmed)) {
			continue;
		}

		if (/^auto$/i.test(trimmed)) {
			continue;
		}

		cleaned.push(line);
	}

	return cleaned.join("\n");
}

export type TxnType = "CREDIT" | "DEBIT";

export type TxnRow = {
	txnId: string;
	utr: string;
	date: string;
	time: string;
	amount: string;
	sentTo: string;
	type: TxnType;
	category: string;
};

export function normalizeSentTo(description: string): string {
	return description
		.replace(/^received from\s*/i, "")
		.replace(/^paid to\s*/i, "")
		.replace(/^payment to\s*/i, "")
		.replace(/^mobile recharged\s*/i, "")
		.trim();
}

export function parseTransactionsFromCleanText(text: string): TxnRow[] {
	const lines = text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	const rows: TxnRow[] = [];
	const dateRegex = /^[A-Za-z]{3}\s+\d{1,2},\s+\d{4}$/;
	const timeRegex = /^\d{1,2}:\d{2}\s*[ap]m$/i;

	let i = 0;
	while (i < lines.length) {
		if (!dateRegex.test(lines[i] ?? "") || !timeRegex.test(lines[i + 1] ?? "")) {
			i += 1;
			continue;
		}

		const date = lines[i] as string;
		const time = lines[i + 1] as string;
		i += 2;

		const detailLines: string[] = [];
		while (i < lines.length && !/^Transaction ID\b/i.test(lines[i] ?? "")) {
			detailLines.push(lines[i] as string);
			i += 1;
		}

		if (detailLines.length === 0 || i >= lines.length) {
			continue;
		}

		const firstDetail = detailLines[0] ?? "";
		const detailMatch = firstDetail.match(/^(CREDIT|DEBIT)₹([\d,]+(?:\.\d+)?)\s*(.*)$/i);
		if (!detailMatch) {
			continue;
		}

		const type = (detailMatch[1] ?? "").toUpperCase() as TxnType;
		const amount = (detailMatch[2] ?? "").replace(/,/g, "");
		const restInFirstLine = detailMatch[3] ?? "";
		const extraDetail = detailLines.slice(1).join(" ");
		const description = `${restInFirstLine} ${extraDetail}`.trim();
		const sentTo = normalizeSentTo(description);

		const txnLine = lines[i] as string;
		const txnId = txnLine.replace(/^Transaction ID\s*/i, "").trim();
		i += 1;

		let utr = "";
		if (i < lines.length && /^UTR No\./i.test(lines[i] ?? "")) {
			utr = (lines[i] as string).replace(/^UTR No\.\s*/i, "").trim();
			i += 1;
		}

		rows.push({
			txnId,
			utr,
			date,
			time,
			amount,
			sentTo,
			type,
			category: "",
		});
	}

	return rows;
}

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

export async function createArtifactsFromPdf(
	filePath: string,
	outputDir: string,
	csvFileName?: string,
): Promise<{
	parsedTextPath: string;
	csvPath: string;
	parsedText: string;
	csv: string;
}> {
	const fileBuffer = await readFile(filePath);
	const result = await pdfParse(fileBuffer);
	const finalText = removeNonTransactionInfo(PII(result.text));
	const baseName = basename(filePath, extname(filePath));
	const parsedTextPath = join(outputDir, `${baseName}-parsed.txt`);
	const csvPath = join(outputDir, csvFileName ?? `${baseName}-data.csv`);
	const csv = rowsToCsv(parseTransactionsFromCleanText(finalText));

	await writeFile(parsedTextPath, finalText, "utf-8");
	await writeFile(csvPath, csv, "utf-8");

	return {
		parsedTextPath,
		csvPath,
		parsedText: finalText,
		csv,
	};
}
