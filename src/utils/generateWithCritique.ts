
import { openai } from "../clients/openai.ts"
import { withRetry } from "./withRetry.ts";

export async function generateWithCritique(
    system: string,
    prompt: string,    
): Promise<string> {
    // Step 1: Generate initial response
    const draft = await withRetry(async () => {
            const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {role: "system", content: system},
                {role: "user", content: prompt},
            ],
        });
        return response.choices[0].message?.content ?? "";
    });

    // Step 2: Generate critique
    const critique = await withRetry(async () => {
            const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {role: "system", content: `identifique em uma frase pontos de melhoria na resposta. se tiver boa diga "approved", se não diga o que pode/deve ser melhorado. `},
                {role: "user", content: draft},
            ],
        });
        return response.choices[0].message?.content ?? "";
    });

    // Step 2: Generate final response base on critique
    if (critique.toLocaleLowerCase() === "approved"){
        return draft;
    }

    return await withRetry(async () => {
            const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {role: "system", content: `Reescreva a resposta anterior considerando a considerando a crítica e/ou melhorias recebidas.`},
                {role: "user", content: `Resposta anterior: ${draft}\n\nCríticas/Melhorias: ${critique}`},
            ],
        });
        return response.choices[0].message?.content ?? "";
    }); 
}