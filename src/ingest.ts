import { readFile } from "node:fs/promises";
import { VectorRepository } from "./vectorRepository.ts";
import { ingest } from "./utils/ingest.ts";
import { PDFParse } from "pdf-parse";

const vectorRepository = new VectorRepository()

const sources = [
  "relatorios/Postpartido -  Nil Coch.pdf",
  "relatorios/Postpartido - Kevin Kelsy.pdf",
];

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