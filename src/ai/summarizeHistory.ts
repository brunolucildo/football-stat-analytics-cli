import { openai } from "../clients/openai.ts";
import type { Message } from "../utils/types.ts";

export async function summarizeHistory(messages: Message[]): Promise<string> {

    const systemPrompt = `Você é um assistente que resume o histórico de mensagens entre o usuário e o assistente. 
                            O resumo deve ser conciso, objetivo e destacar os pontos principais das interações. 
                            Limite a no máximo 200 palavras.`;

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {role: "system", content: systemPrompt},
            ...messages
        ], 
    });

    return response.choices[0].message?.content ?? "";
}