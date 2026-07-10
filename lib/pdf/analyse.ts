import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { readCsvRows } from "./parse";
import { Analyser, buildWebAppPayload, type CsvTxn, type TxnRow } from "./analyser";

export type {
	CsvTxn, SummaryMetrics, TrendPoint, PartyAggregate, CategoryAggregate,
	Outlier, RecurringPayment, DataQuality, AnalysisMetrics, WebAppPayload,
} from "./analyser";

function parseDateTime(date: string, time: string): Date | null {
	const parsed = new Date(`${date} ${time}`);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function csvRowToCsvTxn(row: TxnRow): CsvTxn | null {
	const timestamp = parseDateTime(row.date, row.time);
	if (!timestamp) return null;
	return {
		txnId: row.txnId, utr: row.utr, date: row.date, time: row.time,
		amount: Number.parseFloat(row.amount), sentTo: row.sentTo, type: row.type,
		category: row.category, timestamp,
	};
}

export async function loadCsvTransactions(dataDir: string): Promise<{ files: string[]; transactions: CsvTxn[] }> {
	const entries = await readdir(dataDir, { withFileTypes: true });
	const files = entries
		.filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".csv")
		.map((entry) => join(dataDir, entry.name))
		.sort((a, b) => a.localeCompare(b));

	const allRows = await Promise.all(files.map((file) => readCsvRows(file)));
	const transactions = allRows.flat().map(csvRowToCsvTxn).filter((txn): txn is CsvTxn => txn !== null);

	return { files, transactions };
}

export async function analyzeCsvFiles(dataDir: string) {
	const { files, transactions } = await loadCsvTransactions(dataDir);
	const analyser = new Analyser(transactions);
	const metrics = analyser.runAllMetrics();
	return buildWebAppPayload(metrics, transactions.length);
}
