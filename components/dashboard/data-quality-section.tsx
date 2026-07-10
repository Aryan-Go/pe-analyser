"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStore } from "@/stores/dashboard";

export function DataQualitySection() {
	const analysis = useDashboardStore((s) => s.analysis);

	if (!analysis) return null;

	const dq = analysis.metrics.dataQuality;

	return (
		<div className="flex flex-col gap-3">
			<h3 className="text-sm font-semibold">Data Quality</h3>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<QualityStat label="Total Rows" value={dq.totalRows} />
				<QualityStat label="Missing Txn IDs" value={dq.missingTxnIdCount} warn />
				<QualityStat label="Missing UTRs" value={dq.missingUtrCount} warn />
				<QualityStat label="Missing Descriptions" value={dq.missingSentToCount} warn />
				<QualityStat label="Invalid Amounts" value={dq.invalidAmountCount} warn />
				<QualityStat label="Invalid Date/Times" value={dq.rowsWithInvalidDateTime} warn />
				<QualityStat label="Duplicate Txn IDs" value={dq.duplicateTxnIds.length} warn />
				<QualityStat label="Duplicate UTRs" value={dq.duplicateUtrs.length} warn />
			</div>

			{analysis.metrics.bidirectionalCounterparties.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Bidirectional Counterparties</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-1.5">
							{analysis.metrics.bidirectionalCounterparties.map((name) => (
								<span key={name} className="rounded-md bg-muted px-2 py-0.5 text-[0.6rem]">
									{name}
								</span>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function QualityStat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
	return (
		<div className="flex items-center justify-between rounded-md border px-3 py-2">
			<span className="text-[0.65rem] text-muted-foreground">{label}</span>
			<span className={`text-xs font-semibold tabular-nums ${warn && value > 0 ? "text-red-500" : "text-foreground"}`}>
				{value}
			</span>
		</div>
	);
}
