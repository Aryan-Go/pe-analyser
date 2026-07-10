"use client";

import { DailyCashflowChart, CategorySpendChart, TopRecipientsChart, WeekdaySpendChart } from "./charts";

export function ChartGrid() {
	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<DailyCashflowChart />
			<CategorySpendChart />
			<TopRecipientsChart />
			<WeekdaySpendChart />
		</div>
	);
}
