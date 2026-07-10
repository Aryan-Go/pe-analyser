import { create } from "zustand";
import type { FolderSummary, TxnRow, WebAppPayload } from "@/lib/types";
import { ALLOWED_CATEGORIES } from "@/lib/categories";
import { runAnalysis } from "@/lib/pdf/analyser";

type Filters = {
	month: string | null;
	category: string | null;
};

type DashboardState = {
	folders: FolderSummary[];
	selectedFolder: string | null;
	rows: TxnRow[];
	analysis: WebAppPayload | null;
	filteredAnalysis: WebAppPayload | null;
	categories: string[];
	loading: { folders: boolean; snapshot: boolean; upload: boolean; save: boolean };
	error: string | null;
	filters: Filters;
	page: number;
	pageSize: number;
	selection: Set<string>;
	focusedRowTxnId: string | null;
	originalCategories: Map<string, string>;

	loadFolders: () => Promise<void>;
	loadFolder: (name: string) => Promise<void>;
	uploadPdf: (file: File) => Promise<void>;
	saveCategories: () => Promise<void>;
	setFilter: (field: keyof Filters, value: string | null) => void;
	clearFilters: () => void;
	setPage: (n: number) => void;
	setPageSize: (n: number) => void;
	toggleSelection: (txnId: string) => void;
	selectAll: () => void;
	clearSelection: () => void;
	setCategory: (txnId: string, category: string) => void;
	batchSetCategory: (category: string) => void;
	focusNextRow: (direction: -1 | 1) => void;
	tagFocusedRow: (digit: string) => void;
	clearFocus: () => void;
};

function getMonthFromDate(date: string): string {
	const parsed = new Date(date);
	if (Number.isNaN(parsed.getTime())) return "unknown";
	const year = parsed.getFullYear();
	const month = String(parsed.getMonth() + 1).padStart(2, "0");
	return `${year}-${month}`;
}

function getFilteredRows(rows: TxnRow[], filters: Filters): TxnRow[] {
	let filtered = [...rows];
	if (filters.month) {
		filtered = filtered.filter((r) => getMonthFromDate(r.date) === filters.month);
	}
	if (filters.category) {
		filtered = filtered.filter((r) => (r.category || "Uncategorized") === filters.category);
	}
	return filtered.sort((a, b) => {
		const da = new Date(`${a.date} ${a.time}`).getTime();
		const db = new Date(`${b.date} ${b.time}`).getTime();
		return db - da;
	});
}

function recomputeAnalysis(rows: TxnRow[]): WebAppPayload | null {
	try {
		return runAnalysis(rows);
	} catch {
		return null;
	}
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
	folders: [],
	selectedFolder: null,
	rows: [],
	analysis: null,
	filteredAnalysis: null,
	categories: [],
	loading: { folders: false, snapshot: false, upload: false, save: false },
	error: null,
	filters: { month: null, category: null },
	page: 1,
	pageSize: 25,
	selection: new Set(),
	focusedRowTxnId: null,
	originalCategories: new Map(),

	loadFolders: async () => {
		set((s) => ({ loading: { ...s.loading, folders: true }, error: null }));
		try {
			const res = await fetch("/api/folders");
			const data = await res.json();
			if (data.ok) set({ folders: data.folders });
			else set({ error: data.error });
		} catch {
			set({ error: "Failed to load folders" });
		} finally {
			set((s) => ({ loading: { ...s.loading, folders: false } }));
		}
	},

	loadFolder: async (name: string) => {
		set((s) => ({ loading: { ...s.loading, snapshot: true }, error: null, selectedFolder: name }));
		try {
			const res = await fetch(`/api/folders/${name}`);
			const data = await res.json();
			if (data.ok) {
				const origMap = new Map<string, string>();
				for (const r of data.rows) origMap.set(r.txnId, r.category || "");
				const fullAnalysis = data.analysis;
				set({
					rows: data.rows,
					analysis: fullAnalysis,
					filteredAnalysis: fullAnalysis,
					categories: data.categories,
					originalCategories: origMap,
					page: 1,
					selection: new Set(),
					filters: { month: null, category: null },
				});
				localStorage.setItem("selectedFolder", name);
			} else {
				set({ error: data.error, selectedFolder: null });
			}
		} catch {
			set({ error: "Failed to load folder", selectedFolder: null });
		} finally {
			set((s) => ({ loading: { ...s.loading, snapshot: false } }));
		}
	},

	uploadPdf: async (file: File) => {
		set((s) => ({ loading: { ...s.loading, upload: true }, error: null }));
		try {
			const formData = new FormData();
			formData.append("file", file);
			const res = await fetch("/api/folders", { method: "POST", body: formData });
			const data = await res.json();
			if (data.ok) {
				await get().loadFolders();
				await get().loadFolder(data.folderName);
			} else {
				set({ error: data.error });
			}
		} catch {
			set({ error: "Failed to upload PDF" });
		} finally {
			set((s) => ({ loading: { ...s.loading, upload: false } }));
		}
	},

	saveCategories: async () => {
		const { selectedFolder, rows, originalCategories } = get();
		if (!selectedFolder) return;
		const changes: Array<{ txnId: string; category: string }> = [];
		for (const row of rows) {
			const orig = originalCategories.get(row.txnId) ?? "";
			if (row.category !== orig) {
				changes.push({ txnId: row.txnId, category: row.category });
			}
		}
		if (changes.length === 0) return;

		set((s) => ({ loading: { ...s.loading, save: true }, error: null }));
		try {
			const res = await fetch(`/api/folders/${selectedFolder}/categories`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ changes }),
			});
			const data = await res.json();
			if (data.ok) {
				const origMap = new Map<string, string>();
				for (const r of data.rows) origMap.set(r.txnId, r.category || "");
				const fullAnalysis = data.analysis;
				const { filters } = get();
				const hasFilters = filters.month || filters.category;
				const filtered = hasFilters ? recomputeAnalysis(getFilteredRows(data.rows, filters)) : fullAnalysis;
				set({
					rows: data.rows,
					analysis: fullAnalysis,
					filteredAnalysis: filtered ?? fullAnalysis,
					originalCategories: origMap,
				});
			} else {
				set({ error: data.error });
			}
		} catch {
			set({ error: "Failed to save categories" });
		} finally {
			set((s) => ({ loading: { ...s.loading, save: false } }));
		}
	},

	setFilter: (field, value) => {
		const nextFilters = { ...get().filters, [field]: value };
		const filtered = recomputeAnalysis(getFilteredRows(get().rows, nextFilters)) ?? get().analysis;
		set({ filters: nextFilters, page: 1, filteredAnalysis: filtered });
	},
	clearFilters: () => {
		set({ filters: { month: null, category: null }, page: 1, filteredAnalysis: get().analysis });
	},

	setPage: (n) => set({ page: n }),
	setPageSize: (n) => set({ pageSize: n, page: 1 }),

	toggleSelection: (txnId) => {
		set((s) => {
			const next = new Set(s.selection);
			if (next.has(txnId)) next.delete(txnId);
			else next.add(txnId);
			return { selection: next };
		});
	},
	selectAll: () => {
		const { rows, filters, page, pageSize } = get();
		const filtered = getFilteredRows(rows, filters);
		const start = (page - 1) * pageSize;
		const pageRows = filtered.slice(start, start + pageSize);
		set({ selection: new Set(pageRows.map((r) => r.txnId)) });
	},
	clearSelection: () => set({ selection: new Set() }),

	setCategory: (txnId, category) => {
		const updated = get().rows.map((r) => (r.txnId === txnId ? { ...r, category } : r));
		const fullAnalysis = recomputeAnalysis(updated) ?? get().analysis;
		const { filters } = get();
		const hasFilters = filters.month || filters.category;
		const filtered = hasFilters ? recomputeAnalysis(getFilteredRows(updated, filters)) : fullAnalysis;
		set({ rows: updated, analysis: fullAnalysis, filteredAnalysis: filtered ?? fullAnalysis });
	},
	batchSetCategory: (category) => {
		const updated = get().rows.map((r) => (get().selection.has(r.txnId) ? { ...r, category } : r));
		const fullAnalysis = recomputeAnalysis(updated) ?? get().analysis;
		const { filters } = get();
		const hasFilters = filters.month || filters.category;
		const filtered = hasFilters ? recomputeAnalysis(getFilteredRows(updated, filters)) : fullAnalysis;
		set({ rows: updated, analysis: fullAnalysis, filteredAnalysis: filtered ?? fullAnalysis, selection: new Set() });
	},

	focusNextRow: (direction) => {
		const { focusedRowTxnId, filters, page, pageSize, rows } = get();
		const filtered = getFilteredRows(rows, filters);
		const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
		const currentPageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
		const currentIdx = focusedRowTxnId ? currentPageRows.findIndex((r) => r.txnId === focusedRowTxnId) : -1;

		if (currentIdx === -1) {
			const txnId = (direction > 0 ? currentPageRows[0] : currentPageRows[currentPageRows.length - 1])?.txnId ?? null;
			set({ focusedRowTxnId: txnId });
		} else {
			const newIdx = currentIdx + direction;
			if (newIdx >= 0 && newIdx < currentPageRows.length) {
				set({ focusedRowTxnId: currentPageRows[newIdx]?.txnId ?? null });
			} else if (direction > 0 && page < totalPages) {
				set({ page: page + 1, focusedRowTxnId: null });
			} else if (direction < 0 && page > 1) {
				set({ page: page - 1, focusedRowTxnId: null });
			}
		}
	},

	tagFocusedRow: (digit) => {
		const { focusedRowTxnId } = get();
		if (!focusedRowTxnId) return;
		const categories = ["", ...ALLOWED_CATEGORIES];
		const idx = Number.parseInt(digit, 10);
		const category = categories[idx] ?? "";
		get().setCategory(focusedRowTxnId, category);
	},

	clearFocus: () => set({ focusedRowTxnId: null, selection: new Set() }),
}));

export function useFilteredRows(): TxnRow[] {
	const { rows, filters } = useDashboardStore();
	return getFilteredRows(rows, filters);
}

export function useAvailableMonths(): string[] {
	const rows = useDashboardStore((s) => s.rows);
	const seen = new Set<string>();
	const months: string[] = [];
	for (const r of rows) {
		const m = getMonthFromDate(r.date);
		if (m !== "unknown" && !seen.has(m)) {
			seen.add(m);
			months.push(m);
		}
	}
	return months.sort();
}

export function useAvailableCategories(): string[] {
	const analysis = useDashboardStore((s) => s.analysis);
	if (!analysis) return [];
	return analysis.metrics.categoryMetrics.map((c) => c.category).filter((c) => c !== "Uncategorized");
}

export function useDirtyCount(): number {
	const { rows, originalCategories } = useDashboardStore();
	let count = 0;
	for (const row of rows) {
		if (row.category !== (originalCategories.get(row.txnId) ?? "")) count++;
	}
	return count;
}
