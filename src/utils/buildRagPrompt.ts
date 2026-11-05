import type { RagExample } from "./types.ts";

export function buildRagPrompt(question: string, chunks: string[], examples?: RagExample[]) {
    const context = chunks.join("\n\n---\n\n\n");
    const fewShot = examples?.map(example => `Pergunta: ${example.q}\nResposta: ${example.a}`).join("\n\n") ?? "";

    return `
        [Instrucao]
        Responda a pergunta usando APENAS o contexto abaixo.
        Raciocine internamente sobre quais partes do contexto são relevantes e
        apresente somente a resposta final, sem exibir o raciocínio.

        Regras de fundamentação:
        - Cada afirmação deve estar apoiada em um trecho do contexto e terminar
          com a fonte entre parênteses, no formato (Fonte: nome do arquivo),
          usando exatamente o nome indicado em [Fonte: ...].
        - Não acrescente números, ações, resultados ou características que não
          estejam escritos no contexto.
        - Não use conhecimento externo nem qualifique o desempenho com adjetivos
          (como "excelente" ou "bom") que o contexto não use.
        - Se os trechos tratarem de outros atletas ou assuntos, ignore-os.
        - Se a resposta não estiver no contexto, diga: "Não encontrei informações suficientes para essa pergunta".

        ${fewShot ? `[Exemplos]\n${fewShot}` : ""}

        [Context]
        ${context}

        [Pergunta]
        ${question}
    `
}
