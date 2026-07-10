"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/dashboard";

export function UploadPanel() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [dragOver, setDragOver] = useState(false);
	const upload = useDashboardStore((s) => s.uploadPdf);
	const loading = useDashboardStore((s) => s.loading.upload);

	const handleFile = useCallback(
		(file: File) => {
			if (file.name.toLowerCase().endsWith(".pdf")) upload(file);
		},
		[upload],
	);

	return (
		<div
			className={cn(
				"flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-3 text-center transition-colors",
				dragOver && "border-primary bg-primary/5",
				loading && "pointer-events-none opacity-50",
			)}
			onClick={() => fileInputRef.current?.click()}
			onDragOver={(e) => {
				e.preventDefault();
				setDragOver(true);
			}}
			onDragLeave={() => setDragOver(false)}
			onDrop={(e) => {
				e.preventDefault();
				setDragOver(false);
				const file = e.dataTransfer.files[0];
				if (file) handleFile(file);
			}}
		>
			{loading ? (
				<p className="text-xs text-muted-foreground">Processing...</p>
			) : (
				<>
					<p className="text-xs font-medium">Drop a PhonePe statement PDF here</p>
					<p className="text-[0.6rem] text-muted-foreground">or click to browse</p>
				</>
			)}
			<input
				ref={fileInputRef}
				type="file"
				accept=".pdf"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) handleFile(file);
				}}
			/>
		</div>
	);
}
