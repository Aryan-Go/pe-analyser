import { Elysia, t } from "elysia";
import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { ALLOWED_CATEGORIES, CATEGORY_ABBREVIATIONS, sanitizeCategory, isValidCategory } from "@/lib/categories";
import {
	ensureDir,
	createUniqueFolderName,
	folderPaths,
	listFolderSummaries,
	loadFolderSnapshot,
	mergeFolders,
	persistTrend,
	persistCategoryMapping,
} from "@/lib/storage";
import { createArtifactsFromPdf, readCsvRows, writeCsvRows, updateCsvCategories } from "@/lib/pdf/parse";
import { analyzeCsvFiles } from "@/lib/pdf/analyse";
import { loadTags, loadAutoTagRules, saveAutoTagRules, applyAutoTags, reprocessAllFolders } from "@/lib/autotag";
import { openapi } from "@elysia/openapi";

const DATA_DIR = join(process.cwd(), "data");

const app = new Elysia({ prefix: "/api" })
.use(openapi())
	.get("/categories", () => ({
		ok: true,
		categories: ALLOWED_CATEGORIES,
		catMap: CATEGORY_ABBREVIATIONS,
	}))
	.get("/folders", async () => {
		const folders = await listFolderSummaries(DATA_DIR);
		return { ok: true, folders };
	})
	.get(
		"/folders/:folderName",
		async ({ params: { folderName } }) => {
			const snapshot = await loadFolderSnapshot(DATA_DIR, folderName);
			if (!snapshot) {
				return new Response(JSON.stringify({ ok: false, error: "Folder not found." }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}
			return {
				ok: true,
				...snapshot,
				categories: ALLOWED_CATEGORIES,
			};
		},
	)
	.post("/folders", async ({ request }) => {
		try {
			const formData = await request.formData();
			const file = formData.get("file");

			if (!file || !(file instanceof File)) {
				return new Response(JSON.stringify({ ok: false, error: "No file uploaded. Use form field name 'file'." }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			const fileName = file.name || "upload.pdf";
			if (!fileName.toLowerCase().endsWith(".pdf")) {
				return new Response(JSON.stringify({ ok: false, error: "Only PDF files are supported." }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			await ensureDir(DATA_DIR);
			const folderName = await createUniqueFolderName(DATA_DIR);
			const paths = folderPaths(DATA_DIR, folderName);
			await mkdir(paths.folderPath, { recursive: true });

			const buffer = Buffer.from(await file.arrayBuffer());
			await writeFile(paths.pdfPath, buffer);

			const artifacts = await createArtifactsFromPdf(paths.pdfPath, paths.folderPath, `${folderName}.csv`);

			const rules = await loadAutoTagRules();
			if (rules.length > 0) {
				const rawRows = await readCsvRows(paths.csvPath);
				const taggedRows = applyAutoTags(rawRows, rules);
				await writeCsvRows(paths.csvPath, taggedRows);
			}

			const analysis = await analyzeCsvFiles(paths.folderPath);
			await persistTrend(DATA_DIR, folderName, analysis);
			const rows = await readCsvRows(paths.csvPath);
			await persistCategoryMapping(DATA_DIR, folderName, rows);

			return {
				ok: true,
				folderName,
				...paths,
				...artifacts,
				rows,
				analysis,
				categories: ALLOWED_CATEGORIES,
			};
		} catch (error) {
			console.error("Upload failed:", error);
			return new Response(JSON.stringify({ ok: false, error: "Failed to process the uploaded PDF." }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}
	})
	.post(
		"/folders/:folderName/categories",
		async ({ params: { folderName }, body }) => {
			const changes = Array.isArray(body?.changes) ? body.changes : [];
			const snapshot = await loadFolderSnapshot(DATA_DIR, folderName);

			if (!snapshot) {
				return new Response(JSON.stringify({ ok: false, error: "Folder not found." }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}

			const categoryMapEntries: Array<[string, string]> = [];
			for (const change of changes) {
				const cleanTxnId = String(change?.txnId ?? "").trim();
				const cleanCategory = sanitizeCategory(String(change?.category ?? ""));
				if (!cleanTxnId) continue;
				if (cleanCategory && !isValidCategory(cleanCategory)) {
					return new Response(
						JSON.stringify({ ok: false, error: `Invalid category: ${cleanCategory}` }),
						{ status: 400, headers: { "Content-Type": "application/json" } },
					);
				}
				categoryMapEntries.push([cleanTxnId, cleanCategory]);
			}

			const categoryMap = Object.fromEntries(categoryMapEntries);
			const updatedRows = await updateCsvCategories(snapshot.csvPath, categoryMap);
			await persistCategoryMapping(DATA_DIR, folderName, updatedRows);
			const analysis = await analyzeCsvFiles(snapshot.folderPath);
			await persistTrend(DATA_DIR, folderName, analysis);

			return {
				ok: true,
				updatedCount: changes.length,
				folderName,
				analysis,
				rows: updatedRows,
				categories: ALLOWED_CATEGORIES,
			};
		},
		{
			body: t.Object({
				changes: t.Array(
					t.Object({
						txnId: t.String(),
						category: t.String(),
					}),
				),
			}),
		},
	)
	.post(
		"/folders/merge",
		async ({ body }) => {
			try {
				const folders = Array.isArray(body?.folders) ? body.folders : [];
				if (!folders || folders.length !== 2) {
					return new Response(JSON.stringify({ ok: false, error: "Exactly two folder names are required." }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					});
				}

				const { folderName, snapshot } = await mergeFolders(DATA_DIR, folders as [string, string]);

				return {
					ok: true,
					...snapshot,
					categories: ALLOWED_CATEGORIES,
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : "Failed to merge folders.";
				return new Response(JSON.stringify({ ok: false, error: message }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
		},
		{
			body: t.Object({
				folders: t.Array(t.String()),
			}),
		},
	)
	.get("/tags", async () => {
		const tags = await loadTags();
		return { ok: true, tags };
	})
	.get("/autotag", async () => {
		const rules = await loadAutoTagRules();
		return { ok: true, rules };
	})
	.post(
		"/autotag",
		async ({ body }) => {
			try {
				const rules = Array.isArray(body?.rules) ? body.rules : [];

				for (const rule of rules) {
					if (!rule || typeof rule.term !== "string" || !rule.term.trim()) {
						return new Response(
							JSON.stringify({ ok: false, error: "Each rule must have a non-empty term." }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}
					if (!rule || typeof rule.tag !== "string" || !rule.tag.trim()) {
						return new Response(
							JSON.stringify({ ok: false, error: "Each rule must have a tag." }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}
				}

				await saveAutoTagRules(rules as Array<{ term: string; tag: string }>);
				const saved = await loadAutoTagRules();
				const changedCount = await reprocessAllFolders(DATA_DIR, saved);

				return { ok: true, rules: saved, reprocessedFolders: changedCount };
			} catch (error) {
				const message = error instanceof Error ? error.message : "Failed to save auto-tag rules.";
				return new Response(JSON.stringify({ ok: false, error: message }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}
		},
		{
			body: t.Object({
				rules: t.Array(
					t.Object({
						term: t.String({ minLength: 1 }),
						tag: t.String({ minLength: 1 }),
					}),
				),
			}),
		},
	);

export const App = app;
export const GET = app.fetch;
export const POST = app.fetch;
