import { VectorRepository } from "../vectorRepository.ts";
import { embed } from "../ai/embed.ts";
import { translateReportToPortuguese } from "../ai/translateReport.ts";
import { chunkText } from "./chunkText.ts";

export async function ingest(
    source: string,
    text: string,
    repo: VectorRepository,
    dependencies: {
        translate?: typeof translateReportToPortuguese;
        embedChunk?: typeof embed;
    } = {}
) {
    const translate = dependencies.translate ?? translateReportToPortuguese;
    const embedChunk = dependencies.embedChunk ?? embed;
    const translatedText = await translate(text);
    const chunks = chunkText(translatedText);

    for (const chunk of chunks) {
        const embeddings = await embedChunk(chunk);
        repo.insert(source, chunk, embeddings);
    }

    console.log(`Ingested ${chunks.length} chunks from source: ${source}`);
}