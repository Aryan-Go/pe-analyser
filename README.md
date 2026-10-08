# UPI Tracker

A dashboard for analyzing and categorizing PhonePe and Google Pay statements. Upload PDF statements, tag transactions by category, filter by month and category, merge multiple statements, set monthly budgets, and drill into spend patterns through interactive charts.

The statement format is auto-detected on upload, so the same pipeline works for both apps and produces identical results.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Runtime | Bun |
| API Layer | Elysia (embedded in Next.js catch-all route) |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| State | Zustand |
| Themes | next-themes (light/dark mode) |
| PDF Parsing | pdf-parse (extracts text from PhonePe & Google Pay PDFs) |
| Language | TypeScript |

## Getting Started

This project runs on [Bun](https://bun.sh). Install it first:

```bash
curl -fsSL https://bun.sh/install | bash
```

Then install dependencies and start the dev server:

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

Data is stored under `data/` in the project root. Each uploaded statement gets its own subdirectory with the PDF, parsed CSV, cached analysis, and category mappings.

## Workflow

### 1. Upload a Statement

- Download your transaction statement as a PDF:
  - **PhonePe:** History → My Statements → select date range → Download PDF
  - **Google Pay:** Scroll down → Show transaction history → Download icon (top right) → select date range → Download PDF
- In the sidebar, use **"Upload PDF"** to select the file
- The app detects whether it is a PhonePe or Google Pay statement, auto-generates a random folder name (e.g. `cosmic-falcon`), parses the PDF, extracts all transactions, and computes metrics
- The new folder appears at the top of the sidebar (sorted by recency)

### 2. View & Explore

Click a folder in the sidebar to load the dashboard:

- **Summary cards** — Available to Spend (budget card), total inflow, outflow, net cashflow, avg transaction size, transaction count
- **Budget card** — Shows `Available = Budget + Net` with inline edit (pencil icon) and a breakdown of budget / net / inflow / outflow. Budget is set globally via the Settings page or inline from the card
- **Category pills** — click any category to filter the entire dashboard to that category. Click multiple to combine filters. The **Untagged** pill filters to uncategorized transactions. Click again to remove. A **Clear** button resets all filters
- **Month filter** — dropdown to filter by a specific YYYY-MM month
- **Charts** — daily cashflow trend, category spend breakdown (pie chart), top recipients (horizontal bar), and weekday spend patterns. All charts respond to the current month and category filters
- **Category Metrics table** — per-category breakdown with counts, averages, share %
- **Data Quality section** — missing IDs, UTRs, descriptions, invalid amounts/dates, duplicates
- **Transactions table** — paginated list of all transactions with inline category chips

### 3. Tag Transactions

Each transaction shows a row of category chips (FOOD, TRANSPORT, PERSONAL, etc.) plus a **—** chip to clear the category.

**Mouse:** Click any chip on a row to tag that transaction. All stats and charts update instantly.

**Keyboard (fast tagging):**
- `↑` / `↓` — move focus between rows
- `0` — clear category on focused row
- `1` – `7` — assign category by position (1=FOOD, 2=TRANSPORT, 3=SUBSCRIPTION, 4=STATIONARY, 5=PERSONAL, 6=OTHERS, 7=POCKET\_MONEY)
- `Esc` — clear focus and selection

**Batch:** Check multiple rows and use the batch action bar at the bottom to apply a category to all selected at once.

**Save:** Click **"Save N changes"** to persist tags to disk. Categories survive across restarts and merges.

### 4. Multi-Tag Filtering

Click multiple category pills at once to filter by any combination (e.g. FOOD + TRANSPORT). The summary cards, charts, and transaction table all narrow to show only matching rows. The budget card also responds to the same filters — exclude Pocket Money to see your actual discretionary spending power.

### 5. Auto-Tag Rules

Define rules that automatically tag transactions by matching terms in the sender name (e.g. `swiggy` → FOOD). Open the **Rules** popup from the sidebar to manage rules inline, or visit the full **Settings** page.

- Rules are grouped by category tag in collapsible accordion sections. Each section shows a rule count badge
- Reorder rules within a tag group with ▲▼ buttons
- Add new rules directly into any tag section via the inline input
- Only **untagged** rows are affected. Manually-tagged transactions are never overwritten
- Rules apply during PDF upload and folder merging. Saving rules re-processes all existing folders

### 6. Merge Statements

Merge two folders into a single combined statement:

1. Click **"Merge folders"** in the sidebar
2. Select two folders (checkboxes appear)
3. Click **Merge**

The backend:
- Concatenates both CSVs
- Deduplicates by transaction ID (latest timestamp wins)
- Preserves category tags — if the newer row is untagged but the older one has a tag, the tag is inherited
- Copies all PDF files from both source folders into the merged folder with sequential numbering
- Generates a fresh analysis for the combined dataset
- Creates a new folder with a `merged-` prefix

### 7. Light / Dark Mode

Toggle between light and dark themes using the sun/moon button at the bottom of the sidebar. Your preference is saved to localStorage and respects system preference by default.

### 8. Monthly Budget

Set a global monthly spending limit in the Settings page or inline from the dashboard's budget card.

- `Available = Budget + Net Cashflow` — your remaining spending capacity for the month
- The card shows a breakdown: Budget / Net / Inflow / Outflow
- Use the category filter pills to exclude categories like Pocket Money from the calculation
- Green value = you're under budget. Red = you're over

## Categories

| Key | Label |
|-----|-------|
| `0` | — (clear) |
| `1` | FOOD |
| `2` | TRANSPORT |
| `3` | SUBSCRIPTION |
| `4` | STATIONARY |
| `5` | PERSONAL |
| `6` | OTHERS |
| `7` | POCKET\_MONEY |

## Project Structure

```
budget-tracker/
├── app/
│   ├── api/[[...slugs]]/route.ts    # Elysia API (folders, categories, merge, budget, autotag)
│   ├── dashboard/page.tsx           # Dashboard route
│   ├── settings/page.tsx            # Settings route
│   ├── layout.tsx                   # Root layout (ThemeProvider wrapper)
│   ├── page.tsx                     # Landing page
│   └── globals.css                  # Tailwind + CSS variables
├── components/
│   ├── dashboard/
│   │   ├── charts.tsx               # Recharts charts (cashflow, spend, recipients, etc.)
│   │   ├── chart-grid.tsx           # Chart layout grid
│   │   ├── category-chip.tsx        # Clickable category tag chip
│   │   ├── category-metrics-table.tsx
│   │   ├── category-pills.tsx       # Multi-select category filter pills
│   │   ├── dashboard-client.tsx     # Main dashboard layout
│   │   ├── entries-table.tsx        # Transaction table with pagination
│   │   ├── filter-bar.tsx           # Month filter dropdown
│   │   ├── folder-list.tsx          # Sidebar folder list + merge UI
│   │   ├── summary-cards.tsx        # Budget card + inflow/outflow/net cards
│   │   ├── budget-card.tsx          # Available to Spend card with inline edit
│   │   ├── keyboard-handler.tsx     # Keyboard shortcuts for tagging
│   │   ├── batch-action-bar.tsx     # Bulk category assignment
│   │   ├── data-quality-section.tsx # Data quality metrics + counterparties
│   │   ├── rules-popup.tsx          # Inline auto-tag rules popup
│   │   ├── sidebar.tsx              # Sidebar wrapper + theme toggle
│   │   └── upload-panel.tsx         # PDF upload dropzone
│   ├── settings/
│   │   ├── settings-client.tsx       # Full settings page (budget + rules)
│   │   ├── budget-settings.tsx       # Monthly budget input form
│   │   ├── grouped-auto-tag-rules.tsx # Tag-grouped accordion rules UI
│   │   ├── rule-section.tsx         # Single tag's collapsible rule section
│   │   ├── auto-tag-rules.tsx        # (legacy) Flat rule list
│   │   └── auto-tag-rule-row.tsx     # (legacy) Single rule row
│   ├── theme-provider.tsx           # next-themes wrapper
│   ├── theme-toggle.tsx             # Light/dark mode toggle button
│   └── ui/                          # shadcn/ui primitives
├── lib/
│   ├── pdf/
│   │   ├── parse.ts                 # PDF → CSV parsing + CSV I/O + source dispatch
│   │   ├── types.ts                 # TxnRow / TxnType / StatementSource
│   │   ├── providers/               # Per-app statement parsers
│   │   │   ├── index.ts             # Registry, source detection, dispatch
│   │   │   ├── phonepe.ts           # PhonePe cleaner + parser
│   │   │   ├── gpay.ts              # Google Pay cleaner + parser
│   │   │   └── types.ts             # StatementProvider interface
│   │   ├── analyse.ts               # Node-specific analysis entry
│   │   └── analyser.ts              # Pure analysis computation (client-safe)
│   ├── autotag.ts                   # Auto-tag rules: load/save/apply/reprocess
│   ├── budget.ts                    # Budget CRUD: load/save budget.json
│   ├── categories.ts                # Allowed categories + abbreviations
│   ├── storage.ts                   # Folder management, merge logic, analysis I/O
│   ├── types.ts                     # Re-exports
│   └── utils.ts                     # Tailwind utilities (cn)
├── stores/
│   └── dashboard.ts                 # Zustand store (rows, filters, analysis, merge)
└── data/                            # Uploaded statements + config (gitignored)
    ├── tags.json                     # Canonical category list
    ├── autotag.json                 # Auto-tag rule definitions
    └── budget.json                  # Monthly budget amount
```

## API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/folders` | List all folders (sorted by recency) |
| `GET` | `/api/folders/:name` | Load a folder with all rows + analysis |
| `POST` | `/api/folders` | Upload a PDF → create folder |
| `POST` | `/api/folders/:name/categories` | Save category changes |
| `POST` | `/api/folders/merge` | Merge two folders |
| `GET` | `/api/tags` | List available tags |
| `GET` | `/api/autotag` | Get auto-tag rules |
| `POST` | `/api/autotag` | Save auto-tag rules + reprocess all folders |
| `GET` | `/api/categories` | List allowed categories |
| `GET` | `/api/budget` | Get monthly budget amount |
| `POST` | `/api/budget` | Set monthly budget amount |
