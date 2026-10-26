import { embed } from "../ai/embed.ts";
import { openai } from "../clients/openai.ts";
import { VectorRepository } from "../vectorRepository.ts";
import { buildRagPrompt } from "./buildRagPrompt.ts";

export async function ragAnswer(question: string, repo: VectorRepository) {

    //1. embeds a pergunta
    const questionEmbeddings = await embed(question)

    //2. busca o chunks mais relevantes
    const result = repo.search(
        questionEmbeddings
    )
    const chunks = result.map(r => r.chunk)

    //3. monta o prompt e chama o modelo
    const prompt = buildRagPrompt(
        question,chunks,
    )
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt}]
    })

    //4. retorna a resposta final
    return response.choices[0].message.content ?? "";
    
}