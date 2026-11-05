import { PDFParse } from "pdf-parse";

export async function extractPdfText(source: string, data: Uint8Array): Promise<string> {
    const parser = new PDFParse({ data });

    try {
        const { text } = await parser.getText();
        const extractedText = text
            .replace(/(?:^|\n)\s*--\s*\d+\s+of\s+\d+\s*--\s*(?=\n|$)/g, "")
            .trim();

        if (!extractedText) {
            throw new Error(`Não foi possível extrair texto de ${source}`);
        }

        return extractedText;
    } finally {
        await parser.destroy();
    }
}
