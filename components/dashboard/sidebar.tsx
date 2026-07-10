"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UploadPanel } from "./upload-panel";
import { FolderList } from "./folder-list";
import { RulesPopup } from "./rules-popup";

export function Sidebar() {
	const router = useRouter();
	const [rulesOpen, setRulesOpen] = useState(false);
	const rulesBtnRef = useRef<HTMLButtonElement>(null);

	return (
		<aside className="flex w-52 shrink-0 flex-col gap-4 border-r p-3">
			<div className="flex items-center gap-2">
				<h2 className="text-sm font-semibold">PhonePe Tracker</h2>
			</div>
			<UploadPanel />
			<FolderList />
			<div className="mt-auto flex flex-col gap-1 pt-2">
				<Button
					ref={rulesBtnRef}
					variant="ghost"
					size="xs"
					className="w-full justify-start text-muted-foreground"
					onClick={() => setRulesOpen(!rulesOpen)}
				>
					Rules
				</Button>
				<RulesPopup
					open={rulesOpen}
					onClose={() => setRulesOpen(false)}
					anchorEl={rulesBtnRef.current}
				/>
				<Button
					variant="ghost"
					size="xs"
					className="w-full justify-start text-muted-foreground"
					onClick={() => router.push("/settings")}
				>
					Settings
				</Button>
			</div>
		</aside>
	);
}
