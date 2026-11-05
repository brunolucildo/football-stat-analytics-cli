export type Message = {
    role: "user" | "assistant" | "system"
    content: string
}

export type ValidationResult = {
    isValid: boolean;
    errors: string[];
    /** Non-blocking observations that deserve human review. */
    warnings?: string[];
};

export type RagExample = {
    q: string;
    a: string;
}