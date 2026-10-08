import type { TxnRow, TxnType } from "../types";
import type { StatementProvider } from "./types";

// Google Pay statement blocks look like (field order can vary between PDF extractors):
//   "29 Nov, 2025  04:12 PM  Paid to MAGANTI NAGESH GOUD  UPI Transaction ID: 569827633862  Paid by Bandhan Bank 9849  ₹102"
// pdf-parse (unlike pdf.js) often drops the spaces inside a block, yielding e.g.
//   "01Sep,2026 01:18AM PaidtoVikas UPITransactionID:661084351618 PaidbyPunjabNationalBank5947 ₹65"
// so every keyword regex below allows optional whitespace between words. Instead of trusting a
// fixed field order we slice the text between consecutive amounts and pull each field out of its own window.
const AMOUNT_REGEX = /(?:₹|rs\.?\s*|inr\s*)([\d,]+(?:\.\d+)?)/gi;
const DIRECTION_REGEX = /(received\s*from|paid\s*to)\s*(.*?)(?=\s*(?:upi\s*transaction\s*id|paid\s*by)|₹|$)/i;
const TXN_ID_REGEX = /upi\s*transaction\s*id:?\s*([A-Za-z0-9]+)/i;
const DATE_REGEX = /(\d{1,2})\s?([A-Za-z]{3,9}),?\s?(\d{4})/g;
const TIME_REGEX = /(\d{1,2}:\d{2}\s?[ap]m)/gi;

export function cleanGPayText(text: string): string {
	const lines = text.split(/\r?\n/);
	const cleaned: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();

		if (/^page\s*\d+\s*of\s*\d+$/i.test(trimmed)) {
			continue;
		}

		if (/^note:\s*this\s*statement\b/i.test(trimmed)) {
			continue;
		}

		if (/^this\s*statement\s*reflects\b/i.test(trimmed)) {
			continue;
		}

		if (trimmed.toLowerCase().includes("selftransferpaymentsarenotincluded")) {
			continue;
		}

		if (trimmed.toLowerCase().includes("self transfer payments are not included")) {
			continue;
		}

		cleaned.push(line);
	}

	return cleaned.join("\n");
}

function lastMatch(text: string, regex: RegExp): RegExpMatchArray | null {
	const matches = [...text.matchAll(regex)];
	return matches.at(-1) ?? null;
}

function normalizeMonth(token: string): string {
	const trimmed = token.trim();
	return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// pdf-parse can drop the space before am/pm ("01:18AM"). JS Date needs it ("01:18 am").
function normalizeTime(token: string): string {
	return token
		.replace(/\s+/g, " ")
		.replace(/(\d)\s*([ap]m)\b/i, "$1 $2")
		.toLowerCase()
		.trim();
}

export function parseGPayTransactions(cleanText: string): TxnRow[] {
	const flat = cleanText.replace(/\s+/g, " ").trim();
	if (!flat) return [];

	const rows: TxnRow[] = [];
	let cursor = 0;

	AMOUNT_REGEX.lastIndex = 0;
	let amountMatch: RegExpExecArray | null;
	while ((amountMatch = AMOUNT_REGEX.exec(flat)) !== null) {
		const amount = (amountMatch[1] ?? "").replace(/,/g, "");
		const windowStart = cursor;
		const windowEnd = amountMatch.index;
		cursor = amountMatch.index + amountMatch[0].length;

		const window = flat.slice(windowStart, windowEnd);

		const directionMatch = window.match(DIRECTION_REGEX);
		if (!directionMatch) continue;

		const direction = (directionMatch[1] ?? "").toLowerCase();
		const sentTo = (directionMatch[2] ?? "").replace(/\s+/g, " ").trim();
		if (!sentTo) continue;

		// Prefer the date/time closest to the amount (the header on page 1 may hold another date range).
		const dateMatch = lastMatch(window, DATE_REGEX);
		const timeMatch = lastMatch(window, TIME_REGEX);
		if (!dateMatch || !timeMatch) continue;

		const day = Number.parseInt(dateMatch[1] ?? "", 10);
		if (!Number.isFinite(day)) continue;

		const txnIdMatch = window.match(TXN_ID_REGEX);

		rows.push({
			txnId: txnIdMatch?.[1] ?? "",
			utr: "",
			date: `${day} ${normalizeMonth(dateMatch[2] ?? "")}, ${dateMatch[3]}`,
			time: normalizeTime(timeMatch[1] ?? ""),
			amount,
			sentTo,
			type: (/^received/i.test(direction) ? "CREDIT" : "DEBIT") as TxnType,
			category: "",
		});
	}

	return rows;
}

export const gPayProvider: StatementProvider = {
	id: "gpay",
	label: "Google Pay",
	detect: (rawText) => /upi\s*transaction\s*id|google\s*pay|gpay/i.test(rawText),
	clean: cleanGPayText,
	parse: parseGPayTransactions,
};
