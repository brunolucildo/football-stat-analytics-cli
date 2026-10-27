import { embed } from "../ai/embed.ts";
import { VectorRepository } from "../vectorRepository.ts";

const MAX_CHUNKS = 150

export async function ragDebug(question: string, repo:VectorRepository) {
    const questionEmbeddings = await embed(question)
    const result = repo.search(question, questionEmbeddings)

    console.log("\n---------- Chunks Recuperados ----------")
    result.forEach((r, i) => {
        console.log(`\n[${i + 1}] Score: ${r.score.toFixed(2)}`)
        console.log(`${r.chunk.slice(0,MAX_CHUNKS)}${r.chunk.length > MAX_CHUNKS ? "..." : ""}`)
    })
}