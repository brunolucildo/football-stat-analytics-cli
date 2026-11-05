import { ContextWindow } from "../contextWindow.ts";
import { EstimateTokens } from "../utils/estimateTokens.ts";
import type { Message } from "../utils/types.ts";
import { summarizeHistory } from "./summarizeHistory.ts";

const MAX_TOKENS = 4096;

export async function maybeCompress(
    contextWindow: ContextWindow,
    summarize = summarizeHistory
): Promise<Message[]> {
    const currentTokenCount = EstimateTokens(contextWindow);
    if (currentTokenCount < MAX_TOKENS) {
        return contextWindow.getMessages();
    }

    const half = Math.floor(contextWindow.getMessages().length / 2);
    const messagesToKeep = contextWindow.getMessages().slice(half);
    const messagesToSummarize = contextWindow.getMessages().slice(0, half);

    const summary = await summarize(messagesToSummarize);
    
    return [
        { role: "user", content: `Resumo do histórico anterior: ${summary}` },
        { role: "assistant", content: "Continuando a conversa com base no resumo acima." },
        ...messagesToKeep
    ];
}