import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { VectorRepository } from "./vectorRepository.ts";
import { extractPdfText } from "./utils/extractPdfText.ts";
import { ingest } from "./utils/ingest.ts";

const vectorRepository = new VectorRepository(
  process.env.VECTOR_DB_PATH ?? "vector_db.db"
);

const reportsDirectory = "relatorios";
const sources = (await readdir(reportsDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
  .map((entry) => join(reportsDirectory, entry.name))
  .sort();

if (sources.length === 0) {
  throw new Error(`Nenhum arquivo PDF encontrado em ${reportsDirectory}`);
}

for (const source of sources) {
  const text = await extractPdfText(source, await readFile(source));
  await ingest(source, text, vectorRepository);
}