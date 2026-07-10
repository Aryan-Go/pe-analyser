"use client";

import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/dashboard";
import { Button } from "@/components/ui/button";

export function FolderList() {
	const folders = useDashboardStore((s) => s.folders);
	const selectedFolder = useDashboardStore((s) => s.selectedFolder);
	const loading = useDashboardStore((s) => s.loading.folders);
	const loadFolder = useDashboardStore((s) => s.loadFolder);
	const mergeMode = useDashboardStore((s) => s.mergeMode);
	const mergeSelection = useDashboardStore((s) => s.mergeSelection);
	const mergeLoading = useDashboardStore((s) => s.mergeLoading);
	const startMerge = useDashboardStore((s) => s.startMerge);
	const cancelMerge = useDashboardStore((s) => s.cancelMerge);
	const toggleMergeSelect = useDashboardStore((s) => s.toggleMergeSelect);
	const mergeFolders = useDashboardStore((s) => s.mergeFolders);

	if (loading) {
		return <p className="px-1 text-[0.6rem] text-muted-foreground">Loading folders...</p>;
	}

	if (folders.length === 0 && !loading) {
		return <p className="px-1 text-[0.6rem] text-muted-foreground">No statements yet. Upload a PDF.</p>;
	}

	const canMerge = mergeSelection.length === 2;

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-col gap-0.5">
				{folders.map((f) => (
					<button
						key={f.folderName}
						type="button"
						className={cn(
							"flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted",
							selectedFolder === f.folderName && !mergeMode && "bg-muted",
						)}
						onClick={() => {
							if (mergeMode) {
								if (mergeSelection.includes(f.folderName) || mergeSelection.length < 2) {
									toggleMergeSelect(f.folderName);
								}
							} else {
								loadFolder(f.folderName);
							}
						}}
					>
						{mergeMode && (
							<input
								type="checkbox"
								className="size-3 shrink-0"
								checked={mergeSelection.includes(f.folderName)}
								readOnly
							/>
						)}
						<div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
							<span className="w-full truncate text-xs font-medium">{f.folderName}</span>
							<span className="text-[0.55rem] text-muted-foreground">
								{f.transactionCount} txns · ₹{f.totalOutflow.toLocaleString("en-IN")} spent
							</span>
						</div>
					</button>
				))}
			</div>

			{mergeMode ? (
				<div className="flex flex-col gap-1.5">
					<span className="text-[0.55rem] text-muted-foreground">
						{mergeSelection.length === 0
							? "Select 2 folders to merge"
							: mergeSelection.length === 2
								? "Ready to merge"
								: "Select 1 more"}
					</span>
					<div className="flex gap-1">
						<Button size="xs" variant="outline" onClick={cancelMerge} disabled={mergeLoading}>
							Cancel
						</Button>
						<Button size="xs" onClick={mergeFolders} disabled={!canMerge || mergeLoading}>
							{mergeLoading ? "Merging..." : "Merge"}
						</Button>
					</div>
				</div>
			) : (
				<Button size="xs" variant="ghost" onClick={startMerge} disabled={folders.length < 2}>
					Merge folders
				</Button>
			)}
		</div>
	);
}
