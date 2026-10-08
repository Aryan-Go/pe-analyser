import type { StatementSource, TxnRow } from "../types";
import type { StatementProvider } from "./types";
import { phonePeProvider } from "./phonepe";
import { gPayProvider } from "./gpay";

// Order matters for detection: Google Pay's markers are the more specific ones, so it is checked first.
export const STATEMENT_PROVIDERS: StatementProvider[] = [gPayProvider, phonePeProvider];

export type ParsedStatement = {
	source: StatementSource;
	cleanText: string;
	rows: TxnRow[];
};

export function getProvider(source: StatementSource): StatementProvider {
	const provider = STATEMENT_PROVIDERS.find((candidate) => candidate.id === source);
	if (!provider) {
		throw new Error(`Unknown statement source: ${source}`);
	}
	return provider;
}

export function detectSource(rawText: string): StatementSource | null {
	for (const provider of STATEMENT_PROVIDERS) {
		if (provider.detect(rawText)) return provider.id;
	}
	return null;
}

function runProvider(provider: StatementProvider, rawText: string): ParsedStatement {
	const cleanText = provider.clean(rawText);
	return { source: provider.id, cleanText, rows: provider.parse(cleanText) };
}

export function parseStatementFromText(rawText: string, requested?: StatementSource | null): ParsedStatement {
	if (requested) {
		return runProvider(getProvider(requested), rawText);
	}

	const detected = detectSource(rawText);
	if (detected) {
		return runProvider(getProvider(detected), rawText);
	}

	// Nothing matched a known header — fall back to whichever provider finds the most transactions.
	let best: ParsedStatement = { source: "phonepe", cleanText: rawText, rows: [] };
	for (const provider of STATEMENT_PROVIDERS) {
		const parsed = runProvider(provider, rawText);
		if (parsed.rows.length > best.rows.length) best = parsed;
	}
	return best;
}

export { phonePeProvider, gPayProvider };
export type { StatementProvider };
