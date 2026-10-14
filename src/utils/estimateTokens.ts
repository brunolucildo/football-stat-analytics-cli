import { ContextWindow } from "../contextWindow.ts";

export function EstimateTokens(contextWindow: ContextWindow): number {
    const averageTokenLength = 3;   
    
    return contextWindow.getMessages().reduce((totalTokens, message) => {
        const messageLength = message.content.length;
        const messageTokens = Math.ceil(messageLength / averageTokenLength);
        return totalTokens + messageTokens;
    }, 0);
}