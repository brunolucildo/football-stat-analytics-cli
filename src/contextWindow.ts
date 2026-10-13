import type { Message } from "./utils/types.ts"

export class ContextWindow {
    private history: Message[] = [];

    constructor(private readonly maxHistoryLength: number = 3) {}

    addUserMessage(content: string) {
        this.history.push({ role: "user", content });
    }

    addAssistantMessage(content: string) {
        this.history.push({ role: "assistant", content });
    }
    
    getMessages(){
        const limit = this.maxHistoryLength * 2; // Each interaction consists of a user and an assistant message

        if (this.history.length > limit) {
            this.history = this.history.slice(-limit);
        }

        return this.history;
    }
}    