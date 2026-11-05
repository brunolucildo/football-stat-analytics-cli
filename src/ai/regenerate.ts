import { openai } from "../clients/openai.ts";
import type { Message } from "../utils/types.ts";
import { withRetry } from "../utils/withRetry.ts";

export async function regenerateWithFeedback(
    system: string,
    history: Message[],
    previousResponse: string,
    errors: string[]
): Promise<string> {
    const feedback = [
        "A resposta anterior foi rejeitada pela validação automática pelos motivos abaixo:",
        ...errors.map(error => `- ${error}`),
        "",
        "Reescreva a resposta corrigindo exatamente esses problemas, usando somente os dados fornecidos",
        "e mantendo o formato exigido pela política. Retorne apenas a resposta corrigida."
    ].join("\n");

    return withRetry(async () => {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            messages: [
                { role: "system", content: system },
                ...history,
                { role: "assistant", content: previousResponse },
                { role: "user", content: feedback }
            ]
        });
        return response.choices[0].message?.content ?? "";
    });
}
