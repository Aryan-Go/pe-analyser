"use client";

import { UploadPanel } from "./upload-panel";
import { FolderList } from "./folder-list";

export function Sidebar() {
	return (
		<aside className="flex w-52 shrink-0 flex-col gap-4 border-r p-3">
			<div className="flex items-center gap-2">
				<h2 className="text-sm font-semibold">PhonePe Tracker</h2>
			</div>
			<UploadPanel />
			<FolderList />
		</aside>
	);
}
