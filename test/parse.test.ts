import { afterEach, describe, expect, it, test, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("pdf-parse", () => ({ default: vi.fn() }));
import pdfParse from "pdf-parse";

import {
	PII,
	createArtifactsFromPdf,
	csvEscape,
	normalizeSentTo,
	parseCsvText,
	parseTransactionsFromCleanText,
	readCsvRows,
	removeNonTransactionInfo,
	rowsToCsv,
	updateCsvCategories,
	writeCsvRows,
	type TxnRow,
} from "../lib/pdf/parse";

const mockedPdfParse = vi.mocked(pdfParse);

function makeRow(overrides: Partial<TxnRow> = {}): TxnRow {
	return {
		txnId: "T1",
		utr: "123",
		date: "Jan 05, 2026",
		time: "10:00 am",
		amount: "100",
		sentTo: "X",
		type: "DEBIT",
		category: "",
		...overrides,
	};
}

function block(
	date: string,
	line = "DEBIT₹100Paid to X",
	opts: { time?: string; txnId?: string; utr?: string } = {},
): string {
	return [
		date,
		opts.time ?? "10:00 am",
		line,
		`Transaction ID ${opts.txnId ?? "T1"}`,
		opts.utr ?? "UTR No. 123",
	].join("\n");
}

const tempDirs: string[] = [];
async function tempDir(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "pe-parse-"));
	tempDirs.push(dir);
	return dir;
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("normalizeSentTo", () => {
	test.each([
		["Received from Maa", "Maa"],
		["Paid to A R Enterprises", "A R Enterprises"],
		["Payment to SPOTIFY", "SPOTIFY"],
		["Mobile recharged 6370685137", "6370685137"],
		["Paid to   Vaani  ", "Vaani"],
		["Some unrelated note", "Some unrelated note"],
	])("normalizes %j -> %j", (input, expected) => {
		expect(normalizeSentTo(input)).toBe(expected);
	});
});

describe("csvEscape", () => {
	test.each([
		["plain", "plain"],
		["a,b", '"a,b"'],
		['say "hi"', '"say ""hi"""'],
		["line1\nline2", '"line1\nline2"'],
	])("escapes %j", (input, expected) => {
		expect(csvEscape(input)).toBe(expected);
	});
});

describe("rowsToCsv / parseCsvText", () => {
	it("writes the expected header", () => {
		expect(rowsToCsv([]).split("\n")[0]).toBe(
			"Txn ID,UTR,Date,Time,Amount,Sent to,CREDIT or DEBIT,Category",
		);
	});

	it("round-trips rows through CSV", () => {
		const rows = [
			makeRow({ txnId: "T1", sentTo: "A, B", category: "FOOD" }),
			makeRow({ txnId: "T2", type: "CREDIT", amount: "31.25", sentTo: 'say "hi"' }),
		];
		expect(parseCsvText(rowsToCsv(rows))).toEqual(rows);
	});

	it("returns [] for an empty or header-only file", () => {
		expect(parseCsvText("")).toEqual([]);
		expect(parseCsvText(rowsToCsv([]))).toEqual([]);
	});

	it("skips rows with fewer than 8 columns", () => {
		const csv = [rowsToCsv([]), "T1,U1,Jan 05, 2026,10:00 am"].join("\n");
		expect(parseCsvText(csv)).toEqual([]);
	});

	it("normalizes type: missing or unknown becomes DEBIT", () => {
		const csv = [
			rowsToCsv([]),
			"T1,U1,Jan 05 2026,10:00 am,1,X,credit,",
			"T2,U2,Jan 05 2026,10:00 am,1,X,garbage,",
		].join("\n");
		expect(parseCsvText(csv).map((r) => r.type)).toEqual(["CREDIT", "DEBIT"]);
	});

	it("ignores blank lines and preserves categories", () => {
		const csv = `${rowsToCsv([makeRow({ category: "TRAVEL" })])}\n\n`;
		expect(parseCsvText(csv)).toEqual([makeRow({ category: "TRAVEL" })]);
	});
});

describe("parseTransactionsFromCleanText", () => {
	it("parses a standard debit with decimal amount", () => {
		const rows = parseTransactionsFromCleanText(
			block("Sept 30, 2026", "DEBIT₹31.25Paid to SAHITYA SINGHAL", {
				txnId: "T2609302147329533828577",
				utr: "UTR No. 373289060394",
			}),
		);
		expect(rows).toEqual([
			{
				txnId: "T2609302147329533828577",
				utr: "373289060394",
				date: "Sept 30, 2026",
				time: "10:00 am",
				amount: "31.25",
				sentTo: "SAHITYA SINGHAL",
				type: "DEBIT",
				category: "",
			},
		]);
	});

	it("parses a credit and strips thousands separators", () => {
		const [row] = parseTransactionsFromCleanText(
			block("Oct 01, 2026", "CREDIT₹5,000Received from Maa", { time: "06:38 pm" }),
		);
		expect(row).toMatchObject({ type: "CREDIT", amount: "5000", sentTo: "Maa" });
	});

	it("parses 'Payment to' and 'Mobile recharged' descriptions", () => {
		const [payment] = parseTransactionsFromCleanText(
			block("Sept 11, 2026", "DEBIT₹69Payment to SPOTIFY"),
		);
		const [recharge] = parseTransactionsFromCleanText(
			block("Sept 27, 2026", "DEBIT₹303Mobile recharged 6370685137"),
		);
		expect(payment?.sentTo).toBe("SPOTIFY");
		expect(recharge?.sentTo).toBe("6370685137");
	});

	test.each([
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Sept",
		"Oct",
		"Nov",
		"Dec",
	])("accepts the %s month token (regression: 'Sept' was dropped)", (month) => {
		const date = `${month} 15, 2026`;
		const rows = parseTransactionsFromCleanText(block(date));
		expect(rows).toHaveLength(1);
		expect(rows[0]?.date).toBe(date);
	});

	test.each([
		["UTR No. 999", "999"],
		["UTR No.: 999", "999"],
		["UTR No. : 999", "999"],
		["UTR: 999", "999"],
	])("reads UTR %j -> %j (regression: UTR was always empty)", (utr, expected) => {
		const [row] = parseTransactionsFromCleanText(block("Jan 05, 2026", undefined, { utr }));
		expect(row?.utr).toBe(expected);
	});

	it("uses format 2 when the amount line follows the UTR", () => {
		const text = [
			"Jan 05, 2026",
			"10:00 am",
			"Transaction ID T9",
			"UTR No. 777",
			"DEBIT₹42Paid to Late Line",
		].join("\n");
		expect(parseTransactionsFromCleanText(text)[0]).toMatchObject({
			txnId: "T9",
			utr: "777",
			amount: "42",
			sentTo: "Late Line",
		});
	});

	it("skips an entry that has no amount line", () => {
		const text = ["Jan 05, 2026", "10:00 am", "Transaction ID T1", "UTR No. 123"].join("\n");
		expect(parseTransactionsFromCleanText(text)).toEqual([]);
	});

	it("skips an entry whose time lacks am/pm", () => {
		expect(parseTransactionsFromCleanText(block("Jan 05, 2026", undefined, { time: "10:00" }))).toEqual(
			[],
		);
	});

	it("ignores day-first / malformed dates", () => {
		expect(parseTransactionsFromCleanText(block("05 Jan, 2026"))).toEqual([]);
	});

	it("parses multiple consecutive entries without leaking text", () => {
		const text = [
			block("Sept 30, 2026", "DEBIT₹10Paid to Alpha", { txnId: "A" }),
			block("Sept 29, 2026", "CREDIT₹20Received from Beta", { txnId: "B" }),
		].join("\n");
		const rows = parseTransactionsFromCleanText(text);
		expect(rows.map((r) => [r.txnId, r.sentTo, r.type])).toEqual([
			["A", "Alpha", "DEBIT"],
			["B", "Beta", "CREDIT"],
		]);
	});
});

describe("removeNonTransactionInfo", () => {
	it("strips the statement range line for 4-letter months", () => {
		expect(removeNonTransactionInfo("01 Sept, 2026 - 01 Oct, 2026")).toBe("");
	});

	it("strips the column header row", () => {
		expect(removeNonTransactionInfo("DateTransaction DetailsTypeAmount")).toBe("");
	});

	test.each([
		"Transaction statement for 01 Sept, 2026 - 01 Oct, 2026",
		"Page 1 of 6",
		"This is a system generated statement.",
		"Disclaimer: blah",
		"https://support.phonepe.com/statement",
	])("strips boilerplate: %j", (line) => {
		expect(removeNonTransactionInfo(line)).toBe("");
	});

	it("keeps transaction data lines", () => {
		const text = "Sept 30, 2026\n09:47 pm\nDEBIT₹31.25Paid to SAHITYA SINGHAL";
		expect(removeNonTransactionInfo(text)).toBe(text);
	});
});

describe("PII", () => {
	it("drops a 'credited to'/'paid by' line and the line that follows", () => {
		const out = PII(["A", "credited to B", "C", "D", "Paid by E", "F", "G"].join("\n"));
		expect(out.split("\n")).toEqual(["A", "D", "G"]);
	});
});

describe("file-backed helpers", () => {
	it("round-trips rows through readCsvRows/writeCsvRows", async () => {
		const dir = await tempDir();
		const csvPath = join(dir, "data.csv");
		const rows = [makeRow({ txnId: "T1" }), makeRow({ txnId: "T2", type: "CREDIT" })];
		await writeCsvRows(csvPath, rows);
		expect(await readCsvRows(csvPath)).toEqual(rows);
	});

	it("updates only the matching categories and preserves the rest", async () => {
		const dir = await tempDir();
		const csvPath = join(dir, "data.csv");
		await writeCsvRows(csvPath, [
			makeRow({ txnId: "T1", category: "OLD" }),
			makeRow({ txnId: "T2", category: "KEEP" }),
		]);
		const updated = await updateCsvCategories(csvPath, { T1: "NEW" });
		expect(updated.map((r) => r.category)).toEqual(["NEW", "KEEP"]);
		expect((await readCsvRows(csvPath)).map((r) => r.category)).toEqual(["NEW", "KEEP"]);
	});
});

describe("createArtifactsFromPdf", () => {
	it("cleans text, writes artifacts, and returns parsed rows", async () => {
		const text = [
			"Transaction statement for 01 Sept, 2026 - 01 Oct, 2026",
			"DateTransaction DetailsTypeAmount",
			"Sept 30, 2026",
			"09:47 pm",
			"DEBIT₹31.25Paid to SAHITYA SINGHAL",
			"Transaction ID T2609302147329533828577",
			"UTR No. 373289060394",
		].join("\n");
		mockedPdfParse.mockResolvedValue({ text } as never);

		const dir = await tempDir();
		const pdfPath = join(dir, "in.pdf");
		await writeFile(pdfPath, "not a real pdf");
		const artifacts = await createArtifactsFromPdf(pdfPath, dir, "out.csv");

		expect(artifacts.csvPath).toBe(join(dir, "out.csv"));
		expect(await readFile(artifacts.parsedTextPath, "utf-8")).not.toContain("Transaction statement");
		expect(parseCsvText(await readFile(artifacts.csvPath, "utf-8"))).toEqual([
			{
				txnId: "T2609302147329533828577",
				utr: "373289060394",
				date: "Sept 30, 2026",
				time: "09:47 pm",
				amount: "31.25",
				sentTo: "SAHITYA SINGHAL",
				type: "DEBIT",
				category: "",
			},
		]);
	});
});
