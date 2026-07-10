import type { TxnRow, TxnType } from "./parse";
export type { TxnRow };

// ── Types (extracted from analyse.ts, no Node deps) ──

export type CsvTxn = {
	txnId: string;
	utr: string;
	date: string;
	time: string;
	amount: number;
	sentTo: string;
	type: TxnType;
	category: string;
	timestamp: Date;
};

export type SummaryMetrics = {
	totalInflow: number;
	totalOutflow: number;
	netCashflow: number;
	totalCount: number;
	creditCount: number;
	debitCount: number;
	avgCredit: number;
	avgDebit: number;
	medianCredit: number;
	medianDebit: number;
	largestCredit: number;
	largestDebit: number;
	averageDailyDebit: number;
	projectedMonthlyDebit: number;
	dependencyRatioTop3CreditSources: number;
	concentrationRiskTop5DebitRecipients: number;
};

export type TrendPoint = {
	period: string;
	inflow: number;
	outflow: number;
	net: number;
	count: number;
};

export type PartyAggregate = {
	name: string;
	amount: number;
	count: number;
	share: number;
};

export type CategoryAggregate = {
	category: string;
	amount: number;
	count: number;
	share: number;
	creditAmount: number;
	debitAmount: number;
	averageAmount: number;
};

export type Outlier = {
	txnId: string;
	date: string;
	time: string;
	amount: number;
	sentTo: string;
	type: TxnType;
};

export type RecurringPayment = {
	name: string;
	amount: number;
	count: number;
	approxIntervalDays: number;
};

export type DataQuality = {
	totalRows: number;
	missingTxnIdCount: number;
	missingUtrCount: number;
	missingSentToCount: number;
	invalidAmountCount: number;
	duplicateTxnIds: string[];
	duplicateUtrs: string[];
	rowsWithInvalidDateTime: number;
};

export type AnalysisMetrics = {
	summary: SummaryMetrics;
	dailyTrend: TrendPoint[];
	weeklyTrend: TrendPoint[];
	topRecipientsBySpend: PartyAggregate[];
	topRecipientsByFrequency: PartyAggregate[];
	topCreditSources: PartyAggregate[];
	dayOfWeekSpend: { day: string; amount: number; count: number }[];
	timeOfDaySpend: { bucket: string; amount: number; count: number }[];
	outliers: Outlier[];
	recurringPayments: RecurringPayment[];
	bidirectionalCounterparties: string[];
	categoryMetrics: CategoryAggregate[];
	dataQuality: DataQuality;
};

export type WebAppPayload = {
	meta: {
		generatedAt: string;
		filesProcessed: string[];
		transactionCount: number;
	};
	metrics: AnalysisMetrics;
	ui: {
		summaryCards: Array<{ key: string; label: string; value: number }>;
		charts: {
			dailyCashflow: TrendPoint[];
			weeklyCashflow: TrendPoint[];
			dayOfWeekSpend: { day: string; amount: number; count: number }[];
			timeOfDaySpend: { bucket: string; amount: number; count: number }[];
			topRecipientsBySpend: PartyAggregate[];
			topCreditSources: PartyAggregate[];
			categoryMetrics: CategoryAggregate[];
		};
		tables: {
			outliers: Outlier[];
			recurringPayments: RecurringPayment[];
			dataQuality: DataQuality;
		};
	};
};

// ── Helpers ──

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

function parseDateTime(date: string, time: string): Date | null {
	const parsed = new Date(`${date} ${time}`);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 0) return round2(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
	return round2(sorted[mid] ?? 0);
}

function safeShare(part: number, total: number): number {
	return total <= 0 ? 0 : round2((part / total) * 100);
}

function getIsoWeekKey(date: Date): string {
	const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = utcDate.getUTCDay() || 7;
	utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
	const weekNo = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
	return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function timeBucket(hours: number): string {
	if (hours >= 5 && hours < 12) return "Morning";
	if (hours >= 12 && hours < 17) return "Afternoon";
	if (hours >= 17 && hours < 22) return "Evening";
	return "Night";
}

function quantile(sortedValues: number[], q: number): number {
	if (sortedValues.length === 0) return 0;
	const pos = (sortedValues.length - 1) * q;
	const base = Math.floor(pos);
	const rest = pos - base;
	const baseValue = sortedValues[base] ?? 0;
	const nextValue = sortedValues[base + 1] ?? baseValue;
	return baseValue + rest * (nextValue - baseValue);
}

function csvRowToCsvTxn(row: TxnRow): CsvTxn | null {
	const timestamp = parseDateTime(row.date, row.time);
	if (!timestamp) return null;
	return {
		txnId: row.txnId,
		utr: row.utr,
		date: row.date,
		time: row.time,
		amount: Number.parseFloat(row.amount),
		sentTo: row.sentTo,
		type: row.type,
		category: row.category,
		timestamp,
	};
}

// ── Analyser class ──

export class Analyser {
	private transactions: CsvTxn[];

	constructor(transactions: CsvTxn[]) {
		this.transactions = [...transactions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
	}

	private byType(type: TxnType): CsvTxn[] {
		return this.transactions.filter((txn) => txn.type === type);
	}

	private sumAmount(rows: CsvTxn[]): number {
		return round2(rows.reduce((sum, row) => sum + row.amount, 0));
	}

	private aggregateByName(rows: CsvTxn[]): PartyAggregate[] {
		const map = new Map<string, { amount: number; count: number }>();
		for (const row of rows) {
			const key = row.sentTo || "Unknown";
			const prev = map.get(key) ?? { amount: 0, count: 0 };
			map.set(key, { amount: prev.amount + row.amount, count: prev.count + 1 });
		}
		const total = this.sumAmount(rows);
		return [...map.entries()]
			.map(([name, stats]) => ({ name, amount: round2(stats.amount), count: stats.count, share: safeShare(stats.amount, total) }))
			.sort((a, b) => b.amount - a.amount);
	}

	getCategoryMetrics(): CategoryAggregate[] {
		const map = new Map<string, { amount: number; count: number; creditAmount: number; debitAmount: number }>();
		for (const row of this.transactions) {
			const category = (row.category || "Uncategorized").trim() || "Uncategorized";
			const prev = map.get(category) ?? { amount: 0, count: 0, creditAmount: 0, debitAmount: 0 };
			prev.amount += row.amount;
			prev.count += 1;
			if (row.type === "CREDIT") prev.creditAmount += row.amount;
			else prev.debitAmount += row.amount;
			map.set(category, prev);
		}
		const total = this.sumAmount(this.transactions);
		return [...map.entries()]
			.map(([category, stats]) => ({
				category,
				amount: round2(stats.amount),
				count: stats.count,
				share: safeShare(stats.amount, total),
				creditAmount: round2(stats.creditAmount),
				debitAmount: round2(stats.debitAmount),
				averageAmount: round2(stats.amount / (stats.count || 1)),
			}))
			.sort((a, b) => b.amount - a.amount);
	}

	getSummary(): SummaryMetrics {
		const credits = this.byType("CREDIT");
		const debits = this.byType("DEBIT");
		const creditAmounts = credits.map((tx) => tx.amount);
		const debitAmounts = debits.map((tx) => tx.amount);

		const totalInflow = this.sumAmount(credits);
		const totalOutflow = this.sumAmount(debits);
		const uniqueDebitDays = new Set(debits.map((tx) => tx.date)).size || 1;
		const avgDailyDebit = totalOutflow / uniqueDebitDays;

		const topCreditSources = this.aggregateByName(credits).slice(0, 3);
		const topCreditAmount = round2(topCreditSources.reduce((sum, item) => sum + item.amount, 0));
		const topDebitRecipients = this.aggregateByName(debits).slice(0, 5);
		const topDebitAmount = round2(topDebitRecipients.reduce((sum, item) => sum + item.amount, 0));

		return {
			totalInflow, totalOutflow,
			netCashflow: round2(totalInflow - totalOutflow),
			totalCount: this.transactions.length,
			creditCount: credits.length,
			debitCount: debits.length,
			avgCredit: round2(creditAmounts.reduce((a, b) => a + b, 0) / (creditAmounts.length || 1)),
			avgDebit: round2(debitAmounts.reduce((a, b) => a + b, 0) / (debitAmounts.length || 1)),
			medianCredit: median(creditAmounts),
			medianDebit: median(debitAmounts),
			largestCredit: round2(Math.max(0, ...creditAmounts)),
			largestDebit: round2(Math.max(0, ...debitAmounts)),
			averageDailyDebit: round2(avgDailyDebit),
			projectedMonthlyDebit: round2(avgDailyDebit * 30),
			dependencyRatioTop3CreditSources: safeShare(topCreditAmount, totalInflow),
			concentrationRiskTop5DebitRecipients: safeShare(topDebitAmount, totalOutflow),
		};
	}

	getDailyTrend(): TrendPoint[] {
		const dayMap = new Map<string, TrendPoint>();
		for (const tx of this.transactions) {
			const key = tx.date;
			const point = dayMap.get(key) ?? { period: key, inflow: 0, outflow: 0, net: 0, count: 0 };
			if (tx.type === "CREDIT") point.inflow += tx.amount;
			else point.outflow += tx.amount;
			point.net = point.inflow - point.outflow;
			point.count += 1;
			dayMap.set(key, point);
		}
		return [...dayMap.values()].map((p) => ({ ...p, inflow: round2(p.inflow), outflow: round2(p.outflow), net: round2(p.net) }));
	}

	getWeeklyTrend(): TrendPoint[] {
		const weekMap = new Map<string, TrendPoint>();
		for (const tx of this.transactions) {
			const key = getIsoWeekKey(tx.timestamp);
			const point = weekMap.get(key) ?? { period: key, inflow: 0, outflow: 0, net: 0, count: 0 };
			if (tx.type === "CREDIT") point.inflow += tx.amount;
			else point.outflow += tx.amount;
			point.net = point.inflow - point.outflow;
			point.count += 1;
			weekMap.set(key, point);
		}
		return [...weekMap.values()]
			.sort((a, b) => a.period.localeCompare(b.period))
			.map((p) => ({ ...p, inflow: round2(p.inflow), outflow: round2(p.outflow), net: round2(p.net) }));
	}

	getTopRecipientsBySpend(limit = 10): PartyAggregate[] {
		return this.aggregateByName(this.byType("DEBIT")).slice(0, limit);
	}

	getTopRecipientsByFrequency(limit = 10): PartyAggregate[] {
		return this.aggregateByName(this.byType("DEBIT")).sort((a, b) => b.count - a.count || b.amount - a.amount).slice(0, limit);
	}

	getTopCreditSources(limit = 10): PartyAggregate[] {
		return this.aggregateByName(this.byType("CREDIT")).slice(0, limit);
	}

	getDayOfWeekSpend(): { day: string; amount: number; count: number }[] {
		const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		const map = new Map<string, { day: string; amount: number; count: number }>();
		for (const tx of this.byType("DEBIT")) {
			const day = labels[tx.timestamp.getDay()] ?? "Unknown";
			const prev = map.get(day) ?? { day, amount: 0, count: 0 };
			prev.amount += tx.amount;
			prev.count += 1;
			map.set(day, prev);
		}
		return labels.map((day) => map.get(day) ?? { day, amount: 0, count: 0 }).map((item) => ({ ...item, amount: round2(item.amount) }));
	}

	getTimeOfDaySpend(): { bucket: string; amount: number; count: number }[] {
		const buckets = ["Morning", "Afternoon", "Evening", "Night"];
		const map = new Map<string, { bucket: string; amount: number; count: number }>();
		for (const tx of this.byType("DEBIT")) {
			const bucket = timeBucket(tx.timestamp.getHours());
			const prev = map.get(bucket) ?? { bucket, amount: 0, count: 0 };
			prev.amount += tx.amount;
			prev.count += 1;
			map.set(bucket, prev);
		}
		return buckets.map((bucket) => map.get(bucket) ?? { bucket, amount: 0, count: 0 }).map((item) => ({ ...item, amount: round2(item.amount) }));
	}

	getOutliers(): Outlier[] {
		const amounts = this.transactions.map((tx) => tx.amount).sort((a, b) => a - b);
		if (amounts.length < 4) return [];
		const q1 = quantile(amounts, 0.25);
		const q3 = quantile(amounts, 0.75);
		const iqr = q3 - q1;
		const upper = q3 + 1.5 * iqr;
		return this.transactions.filter((tx) => tx.amount > upper).map((tx) => ({ txnId: tx.txnId, date: tx.date, time: tx.time, amount: tx.amount, sentTo: tx.sentTo, type: tx.type }));
	}

	getRecurringPayments(): RecurringPayment[] {
		const debits = this.byType("DEBIT");
		const map = new Map<string, CsvTxn[]>();
		for (const tx of debits) {
			const key = `${tx.sentTo}__${round2(tx.amount)}`;
			const list = map.get(key) ?? [];
			list.push(tx);
			map.set(key, list);
		}
		const recurring: RecurringPayment[] = [];
		for (const [key, rows] of map.entries()) {
			if (rows.length < 2) continue;
			rows.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
			let dayDiffSum = 0;
			for (let i = 1; i < rows.length; i++) {
				const current = rows[i];
				const previous = rows[i - 1];
				if (!current || !previous) continue;
				dayDiffSum += (current.timestamp.getTime() - previous.timestamp.getTime()) / 86400000;
			}
			const [name, amountRaw] = key.split("__");
			recurring.push({ name: name ?? "Unknown", amount: Number.parseFloat(amountRaw ?? "0"), count: rows.length, approxIntervalDays: round2(dayDiffSum / (rows.length - 1)) });
		}
		return recurring.sort((a, b) => b.count - a.count || b.amount - a.amount);
	}

	getBidirectionalCounterparties(): string[] {
		const credits = new Set(this.byType("CREDIT").map((tx) => tx.sentTo));
		const debits = new Set(this.byType("DEBIT").map((tx) => tx.sentTo));
		const both: string[] = [];
		for (const name of credits) if (debits.has(name)) both.push(name);
		return both.sort((a, b) => a.localeCompare(b));
	}

	getDataQuality(): DataQuality {
		const txnIdCount = new Map<string, number>();
		const utrCount = new Map<string, number>();
		let missingTxnIdCount = 0;
		let missingUtrCount = 0;
		let missingSentToCount = 0;
		let invalidAmountCount = 0;
		let rowsWithInvalidDateTime = 0;

		for (const tx of this.transactions) {
			if (!tx.txnId) missingTxnIdCount += 1;
			else txnIdCount.set(tx.txnId, (txnIdCount.get(tx.txnId) ?? 0) + 1);
			if (!tx.utr) missingUtrCount += 1;
			else utrCount.set(tx.utr, (utrCount.get(tx.utr) ?? 0) + 1);
			if (!tx.sentTo) missingSentToCount += 1;
			if (!Number.isFinite(tx.amount)) invalidAmountCount += 1;
			if (Number.isNaN(tx.timestamp.getTime())) rowsWithInvalidDateTime += 1;
		}

		const duplicateTxnIds = [...txnIdCount.entries()].filter(([, count]) => count > 1).map(([value]) => value).sort((a, b) => a.localeCompare(b));
		const duplicateUtrs = [...utrCount.entries()].filter(([, count]) => count > 1).map(([value]) => value).sort((a, b) => a.localeCompare(b));

		return { totalRows: this.transactions.length, missingTxnIdCount, missingUtrCount, missingSentToCount, invalidAmountCount, duplicateTxnIds, duplicateUtrs, rowsWithInvalidDateTime };
	}

	runAllMetrics(): AnalysisMetrics {
		return {
			summary: this.getSummary(),
			dailyTrend: this.getDailyTrend(),
			weeklyTrend: this.getWeeklyTrend(),
			topRecipientsBySpend: this.getTopRecipientsBySpend(),
			topRecipientsByFrequency: this.getTopRecipientsByFrequency(),
			topCreditSources: this.getTopCreditSources(),
			dayOfWeekSpend: this.getDayOfWeekSpend(),
			timeOfDaySpend: this.getTimeOfDaySpend(),
			outliers: this.getOutliers(),
			recurringPayments: this.getRecurringPayments(),
			bidirectionalCounterparties: this.getBidirectionalCounterparties(),
			categoryMetrics: this.getCategoryMetrics(),
			dataQuality: this.getDataQuality(),
		};
	}
}

// ── Pure functions for client-side use ──

export function runAnalysis(rows: TxnRow[]): WebAppPayload {
	const transactions = rows.map(csvRowToCsvTxn).filter((txn): txn is CsvTxn => txn !== null);
	const analyser = new Analyser(transactions);
	const metrics = analyser.runAllMetrics();
	return buildWebAppPayload(metrics, transactions.length);
}

export function buildWebAppPayload(metrics: AnalysisMetrics, transactionCount: number): WebAppPayload {
	return {
		meta: { generatedAt: new Date().toISOString(), filesProcessed: [], transactionCount },
		metrics,
		ui: {
			summaryCards: [
				{ key: "totalInflow", label: "Total Inflow", value: metrics.summary.totalInflow },
				{ key: "totalOutflow", label: "Total Outflow", value: metrics.summary.totalOutflow },
				{ key: "netCashflow", label: "Net Cashflow", value: metrics.summary.netCashflow },
				{ key: "txnCount", label: "Transactions", value: metrics.summary.totalCount },
			],
			charts: {
				dailyCashflow: metrics.dailyTrend,
				weeklyCashflow: metrics.weeklyTrend,
				dayOfWeekSpend: metrics.dayOfWeekSpend,
				timeOfDaySpend: metrics.timeOfDaySpend,
				topRecipientsBySpend: metrics.topRecipientsBySpend,
				topCreditSources: metrics.topCreditSources,
				categoryMetrics: metrics.categoryMetrics,
			},
			tables: { outliers: metrics.outliers, recurringPayments: metrics.recurringPayments, dataQuality: metrics.dataQuality },
		},
	};
}
