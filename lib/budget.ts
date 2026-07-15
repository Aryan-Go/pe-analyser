import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "data");
const BUDGET_PATH = join(DATA_DIR, "budget.json");

export type BudgetFile = { amount: number };

export async function loadBudget(): Promise<BudgetFile> {
	try {
		const raw = await readFile(BUDGET_PATH, "utf-8");
		const parsed = JSON.parse(raw);
		if (typeof parsed?.amount === "number") return parsed as BudgetFile;
		throw new Error("Invalid format");
	} catch {
		await writeFile(BUDGET_PATH, JSON.stringify({ amount: 0 }), "utf-8");
		return { amount: 0 };
	}
}

export async function saveBudget(amount: number): Promise<void> {
	await writeFile(BUDGET_PATH, JSON.stringify({ amount }), "utf-8");
}
