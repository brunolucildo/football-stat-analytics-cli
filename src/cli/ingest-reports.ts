import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { ingest } from "../rag/ingestion/ingest.ts";
import { extractPdfText } from "../rag/ingestion/extractPdf.ts";
import { VectorRepository } from "../rag/retrieval/vectorRepository.ts";

const vectorRepository = new VectorRepository();

const reportsDirectory = "relatorios";
const sources = (await readdir(reportsDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
  .map((entry) => join(reportsDirectory, entry.name))
  .sort();

if (sources.length === 0) {
  throw new Error(`Nenhum arquivo PDF encontrado em ${reportsDirectory}`);
}

for (const source of sources) {
  const text = await extractPdfText(source);
  await ingest(source, text, vectorRepository);
}