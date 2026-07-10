"use client";

import { DailyCashflowChart, CategorySpendChart, TopRecipientsChart, WeekdaySpendChart, SpendByMonthChart } from "./charts";

export function ChartGrid() {
	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			{/* <SpendByMonthChart /> */}
			<DailyCashflowChart />
			<CategorySpendChart />
			<TopRecipientsChart />
			<WeekdaySpendChart />
		</div>
	);
}
