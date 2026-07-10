"use client";

import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/dashboard";

export function FolderList() {
	const folders = useDashboardStore((s) => s.folders);
	const selectedFolder = useDashboardStore((s) => s.selectedFolder);
	const loading = useDashboardStore((s) => s.loading.folders);
	const loadFolder = useDashboardStore((s) => s.loadFolder);

	if (loading) {
		return <p className="px-1 text-[0.6rem] text-muted-foreground">Loading folders...</p>;
	}

	if (folders.length === 0 && !loading) {
		return <p className="px-1 text-[0.6rem] text-muted-foreground">No statements yet. Upload a PDF.</p>;
	}

	return (
		<div className="flex flex-col gap-0.5">
			{folders.map((f) => (
				<button
					key={f.folderName}
					type="button"
					className={cn(
						"flex flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted",
						selectedFolder === f.folderName && "bg-muted",
					)}
					onClick={() => loadFolder(f.folderName)}
				>
					<span className="text-xs font-medium">{f.folderName}</span>
					<span className="text-[0.55rem] text-muted-foreground">
						{f.transactionCount} txns · ₹{f.totalOutflow.toLocaleString("en-IN")} spent
					</span>
				</button>
			))}
		</div>
	);
}
