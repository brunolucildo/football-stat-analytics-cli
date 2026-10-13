import { ContextWindow } from "../contextWindow.ts";
import { generateWithCritique } from "./generateWithCritique.ts";

export async function summarizeHistory(contextWindow: ContextWindow): Promise<string> {
    
    const systemPrompt = `Você é um assistente que resume o histórico de mensagens entre o usuário e o assistente. 
                            O resumo deve ser conciso, objetivo e destacar os pontos principais das interações. 
                            Limite a no máximo 200 palavras.`;

    const summary = await generateWithCritique(systemPrompt, contextWindow);   

    return summary;
}