import type { Message } from "./utils/types.ts"

export class ContextWindow {
    private history: Message[] = [];
    private maxHistoryLength: number;

    constructor(maxHistoryLength: number = 100) {
        this.maxHistoryLength = maxHistoryLength;
    }

    addUserMessage(content: string): Message {
        const message : Message = { role: "user", content };
        this.history.push(message);
        this.slidingWindow();
        return message;
    }

    addAssistantMessage(content: string): Message {
        const message : Message = { role: "assistant", content };
        this.history.push(message);
        this.slidingWindow();
        return message;
    }   
    
    restore(role: Message["role"], content: string) {
        this.history.push({role, content});
    }

    getMessages(){        
        return this.history;
    }

    private slidingWindow(){
        const limit = this.maxHistoryLength * 2; // Each interaction consists of a user and an assistant message

        if (this.history.length > limit) {
            this.history = this.history.slice(-limit);
        }

        return this.history;
    }
}    