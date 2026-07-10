import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { createArtifactsFromPdf } from "../lib/pdf/parse";
import { analyzeCsvFiles } from "../lib/pdf/analyse";

const DATA_DIR = join(process.cwd(), "data");
const OUTPUT_DIR = join(DATA_DIR, "test-folder");

async function main() {
	await mkdir(OUTPUT_DIR, { recursive: true });

	console.log("🔍 Parsing PDF...");
	const artifacts = await createArtifactsFromPdf(
		join(DATA_DIR, "pe.pdf"),
		OUTPUT_DIR,
		"pe.csv",
	);
	console.log(`   Parsed text: ${artifacts.parsedTextPath}`);
	console.log(`   CSV output: ${artifacts.csvPath}`);

	const rows = artifacts.csv.split("\n").filter(Boolean);
	console.log(`   Transactions found: ${rows.length - 1} (${rows.length} lines including header)`);

	console.log("\n📊 Running analysis...");
	const analysis = await analyzeCsvFiles(OUTPUT_DIR);
	const s = analysis.metrics.summary;

	console.log(`   Total transactions: ${s.totalCount}`);
	console.log(`   Credits: ${s.creditCount}, Debits: ${s.debitCount}`);
	console.log(`   Total Inflow:  ₹${s.totalInflow.toLocaleString("en-IN")}`);
	console.log(`   Total Outflow: ₹${s.totalOutflow.toLocaleString("en-IN")}`);
	console.log(`   Net Cashflow:  ₹${s.netCashflow.toLocaleString("en-IN")}`);
	console.log(`   Avg Credit: ₹${s.avgCredit.toLocaleString("en-IN")}, Avg Debit: ₹${s.avgDebit.toLocaleString("en-IN")}`);
	console.log(`   Largest Credit: ₹${s.largestCredit.toLocaleString("en-IN")}, Largest Debit: ₹${s.largestDebit.toLocaleString("en-IN")}`);
	console.log(`   Daily Trend points: ${analysis.metrics.dailyTrend.length}`);
	console.log(`   Weekly Trend points: ${analysis.metrics.weeklyTrend.length}`);
	console.log(`   Top recipients by spend: ${analysis.metrics.topRecipientsBySpend.length}`);
	console.log(`   Top credit sources: ${analysis.metrics.topCreditSources.length}`);
	console.log(`   Outliers: ${analysis.metrics.outliers.length}`);
	console.log(`   Recurring payments: ${analysis.metrics.recurringPayments.length}`);
	console.log(`   Category metrics: ${analysis.metrics.categoryMetrics.length}`);
	console.log(`   Data quality issues: ${JSON.stringify(analysis.metrics.dataQuality)}`);

	console.log("\n📋 Category breakdown:");
	for (const cat of analysis.metrics.categoryMetrics) {
		console.log(`   ${cat.category}: ₹${cat.amount.toLocaleString("en-IN")} (${cat.count} txns, ${cat.share}%)`);
	}

	console.log("\n📋 Top 5 recipients by spend:");
	for (const r of analysis.metrics.topRecipientsBySpend.slice(0, 5)) {
		console.log(`   ${r.name}: ₹${r.amount.toLocaleString("en-IN")} (${r.count} txns, ${r.share}%)`);
	}

	console.log("\n📋 Top 5 credit sources:");
	for (const r of analysis.metrics.topCreditSources.slice(0, 5)) {
		console.log(`   ${r.name}: ₹${r.amount.toLocaleString("en-IN")} (${r.count} txns, ${r.share}%)`);
	}

	console.log(`\n✅ Analysis complete! Generated at: ${analysis.meta.generatedAt}`);
}

main().catch((err) => {
	console.error("❌ Verification failed:", err);
	process.exit(1);
});
