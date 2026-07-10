"use client";

import { useEffect } from "react";
import { useDashboardStore, useDirtyCount } from "@/stores/dashboard";
import { Sidebar } from "./sidebar";
import { FilterBar } from "./filter-bar";
import { SummaryCards } from "./summary-cards";
import { CategoryPills } from "./category-pills";
import { ChartGrid } from "./chart-grid";
import { CategoryMetricsTable } from "./category-metrics-table";
import { EntriesTable } from "./entries-table";
import { BatchActionBar } from "./batch-action-bar";
import { DataQualitySection } from "./data-quality-section";
import { Button } from "@/components/ui/button";

export function DashboardClient() {
	const selectedFolder = useDashboardStore((s) => s.selectedFolder);
	const analysis = useDashboardStore((s) => s.analysis);
	const loading = useDashboardStore((s) => s.loading);
	const error = useDashboardStore((s) => s.error);
	const loadFolders = useDashboardStore((s) => s.loadFolders);
	const loadFolder = useDashboardStore((s) => s.loadFolder);
	const saveCategories = useDashboardStore((s) => s.saveCategories);
	const dirtyCount = useDirtyCount();

	useEffect(() => {
		loadFolders();
		const saved = localStorage.getItem("selectedFolder");
		if (saved) loadFolder(saved);
	}, []);

	return (
		<div className="flex h-screen overflow-hidden">
			<div className="flex flex-1 overflow-hidden">
				<Sidebar />
				<main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
					{error && (
						<div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
							{error}
						</div>
					)}

					{loading.snapshot && (
						<div className="flex items-center justify-center py-16">
							<p className="text-sm text-muted-foreground">Loading...</p>
						</div>
					)}

					{!selectedFolder && !loading.snapshot && (
						<div className="flex flex-1 flex-col items-center justify-center gap-3">
							<p className="text-sm text-muted-foreground">
								Select a folder from the sidebar or upload a new PDF
							</p>
						</div>
					)}

					{analysis && selectedFolder && (
						<>
							<FilterBar />
							<SummaryCards />
							<CategoryPills />
							<ChartGrid />
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-semibold">Details</h3>
								{dirtyCount > 0 && (
									<Button size="xs" onClick={saveCategories} disabled={loading.save}>
										{loading.save ? "Saving..." : `Save ${dirtyCount} changes`}
									</Button>
								)}
							</div>
							<CategoryMetricsTable />
							<EntriesTable />
							<BatchActionBar />
							<DataQualitySection />
						</>
					)}
				</main>
			</div>
		</div>
	);
}
