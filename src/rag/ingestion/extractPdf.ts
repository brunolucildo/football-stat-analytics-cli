import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

export async function extractPdfText(source: string): Promise<string> {
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
