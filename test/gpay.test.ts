import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("pdf-parse", () => ({ default: vi.fn() }));
import pdfParse from "pdf-parse";

import { createArtifactsFromPdf, parseCsvText } from "../lib/pdf/parse";
import { detectSource, parseStatementFromText } from "../lib/pdf/providers";
import { cleanGPayText, parseGPayTransactions } from "../lib/pdf/providers/gpay";
import { phonePeProvider } from "../lib/pdf/providers/phonepe";

const mockedPdfParse = vi.mocked(pdfParse);

const GPAY_HEADER = [
	"Google Pay",
	"Transaction statement",
	"01 Oct, 2025 - 31 Oct, 2025",
].join("\n");

describe("parseGPayTransactions", () => {
	it("parses a debit and maps 'Paid to' to DEBIT", () => {
		const [row] = parseGPayTransactions(
			"29 Nov, 2025 04:12 PM Paid to MAGANTI NAGESH GOUD UPI Transaction ID: 569827633862 Paid by Bandhan Bank 9849 ₹102",
		);
		expect(row).toEqual({
			txnId: "569827633862",
			utr: "",
			date: "29 Nov, 2025",
			time: "04:12 pm",
			amount: "102",
			sentTo: "MAGANTI NAGESH GOUD",
			type: "DEBIT",
			category: "",
		});
	});

	it("parses a credit, strips thousands separators, and maps 'Received from' to CREDIT", () => {
		const [row] = parseGPayTransactions(
			"28 Oct, 2025 11:06 AM Received from RAHUL SHARMA UPI Transaction ID: 530177252391 Paid by Union Bank of India 4587 ₹5,000",
		);
		expect(row).toMatchObject({
			txnId: "530177252391",
			date: "28 Oct, 2025",
			time: "11:06 am",
			amount: "5000",
			sentTo: "RAHUL SHARMA",
			type: "CREDIT",
		});
	});

	it("is tolerant to swapped date/time order", () => {
		const [row] = parseGPayTransactions(
			"04:12 PM 29 Nov, 2025 Paid to ZO Services UPI Transaction ID: 530100985135 Paid by State Bank of India 0343 ₹49",
		);
		expect(row).toMatchObject({
			date: "29 Nov, 2025",
			time: "04:12 pm",
			amount: "49",
			sentTo: "ZO Services",
			type: "DEBIT",
		});
	});

	it("is tolerant to a bank line placed before the payee", () => {
		const [row] = parseGPayTransactions(
			"UPI Transaction ID: 530182981771 Paid by Union Bank of India 4587 28 Oct, 2025 05:23 PM Paid to LAXMANVITHAI PETROLEUM ₹100",
		);
		expect(row).toMatchObject({
			txnId: "530182981771",
			date: "28 Oct, 2025",
			time: "05:23 pm",
			amount: "100",
			sentTo: "LAXMANVITHAI PETROLEUM",
		});
	});

	it("parses multiple consecutive entries without leaking text", () => {
		const text = [
			"29 Nov, 2025 04:12 PM Paid to MAGANTI NAGESH GOUD UPI Transaction ID: 111 Paid by Bandhan Bank 9849 ₹102",
			"28 Oct, 2025 11:06 AM Received from RAHUL SHARMA UPI Transaction ID: 222 Paid by Union Bank of India 4587 ₹5,000",
		].join("\n");
		const rows = parseGPayTransactions(text);
		expect(rows.map((r) => [r.txnId, r.sentTo, r.type, r.amount])).toEqual([
			["111", "MAGANTI NAGESH GOUD", "DEBIT", "102"],
			["222", "RAHUL SHARMA", "CREDIT", "5000"],
		]);
	});

	it("skips amount-like fragments that have no transaction context", () => {
		expect(parseGPayTransactions("Total money sent ₹88,107.90")).toEqual([]);
	});

	it("keeps decimal amounts", () => {
		const [row] = parseGPayTransactions(
			"09 Sep, 2025 09:54 PM Paid to ZO Services UPI Transaction ID: 530100985135 Paid by State Bank of India 0343 ₹1,234.56",
		);
		expect(row?.amount).toBe("1234.56");
	});

	it("handles an alphanumeric Google Pay transaction id", () => {
		const [row] = parseGPayTransactions(
			"04 Nov, 2025 01:00 PM Paid to The Gadget Shop UPI Transaction ID: CICAgMC2qrWXLA Paid by HDFC Bank 1122 ₹2,249",
		);
		expect(row).toMatchObject({ txnId: "CICAgMC2qrWXLA", amount: "2249" });
	});

	it("parses the space-stripped pdf-parse layout (real Google Pay PDF)", () => {
		const text = [
			"Date&timeTransactiondetailsAmount",
			"01Sep,2026",
			"01:18AM",
			"PaidtoVikas",
			"UPITransactionID:661084351618",
			"PaidbyPunjabNationalBank5947",
			"₹65",
			"06Sep,2026",
			"01:34PM",
			"ReceivedfromAnmolYadav",
			"UPITransactionID:661592224630",
			"PaidtoPunjabNationalBank5947",
			"₹120",
		].join("\n");
		const rows = parseGPayTransactions(text);
		expect(rows).toEqual([
			{
				txnId: "661084351618",
				utr: "",
				date: "1 Sep, 2026",
				time: "01:18 am",
				amount: "65",
				sentTo: "Vikas",
				type: "DEBIT",
				category: "",
			},
			{
				txnId: "661592224630",
				utr: "",
				date: "6 Sep, 2026",
				time: "01:34 pm",
				amount: "120",
				sentTo: "AnmolYadav",
				type: "CREDIT",
				category: "",
			},
		]);
	});
});

describe("cleanGPayText", () => {
	it("strips the self-transfer note and page markers", () => {
		const raw = [
			"Google Pay",
			"Page 1 of 6",
			"Note: This statement reflects payments made by you on the Google Pay app.",
			"29 Nov, 2025 04:12 PM Paid to X UPI Transaction ID: 1 Paid by Bank ₹10",
		].join("\n");
		const cleaned = cleanGPayText(raw);
		expect(cleaned).not.toMatch(/page 1 of 6/i);
		expect(cleaned).not.toMatch(/note:/i);
		expect(cleaned).toContain("Paid to X");
	});
});

describe("detectSource", () => {
	it("detects Google Pay from 'UPI Transaction ID'", () => {
		expect(detectSource(`${GPAY_HEADER}\n29 Nov, 2025 04:12 PM Paid to X UPI Transaction ID: 1 Paid by Bank ₹10`)).toBe(
			"gpay",
		);
	});

	it("detects Google Pay from the 'Google Pay' brand", () => {
		expect(detectSource("Google Pay\nSome content")).toBe("gpay");
	});

	it("detects PhonePe from the brand / support url", () => {
		expect(detectSource("https://support.phonepe.com/statement")).toBe("phonepe");
	});

	it("returns null when neither is present", () => {
		expect(detectSource("just some random text")).toBeNull();
	});
});

describe("parseStatementFromText", () => {
	it("routes a Google Pay statement to the gpay provider", () => {
		const text = `${GPAY_HEADER}\n29 Nov, 2025 04:12 PM Paid to MAGANTI NAGESH GOUD UPI Transaction ID: 569827633862 Paid by Bandhan Bank 9849 ₹102`;
		const parsed = parseStatementFromText(text);
		expect(parsed.source).toBe("gpay");
		expect(parsed.rows).toHaveLength(1);
	});

	it("still routes a PhonePe statement to the phonepe provider", () => {
		const text = [
			"Transaction statement for 01 Sept, 2026 - 01 Oct, 2026",
			"Sept 30, 2026",
			"09:47 pm",
			"DEBIT₹31.25Paid to SAHITYA SINGHAL",
			"Transaction ID T2609302147329533828577",
			"UTR No. 373289060394",
		].join("\n");
		const parsed = parseStatementFromText(text);
		expect(parsed.source).toBe("phonepe");
		expect(parsed.rows).toHaveLength(1);
	});

	it("honours an explicit source override", () => {
		const parsed = parseStatementFromText("29 Nov, 2025 04:12 PM Paid to X UPI Transaction ID: 1 Paid by Bank ₹10", "phonepe");
		expect(parsed.source).toBe("phonepe");
	});

	it("falls back to the provider that finds the most rows", () => {
		const parsed = parseStatementFromText(
			"29 Nov, 2025 04:12 PM Paid to X UPI Transaction ID: 1 Paid by Bank ₹10",
		);
		expect(parsed.rows.length).toBeGreaterThan(0);
	});

	it("gpay provider does not match a phonepe statement", () => {
		expect(phonePeProvider.detect("support.phonepe.com")).toBe(true);
	});
});

describe("createArtifactsFromPdf (Google Pay)", () => {
	const tempDirs: string[] = [];
	async function tempDir(): Promise<string> {
		const dir = await mkdtemp(join(tmpdir(), "gpay-parse-"));
		tempDirs.push(dir);
		return dir;
	}

	afterEach(async () => {
		await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
	});

	it("detects gpay, cleans text, and writes the CSV", async () => {
		const text = [
			"Google Pay",
			"01 Oct, 2025 - 31 Oct, 2025",
			"29 Nov, 2025 04:12 PM Paid to MAGANTI NAGESH GOUD UPI Transaction ID: 569827633862 Paid by Bandhan Bank 9849 ₹102",
			"Note: This statement reflects payments made by you on the Google Pay app. Self transfer payments are not included.",
		].join("\n");
		mockedPdfParse.mockResolvedValue({ text } as never);

		const dir = await tempDir();
		const pdfPath = join(dir, "in.pdf");
		await writeFile(pdfPath, "not a real pdf");
		const artifacts = await createArtifactsFromPdf(pdfPath, dir, "out.csv");

		expect(artifacts.source).toBe("gpay");
		expect(artifacts.rowCount).toBe(1);
		expect(await readFile(artifacts.parsedTextPath, "utf-8")).not.toMatch(/note:/i);
		expect(parseCsvText(await readFile(artifacts.csvPath, "utf-8"))).toEqual([
			{
				txnId: "569827633862",
				utr: "",
				date: "29 Nov, 2025",
				time: "04:12 pm",
				amount: "102",
				sentTo: "MAGANTI NAGESH GOUD",
				type: "DEBIT",
				category: "",
			},
		]);
	});
});
