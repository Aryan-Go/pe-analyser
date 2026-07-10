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
	persistTrend,
	persistCategoryMapping,
} from "@/lib/storage";
import { createArtifactsFromPdf, readCsvRows, updateCsvCategories } from "@/lib/pdf/parse";
import { analyzeCsvFiles } from "@/lib/pdf/analyse";
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
	);

export const App = app;
export const GET = app.fetch;
export const POST = app.fetch;
