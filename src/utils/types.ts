export type Message = {
    role: "user" | "assistant" | "system"
    content: string
}

export interface IRepository<T> {
    save(sessionId: string, data: T): void;
    load(sessionId: string): T[];
} 