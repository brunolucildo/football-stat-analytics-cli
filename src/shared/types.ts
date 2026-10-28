export type Message = {
    role: "user" | "assistant" | "system"
    content: string
}

export type ValidationResult = {
    isValid: boolean;
    errors: string[];
};
