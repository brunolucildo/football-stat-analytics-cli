import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { VectorRepository } from "./vectorRepository.ts";
import { ingest } from "./utils/ingest.ts";
import { PDFParse } from "pdf-parse";

const vectorRepository = new VectorRepository();

const reportsDirectory = "relatorios";
const sources = (await readdir(reportsDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
  .map((entry) => join(reportsDirectory, entry.name))
  .sort();

if (sources.length === 0) {
  throw new Error(`Nenhum arquivo PDF encontrado em ${reportsDirectory}`);
}

async function extractPdfText(source: string): Promise<string> {
  const parser = new PDFParse({ data: await readFile(source) });

  try {
    const { text } = await parser.getText();

    if (!text.trim()) {
      throw new Error(`Não foi possível extrair texto de ${source}`);
    }

    return text;
  } finally {
    await parser.destroy();
  }
}

for (const source of sources) {
  const text = await extractPdfText(source);
  await ingest(source, text, vectorRepository);
}