import Link from "next/link";

const steps = [
	{ icon: "📄", title: "Upload PDF", desc: "Drop a PhonePe statement PDF — it gets parsed automatically." },
	{ icon: "🏷️", title: "Tag", desc: "Click chips or use keyboard shortcuts (1–7) to assign categories." },
	{ icon: "⚡", title: "Auto-Tag", desc: "swiggy → FOOD. Untagged rows get filled in automatically." },
	{ icon: "🔍", title: "Filter", desc: "By month, category pills, or the Untagged pill." },
	{ icon: "🔗", title: "Merge", desc: "Combine two statements with dedup + tag inheritance." },
];

const features = [
	{ icon: "📑", title: "PDF Parsing", desc: "Extracts sender, amount, date, Txn ID, and more from PhonePe bank PDFs." },
	{ icon: "⌨️", title: "Keyboard Tagging", desc: "↑↓ to navigate, 0–7 to tag — no mouse needed for bulk work." },
	{ icon: "🎯", title: "Auto-Tag Rules", desc: "Match terms in sender names to categories. Only affects untagged rows." },
	{ icon: "🏓", title: "Multi-Filter", desc: "Combine month, category, and untagged filters. Everything updates together." },
	{ icon: "🔄", title: "Merge & Dedupe", desc: "Duplicates keep the latest timestamp. Tags are inherited from older rows." },
	{ icon: "📊", title: "Charts", desc: "Donut, line, and bar charts — cashflow, category %, top recipients, weekday patterns." },
];

export default function LandingPage() {
	return (
		<div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
			<div className="pointer-events-none fixed inset-0 hidden bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)] dark:block" />

			<main className="relative mx-auto flex w-full max-w-4xl flex-col gap-20 px-6 py-24">
				<section className="flex flex-col items-center gap-6 text-center">
					<div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
						<span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
						Personal Finance Analytics
					</div>
					<h1 className="max-w-2xl text-5xl font-bold tracking-tight leading-tight">
						Track every{" "}
						<span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-indigo-400 bg-clip-text text-transparent dark:from-emerald-400 dark:via-cyan-400 dark:to-indigo-400">
							PhonePe
						</span>{" "}
						transaction
					</h1>
					<p className="max-w-xl text-base leading-relaxed text-muted-foreground">
						Upload bank statements, categorize spending, set auto‑tag rules, and drill into
						patterns — from a single dashboard. No accounts, no cloud, your data stays local.
					</p>
					<div className="flex items-center gap-3 pt-2">
						<Link
							href="/dashboard"
							className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-6 text-sm font-medium text-background shadow-lg shadow-foreground/10 transition-all hover:opacity-90"
						>
							Open Dashboard
							<span className="text-base">→</span>
						</Link>
						<Link
							href="/settings"
							className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-6 text-sm font-medium text-muted-foreground backdrop-blur-sm transition-all hover:border-foreground/30 hover:text-foreground"
						>
							Settings
						</Link>
					</div>
				</section>

				<section>
					<div className="mb-8 text-center">
						<h2 className="text-2xl font-semibold">How it works</h2>
						<p className="mt-2 text-sm text-muted-foreground">Five steps from PDF to insights</p>
					</div>
					<div className="grid gap-4 sm:grid-cols-5">
						{steps.map((s, i) => (
							<div
								key={s.title}
								className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 backdrop-blur-sm transition-all hover:border-foreground/20 hover:bg-accent/50"
							>
								<span className="text-2xl">{s.icon}</span>
								<div>
									<div className="text-xs font-semibold text-foreground">{s.title}</div>
									<div className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.desc}</div>
								</div>
								{i < steps.length - 1 && (
									<span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-lg text-muted-foreground/30 sm:block">
										→
									</span>
								)}
							</div>
						))}
					</div>
				</section>

				<section>
					<div className="mb-8 text-center">
						<h2 className="text-2xl font-semibold">Everything you need</h2>
						<p className="mt-2 text-sm text-muted-foreground">Built for speed and keyboard power users</p>
					</div>
					<div className="grid gap-4 sm:grid-cols-3">
						{features.map((f) => (
							<div
								key={f.title}
								className="group flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/30 p-5 backdrop-blur-sm transition-all hover:border-foreground/20 hover:bg-muted/60"
							>
								<span className="text-xl">{f.icon}</span>
								<div>
									<div className="text-sm font-semibold text-foreground">{f.title}</div>
									<div className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</div>
								</div>
							</div>
						))}
					</div>
				</section>

				<div className="rounded-2xl border border-border bg-card p-8 text-center backdrop-blur-sm">
					<p className="text-sm text-muted-foreground">Free and open source</p>
					<p className="mt-1 text-2xl font-semibold text-foreground">No sign‑up. No cloud. Just your data.</p>
					<div className="mt-5">
						<Link
							href="/dashboard"
							className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-6 text-sm font-medium text-background shadow-lg shadow-foreground/10 transition-all hover:opacity-90"
						>
							Get started →
						</Link>
					</div>
				</div>
			</main>

			<footer className="relative border-t border-border py-6 text-center text-xs text-muted-foreground">
				PhonePe Tracker · Built with Next.js, Recharts & Bun
			</footer>
		</div>
	);
}
