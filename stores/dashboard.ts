import { create } from "zustand";
import type { FolderSummary, TxnRow, WebAppPayload } from "@/lib/types";

type Filters = {
	month: string | null;
	category: string | null;
};

type DashboardState = {
	folders: FolderSummary[];
	selectedFolder: string | null;
	rows: TxnRow[];
	analysis: WebAppPayload | null;
	categories: string[];
	loading: { folders: boolean; snapshot: boolean; upload: boolean; save: boolean };
	error: string | null;
	filters: Filters;
	page: number;
	pageSize: number;
	selection: Set<string>;
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
};

function getFilteredRows(rows: TxnRow[], filters: Filters, analysis: WebAppPayload | null): TxnRow[] {
	let filtered = [...rows];
	if (filters.month && analysis) {
		const monthMap = new Map<string, string>();
		for (const txn of analysis.metrics.dailyTrend) {
			monthMap.set(txn.period, txn.period);
		}
		filtered = filtered.filter((r) => {
			const dateStr = r.date;
			for (const period of monthMap.keys()) {
				if (dateStr.includes(period.slice(0, 7)) || dateStr === period) return true;
			}
			if (filters.month && r.date.includes(filters.month)) return true;
			return false;
		});
	}
	if (filters.category) {
		filtered = filtered.filter((r) => (r.category || "Uncategorized") === filters.category);
	}
	return filtered;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
	folders: [],
	selectedFolder: null,
	rows: [],
	analysis: null,
	categories: [],
	loading: { folders: false, snapshot: false, upload: false, save: false },
	error: null,
	filters: { month: null, category: null },
	page: 1,
	pageSize: 25,
	selection: new Set(),
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
				set({
					rows: data.rows,
					analysis: data.analysis,
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
				set({
					rows: data.rows,
					analysis: data.analysis,
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
		set((s) => ({ filters: { ...s.filters, [field]: value }, page: 1 }));
	},
	clearFilters: () => {
		set({ filters: { month: null, category: null }, page: 1 });
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
		const { rows, filters, analysis, page, pageSize } = get();
		const filtered = getFilteredRows(rows, filters, analysis);
		const start = (page - 1) * pageSize;
		const pageRows = filtered.slice(start, start + pageSize);
		set({ selection: new Set(pageRows.map((r) => r.txnId)) });
	},
	clearSelection: () => set({ selection: new Set() }),

	setCategory: (txnId, category) => {
		set((s) => ({
			rows: s.rows.map((r) => (r.txnId === txnId ? { ...r, category } : r)),
		}));
	},
	batchSetCategory: (category) => {
		set((s) => ({
			rows: s.rows.map((r) => (s.selection.has(r.txnId) ? { ...r, category } : r)),
			selection: new Set(),
		}));
	},
}));

export function useFilteredRows(): TxnRow[] {
	const { rows, filters, analysis } = useDashboardStore();
	return getFilteredRows(rows, filters, analysis);
}

export function useAvailableMonths(): string[] {
	const analysis = useDashboardStore((s) => s.analysis);
	if (!analysis) return [];
	const seen = new Set<string>();
	const months: string[] = [];
	for (const txn of analysis.metrics.dailyTrend) {
		const month = txn.period.slice(0, 7);
		if (!seen.has(month)) {
			seen.add(month);
			months.push(month);
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
