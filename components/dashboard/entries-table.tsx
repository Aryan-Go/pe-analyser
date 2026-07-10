"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useDashboardStore, useFilteredRows } from "@/stores/dashboard";
import { CategoryChip } from "./category-chip";
import { ALLOWED_CATEGORIES } from "@/lib/categories";

export function EntriesTable() {
	const filteredRows = useFilteredRows();
	const page = useDashboardStore((s) => s.page);
	const pageSize = useDashboardStore((s) => s.pageSize);
	const setPage = useDashboardStore((s) => s.setPage);
	const selection = useDashboardStore((s) => s.selection);
	const toggleSelection = useDashboardStore((s) => s.toggleSelection);
	const selectAll = useDashboardStore((s) => s.selectAll);
	const setCategory = useDashboardStore((s) => s.setCategory);

	const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
	const start = (page - 1) * pageSize;
	const pageRows = filteredRows.slice(start, start + pageSize);

	return (
		<div className="flex flex-col gap-2">
			<h3 className="text-sm font-semibold">Transactions</h3>

			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-8">
								<input
									type="checkbox"
									className="size-3.5"
									checked={pageRows.length > 0 && pageRows.every((r) => selection.has(r.txnId))}
									onChange={(e) => {
										if (e.target.checked) selectAll();
										else useDashboardStore.getState().clearSelection();
									}}
								/>
							</TableHead>
							<TableHead>Date</TableHead>
							<TableHead>Time</TableHead>
							<TableHead>Description</TableHead>
							<TableHead className="text-right">Amount</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Category</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{pageRows.map((row) => (
							<TableRow
								key={row.txnId}
								className={selection.has(row.txnId) ? "bg-muted/50" : ""}
							>
								<TableCell>
									<input
										type="checkbox"
										className="size-3.5"
										checked={selection.has(row.txnId)}
										onChange={() => toggleSelection(row.txnId)}
									/>
								</TableCell>
								<TableCell className="tabular-nums">{row.date}</TableCell>
								<TableCell className="tabular-nums">{row.time}</TableCell>
								<TableCell className="max-w-48 truncate">{row.sentTo}</TableCell>
								<TableCell
									className={`text-right tabular-nums ${row.type === "CREDIT" ? "text-emerald-500" : "text-red-500"}`}
								>
									₹{parseFloat(row.amount).toLocaleString("en-IN")}
								</TableCell>
								<TableCell>
									<span
										className={`text-[0.6rem] font-medium ${row.type === "CREDIT" ? "text-emerald-500" : "text-red-500"}`}
									>
										{row.type}
									</span>
								</TableCell>
								<TableCell>
									<div className="flex flex-wrap gap-0.5">
										<CategoryChip
											key="clear"
											category=""
											size="sm"
											active={!row.category}
											onClick={() => setCategory(row.txnId, "")}
										/>
										{ALLOWED_CATEGORIES.map((cat) => (
											<CategoryChip
												key={cat}
												category={cat}
												size="sm"
												active={row.category === cat}
												onClick={() => setCategory(row.txnId, cat)}
											/>
										))}
									</div>
								</TableCell>
							</TableRow>
						))}
						{pageRows.length === 0 && (
							<TableRow>
								<TableCell colSpan={7} className="text-center text-muted-foreground">
									No transactions found
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{totalPages > 1 && (
				<div className="flex items-center justify-between">
					<span className="text-[0.6rem] text-muted-foreground">
						{filteredRows.length} transactions · Page {page} of {totalPages}
					</span>
					<div className="flex gap-1">
						<Button variant="outline" size="xs" disabled={page <= 1} onClick={() => setPage(page - 1)}>
							Prev
						</Button>
						<Button variant="outline" size="xs" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
							Next
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
