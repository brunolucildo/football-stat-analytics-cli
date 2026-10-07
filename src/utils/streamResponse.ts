import { openai } from '../clients/openai.ts'
import type { History } from "../types.ts"
import { buildSystemPrompt } from '../prompts.ts'

export async function streamResponse( 
    history: History[], 
    system: string = buildSystemPrompt("analistaEsportivo")
){
    let fullResponse = "";

    const stream = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: system},
                ...history,
            ],
            stream: true,
        });

    for await (const chunk of stream){
        const delta = chunk.choices[0]?.delta?.content;
        if (delta){
            process.stdout.write(delta);
            fullResponse += delta;
        }
    }

    return fullResponse;
}