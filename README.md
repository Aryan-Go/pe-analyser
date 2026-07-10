# PhonePe Tracker

A dashboard for analyzing and categorizing PhonePe bank statements. Upload PDF statements, tag transactions by category, filter by month and category, merge multiple statements, and drill into spend patterns through interactive charts.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Runtime | Bun |
| API Layer | Elysia (embedded in Next.js catch-all route) |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| State | Zustand |
| PDF Parsing | pdf-parse (extracts text from PhonePe PDFs) |
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

- Download your PhonePe transaction statement as a PDF from the PhonePe app
- In the sidebar, use **"Upload PDF"** to select the file
- The app auto-generates a random folder name (e.g. `cosmic-falcon`), parses the PDF, extracts all transactions, and computes metrics
- The new folder appears in the sidebar

### 2. View & Explore

Click a folder in the sidebar to load the dashboard:

- **Summary cards** — total inflow, outflow, net cashflow, transaction count
- **Category pills** — click any category to filter the entire dashboard to that category. Click multiple to combine filters. The **Untagged** pill filters to uncategorized transactions. Click again to remove. A **Clear** button resets all filters
- **Month filter** — dropdown to filter by a specific YYYY-MM month
- **Charts** — daily cashflow trend, category spend breakdown, top recipients, and weekday spend patterns. All charts respond to the current month and category filters
- **Category Metrics table** — per-category breakdown with counts, averages, share %
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

Click multiple category pills at once to filter by any combination (e.g. FOOD + TRANSPORT). The summary cards, charts, and transaction table all narrow to show only matching rows.

### 5. Auto-Tag Rules

Define rules that automatically tag transactions by matching terms in the sender name (e.g. `swiggy` → FOOD). Open the **Rules** popup from the sidebar to manage rules inline, or visit the full **Settings** page.

- Rules have priority — drag them to reorder. Top rules are evaluated first.
- Only **untagged** rows are affected. Manually-tagged transactions are never overwritten.
- Rules apply during PDF upload and folder merging. Saving rules re-processes all existing folders, filling in blanks across every statement.
- Terms are case-insensitive substrings matched against the transaction description.

### 6. Merge Statements

Merge two folders into a single combined statement:

1. Click **"Merge folders"** in the sidebar
2. Select two folders (checkboxes appear)
3. Click **Merge**

The backend:
- Concatenates both CSVs
- Deduplicates by transaction ID (latest timestamp wins)
- Preserves category tags — if the newer row is untagged but the older one has a tag, the tag is inherited
- Copies both source PDFs into the merged folder with `_a` / `_b` suffixes
- Generates a fresh analysis for the combined dataset
- Creates a new folder with a `merged-` prefix

### 7. Change Rows per Page

In the transactions table footer, use the dropdown to switch between 10, 25, 50, or 100 rows per page. The page resets to 1 when changing.

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
│   ├── api/[[...slugs]]/route.ts    # Elysia API (folders, categories, merge)
│   └── dashboard/page.tsx           # Main dashboard page
├── components/
│   ├── dashboard/                   # All dashboard components
│   │   ├── charts.tsx               # Recharts charts (cashflow, spend, etc.)
│   │   ├── chart-grid.tsx           # Chart layout grid
│   │   ├── category-chip.tsx        # Clickable category tag chip
│   │   ├── category-metrics-table.tsx
│   │   ├── category-pills.tsx       # Multi-select category filter pills
│   │   ├── dashboard-client.tsx     # Main dashboard layout
│   │   ├── entries-table.tsx        # Transaction table with pagination
│   │   ├── filter-bar.tsx           # Month filter dropdown
│   │   ├── folder-list.tsx          # Sidebar folder list + merge UI
│   │   ├── summary-cards.tsx        # Inflow/outflow/net summary
│   │   ├── keyboard-handler.tsx     # Keyboard shortcuts for tagging
│   │   ├── batch-action-bar.tsx     # Bulk category assignment
│   │   ├── rules-popup.tsx            # Inline auto-tag rules popup
│   │   ├── sidebar.tsx              # Sidebar wrapper
│   │   └── upload-panel.tsx         # PDF upload dropzone
│   ├── settings/
│   │   ├── settings-client.tsx       # Full settings page
│   │   ├── auto-tag-rules.tsx        # Rules table (shared with popup)
│   │   └── auto-tag-rule-row.tsx     # Single rule row
│   └── ui/                          # shadcn/ui primitives
├── lib/
│   ├── pdf/
│   │   ├── parse.ts                 # PDF → CSV parsing + CSV I/O
│   │   ├── analyse.ts               # Node-specific analysis entry
│   │   └── analyser.ts              # Pure analysis computation (client-safe)
│   ├── autotag.ts                   # Auto-tag rules: load/save/apply/reprocess
│   ├── categories.ts                # Allowed categories + abbreviations
│   ├── storage.ts                   # Folder management, merge logic
│   ├── types.ts                     # Re-exports
│   └── utils.ts                     # Tailwind utilities
├── stores/
│   └── dashboard.ts                 # Zustand store (rows, filters, analysis, merge)
└── data/                            # Uploaded statements + config (gitignored)
    ├── tags.json                     # Canonical category list
    └── autotag.json                 # Auto-tag rule definitions
```

## API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/folders` | List all folders with summary stats |
| `GET` | `/api/folders/:name` | Load a folder with all rows + analysis |
| `POST` | `/api/folders` | Upload a PDF → create folder |
| `POST` | `/api/folders/:name/categories` | Save category changes |
| `POST` | `/api/folders/merge` | Merge two folders |
| `GET` | `/api/tags` | List available tags |
| `GET` | `/api/autotag` | Get auto-tag rules |
| `POST` | `/api/autotag` | Save auto-tag rules + reprocess all folders |
| `GET` | `/api/categories` | List available categories |
