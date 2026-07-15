# Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Budget Tracker                               │
│                                                                     │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────────────┐  │
│  │ Landing  │   │ Dashboard│   │ Settings │   │ API (Elysia)   │  │
│  │ Page     │   │ (Zustand)│   │ Page     │   │ /api/*         │  │
│  └──────────┘   └────┬─────┘   └──────────┘   └───────┬────────┘  │
│                       │                                 │           │
│              ┌────────┴────────┐               ┌───────┴────────┐  │
│              │  Client-side    │               │  Server-side   │  │
│              │  runAnalysis()  │               │  analyzeCsv    │  │
│              │  (pure TS)      │               │  Files() + I/O │  │
│              └─────────────────┘               └───────┬────────┘  │
│                                                        │           │
│                                               ┌────────┴────────┐  │
│                                               │  data/          │  │
│                                               │  ├── folder/    │  │
│                                               │  │   ├── .csv   │  │
│                                               │  │   ├── .pdf   │  │
│                                               │  │   └── -trend │  │
│                                               │  ├── budget.json│  │
│                                               │  ├── autotag    │  │
│                                               │  └── tags.json  │  │
│                                               └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### PDF Upload Path

```
UploadPanel (client)
  → POST /api/folders (FormData)
    → createUniqueFolderName("cosmic-falcon")
    → writeFile saves .pdf to data/cosmic-falcon/
    → createArtifactsFromPdf():
        pdfParse(buffer) → raw text
        removeNonTransactionInfo() → clean text
        parseTransactionsFromCleanText() → TxnRow[]
        rowsToCsv() → writes .csv
    → loadAutoTagRules() → applyAutoTags() → writeCsvRows() (if rules exist)
    → analyzeCsvFiles():
        loadCsvTransactions() → csvRowToCsvTxn() per row
        new Analyser(transactions).runAllMetrics()
        buildWebAppPayload()
    → persistTrend() → folder-trend.json
    → persistCategoryMapping() → folder-categories.json
  → Response: { ok, folderName, rows, analysis, categories }
  → Zustand store.loadFolder() sets rows/analysis/filteredAnalysis
  → Dashboard renders SummaryCards, Charts, Table
```

### Client-Side Filtering Path

```
User clicks category pill or changes month
  → Zustand store.setFilter()
    → getFilteredRows(rows, filters) → subset of TxnRow[]
    → runAnalysis(filteredRows)       ← pure TS, no server roundtrip
    → set({ filteredAnalysis })
  → All components reading filteredAnalysis re-render instantly
```

The store holds **two analysis objects**:
- `analysis` — unfiltered, from the server on folder load
- `filteredAnalysis` — recomputed client-side whenever filters change

This avoids a server roundtrip on every filter click while keeping charts responsive.

### Save Categories Path

```
User tags transactions → tags are tracked in-memory
User clicks "Save N changes"
  → POST /api/folders/:name/categories { changes: [{ txnId, category }] }
    → readCsvRows() → updateCsvCategories() → writeCsvRows()
    → analyzeCsvFiles() → persistTrend() → persistCategoryMapping()
  → Response: { ok, rows, analysis }
  → Store re-syncs rows and analysis from server
```

## Key Design Decisions

### 1. Analyser Split: `analyser.ts` vs `analyse.ts`

| File | Environment | Role |
|------|-------------|------|
| `lib/pdf/analyser.ts` | **Both** client & server | Pure TypeScript class `Analyser`, `runAnalysis()`, `buildWebAppPayload()` |
| `lib/pdf/analyse.ts` | **Server only** | Node I/O wrapper: `loadCsvTransactions()`, `analyzeCsvFiles()` |

The analyser class has no Node dependencies — it operates on typed objects. This lets the client recompute analysis from filtered rows via `runAnalysis()` without touching the file system. The server-side entry point (`analyse.ts`) handles file I/O and delegates computation to the same analyser.

### 2. PDF Parsing Strategy

PhonePe PDFs don't have structured fields — they're layout-based. The parser uses a multi-pass regex approach:
1. Extract raw text with `pdf-parse`
2. Strip PII (phone numbers, email, addresses) and headers/footers with `removeNonTransactionInfo()`
3. Parse transactions line-by-line with date/time regex + UTR/Txn ID patterns
4. Determine CREDIT vs DEBIT from context ("received from" → CREDIT, else DEBIT)
5. Output normalized CSV with columns: Txn ID, UTR, Date, Time, Amount, Sent to, CREDIT/DEBIT, Category

### 3. Merge Deduplication

When merging two folders, transactions are deduplicated by `txnId` using a `Map<string, TxnRow>`:

- **Newer timestamp wins** for data fields (amount, description, type)
- **Category inheritance**: If the winning row is untagged but the losing row has a category, the category is inherited. This preserves manual work through merges.
- **Same timestamp**: Folder B wins (the second folder), but inherits A's category if B is untagged
- After deduplication, auto-tag rules are applied to any remaining untagged rows
- All PDFs from both source folders are copied with sequential numbering (`_1.pdf`, `_2.pdf`)

### 4. State Management

A single Zustand store (`stores/dashboard.ts`) holds all dashboard state:

```
DashboardState {
  folders: FolderSummary[]        // sidebar list
  selectedFolder: string | null   // active folder
  rows: TxnRow[]                  // unfiltered, full dataset
  analysis: WebAppPayload | null  // unfiltered analysis
  filteredAnalysis: WebAppPayload | null  // filtered by month + categories
  filters: { month, categories[] }
  page, pageSize                  // pagination
  selection: Set<string>          // batch-selected txnIds
  focusedRowTxnId                 // keyboard navigation
  mergeMode, mergeSelection[]     // merge flow state
  originalCategories: Map         // for dirty tracking
}
```

No external state library, no prop drilling. All components subscribe to the specific slices they need via selector functions.

### 5. Theme System

`next-themes` with class strategy — the `<html>` element gets `class="dark"` or `class="light"`. Tailwind v4's `@custom-variant dark (&:is(.dark *))` picks this up. All components use semantic CSS variables (`bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`) so they work in both modes without per-component `dark:` overrides.

### 6. Auto-Tag Architecture

```
data/autotag.json → loadAutoTagRules() → AutoTagRule[]
                                              │
                        ┌─────────────────────┼──────────────────────┐
                        ▼                     ▼                       ▼
                 PDF upload            Merge folders          Rules saved
                 (route.ts:94)         (storage.ts:299)      (route.ts:211)
                        │                     │                       │
                        └─────────┬───────────┘           reprocessAll()
                                  ▼                      (scans all folders)
                          applyAutoTags()                       │
                          (lib/autotag.ts)                      ▼
                                  │                    re-reads every CSV,
                    Only matches: │                    re-applies rules,
                    category==""  │                    updates analysis
                                  ▼
                         first-match-wins
                         (sorted by priority)
```

### 7. Budget System

```
data/budget.json → { amount: 5000 }
                         │
         ┌───────────────┴──────────────┐
         ▼                               ▼
  GET /api/budget                 BudgetCard (client)
  POST /api/budget                reads filteredAnalysis
  (simple CRUD, no                from Zustand store:
  server-side computation)        netCashflow is already
                                  filtered by month +
                                  category pills
                                         │
                                  Available = Budget + Net
```

The budget card doesn't compute anything — it reads `filteredAnalysis.metrics.summary.netCashflow` from the Zustand store, which already respects the active month and category filters. The only server-side budget endpoint is simple read/write of a single number.

### 8. Date Format

PhonePe CSVs use `"Jul 08, 2026"` format. The internal representation normalizes to `Date` objects where possible. Month extraction uses `getMonthFromDate()` which parses with `new Date(date)` and extracts `YYYY-MM`. The taste preference is **DD-MM-YYYY** for display, but internal format is `new Date()` compatible.

## Storage Layout

```
data/
├── budget.json                     // { amount: number }
├── autotag.json                    // AutoTagRule[]
├── tags.json                       // TagDef[]
├── cosmic-falcon/                  // Original upload
│   ├── cosmic-falcon.pdf
│   ├── cosmic-falcon.csv
│   ├── cosmic-falcon-trend.json    // Cached WebAppPayload
│   └── cosmic-falcon-categories.json
├── stellar-phoenix/               // Another upload
│   └── ...
└── merged-cosmic-falcon/          // Merge result
    ├── merged-cosmic-falcon.csv
    ├── merged-cosmic-falcon-trend.json
    ├── merged-cosmic-falcon_1.pdf  // From folder A
    └── merged-cosmic-falcon_2.pdf  // From folder B
```

## API Routes

| Method | Route | Purpose | Computes? |
|--------|-------|---------|-----------|
| `GET` | `/api/folders` | List folders (recency-sorted) | No — reads summaries from cached trends |
| `GET` | `/api/folders/:name` | Load folder snapshot | No — reads CSV + cached trend |
| `POST` | `/api/folders` | Upload PDF | Yes — parses + analyses + tags |
| `POST` | `/api/folders/:name/categories` | Save category changes | Yes — re-analyses after CSV update |
| `POST` | `/api/folders/merge` | Merge two folders | Yes — deduplicates + analyses merged |
| `GET` | `/api/tags` | List tag definitions | No — reads tags.json |
| `GET` | `/api/autotag` | Get auto-tag rules | No — reads autotag.json |
| `POST` | `/api/autotag` | Save rules + reprocess | Yes — re-analyses all folders |
| `GET` | `/api/categories` | List allowed categories | No — reads constants |
| `GET` | `/api/budget` | Get budget amount | No — reads budget.json |
| `POST` | `/api/budget` | Set budget amount | No — writes budget.json |

## UI Component Tree

```
DashboardClient
├── Sidebar
│   ├── UploadPanel
│   ├── FolderList           (merge mode here)
│   ├── ThemeToggle
│   ├── RulesPopup           (GroupedAutoTagRules, compact)
│   └── Button (→ /settings)
├── SummaryCards
│   ├── BudgetCard           (reads filteredAnalysis, auto-updates)
│   └── StatCard × 5         (inflow, outflow, net, avg, count)
├── FilterBar                (month dropdown)
├── CategoryPills            (multi-select category filter)
├── ChartGrid
│   ├── DailyCashflowChart
│   ├── CategorySpendChart   (pie)
│   ├── TopRecipientsChart   (horizontal bar)
│   └── WeekdaySpendChart
├── CategoryMetricsTable
├── DataQualitySection
├── EntriesTable             (paginated, keyboard-navigable)
├── BatchActionBar           (sticky, bulk tagging)
└── KeyboardHandler          (global shortcuts)
```

Both the dashboard `RulesPopup` and the full `/settings` page render `GroupedAutoTagRules`, which groups rules into per-tag accordion sections using `RuleSection` components. The popup uses compact mode for the constrained sidebar width.
