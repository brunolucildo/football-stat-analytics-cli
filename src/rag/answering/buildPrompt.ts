import type { RagExample } from "./types.ts";

export function buildRagPrompt(question: string, chunks: string[], examples?: RagExample[]) {
    const context = chunks.join("\n\n---\n\n\n");
    const fewShot = examples?.map(example => `Pergunta: ${example.q}\nResposta: ${example.a}`).join("\n\n") ?? "";

    return `
        [Instrucao]
        Responda a primeira pergunta usando APENAS o contexto abaixo
        Primeiro, raciocine sobre quais partes do contexto são relevantes.
        Segundo, formule uma reposta final.
        Se a resposta não estiver no contexto, diga, "Não encontrei informações suficientes para essa pergunta"

        ${fewShot ? `[Exemplos]\n${fewShot}` : ""}

        [Context]
        ${context}

        [Pergunta]
        ${question}
    `
}