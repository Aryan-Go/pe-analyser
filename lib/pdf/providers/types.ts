import type { StatementSource, TxnRow } from "../types";

export type StatementProvider = {
	id: StatementSource;
	label: string;
	detect: (rawText: string) => boolean;
	clean: (rawText: string) => string;
	parse: (cleanText: string) => TxnRow[];
};
