"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStore } from "@/stores/dashboard";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = {
	inflow: "hsl(142 76% 36%)",
	outflow: "hsl(0 72% 51%)",
	net: "hsl(217 91% 60%)",
	bars: ["hsl(217 91% 60%)", "hsl(142 76% 36%)", "hsl(0 72% 51%)", "hsl(47 95% 41%)", "hsl(280 65% 50%)", "hsl(340 65% 50%)"],
};

function formatShortAmount(value: number | string): string {
	const num = typeof value === "string" ? Number.parseFloat(value) : value;
	if (!Number.isFinite(num)) return "₹0";
	if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
	if (Math.abs(num) >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
	return `₹${num}`;
}

function formatTooltip(value: unknown): string {
	const num = typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
	return `₹${Number.isFinite(num) ? num.toLocaleString("en-IN") : "0"}`;
}

export function SpendByMonthChart() {
	const analysis = useDashboardStore((s) => s.analysis);
	if (!analysis) return null;

	const monthly: Record<string, number> = {};
	for (const d of analysis.metrics.dailyTrend) {
		const parsed = new Date(d.period);
		if (Number.isNaN(parsed.getTime())) continue;
		const month = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
		monthly[month] = (monthly[month] ?? 0) + d.inflow - d.outflow;
	}
	const data = Object.entries(monthly)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([month, net]) => ({ month, net: Math.round(net) }));

	return (
		<Card>
			<CardHeader>
				<CardTitle>Net by Month</CardTitle>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={250}>
					<BarChart data={data}>
						<CartesianGrid strokeDasharray="3 3" className="stroke-border" />
						<XAxis dataKey="month" tick={{ fontSize: 10 }} className="text-muted-foreground" />
						<YAxis tick={{ fontSize: 10 }} tickFormatter={formatShortAmount} className="text-muted-foreground" />
						<Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} formatter={formatTooltip} />
						<Bar dataKey="net" fill={CHART_COLORS.net} radius={[4, 4, 0, 0]} />
					</BarChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}

export function DailyCashflowChart() {
	const analysis = useDashboardStore((s) => s.filteredAnalysis);
	if (!analysis) return null;

	const data = analysis.metrics.dailyTrend;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Daily Cashflow</CardTitle>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={250}>
					<LineChart data={data}>
						<CartesianGrid strokeDasharray="3 3" className="stroke-border" />
						<XAxis dataKey="period" tick={{ fontSize: 10 }} className="text-muted-foreground" />
						<YAxis tick={{ fontSize: 10 }} tickFormatter={formatShortAmount} className="text-muted-foreground" />
						<Tooltip
							contentStyle={{ fontSize: 11, borderRadius: 6 }}
							formatter={formatTooltip}
						/>
						<Legend />
						<Line type="monotone" dataKey="inflow" stroke={CHART_COLORS.inflow} name="Inflow" dot={false} strokeWidth={2} />
						<Line type="monotone" dataKey="outflow" stroke={CHART_COLORS.outflow} name="Outflow" dot={false} strokeWidth={2} />
						<Line type="monotone" dataKey="net" stroke={CHART_COLORS.net} name="Net" dot={false} strokeWidth={1.5} strokeDasharray="5 5" />
					</LineChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}

export function CategorySpendChart() {
	const analysis = useDashboardStore((s) => s.filteredAnalysis);
	if (!analysis) return null;

	const metrics = analysis.metrics.categoryMetrics.filter((c) => c.debitAmount > 0);
	const total = metrics.reduce((sum, c) => sum + c.debitAmount, 0);
	const data = metrics.map((c) => ({ name: c.category, amount: c.debitAmount }));

	return (
		<Card>
			<CardHeader>
				<CardTitle>Category Spend</CardTitle>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={280}>
					<PieChart>
						<Pie
							data={data}
							dataKey="amount"
							nameKey="name"
							cx="50%"
							cy="50%"
							innerRadius={55}
							outerRadius={100}
							paddingAngle={2}
							label={({ name, percent }) => {
								const pct = typeof percent === "number" ? (percent * 100).toFixed(1) : "0";
								return `${name ?? ""} ${pct}%`;
							}}
							labelLine={{ strokeWidth: 1 }}
						>
							{data.map((d, i) => (
								<Cell key={d.name} fill={CHART_COLORS.bars[i % CHART_COLORS.bars.length]} />
							))}
						</Pie>
						<Tooltip
							contentStyle={{ fontSize: 11, borderRadius: 6 }}
							formatter={formatTooltip}
						/>
					</PieChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}

export function TopRecipientsChart() {
	const analysis = useDashboardStore((s) => s.filteredAnalysis);
	if (!analysis) return null;

	const data = analysis.metrics.topRecipientsBySpend.slice(0, 10).map((r) => ({
		name: r.name.length > 20 ? r.name.slice(0, 20) + "..." : r.name,
		amount: r.amount,
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle>Top Recipients by Spend</CardTitle>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={250}>
					<BarChart data={data} layout="vertical">
						<CartesianGrid strokeDasharray="3 3" className="stroke-border" />
						<XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={formatShortAmount} className="text-muted-foreground" />
						<YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} className="text-muted-foreground" />
						<Tooltip
							contentStyle={{ fontSize: 11, borderRadius: 6 }}
							formatter={formatTooltip}
						/>
						<Bar dataKey="amount" fill={CHART_COLORS.bars[0]} radius={[0, 4, 4, 0]} />
					</BarChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}

export function WeekdaySpendChart() {
	const analysis = useDashboardStore((s) => s.filteredAnalysis);
	if (!analysis) return null;

	const data = analysis.metrics.dayOfWeekSpend;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Spend by Weekday</CardTitle>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={250}>
					<BarChart data={data}>
						<CartesianGrid strokeDasharray="3 3" className="stroke-border" />
						<XAxis dataKey="day" tick={{ fontSize: 10 }} className="text-muted-foreground" />
						<YAxis tick={{ fontSize: 10 }} tickFormatter={formatShortAmount} className="text-muted-foreground" />
						<Tooltip
							contentStyle={{ fontSize: 11, borderRadius: 6 }}
							formatter={formatTooltip}
						/>
						<Bar dataKey="amount" fill={CHART_COLORS.net} radius={[4, 4, 0, 0]} />
					</BarChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}
