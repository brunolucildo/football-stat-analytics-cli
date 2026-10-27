import { VectorRepository } from "../vectorRepository.ts";
import { embed } from "../ai/embed.ts";
import { translateReportToPortuguese } from "../ai/translateReport.ts";
import { chunkText } from "./chunkText.ts";

export async function ingest(source: string, text: string, repo: VectorRepository) {
    const translatedText = await translateReportToPortuguese(text);
    const chunks = chunkText(translatedText);

    for (const chunk of chunks) {
        const embeddings = await embed(chunk);
        repo.insert(source, chunk, embeddings);
    }

    console.log(`Ingested ${chunks.length} chunks from source: ${source}`);
}