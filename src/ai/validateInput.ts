import type { ValidationResult } from "../utils/types.ts";

export function validateInput(
    input: string,
    blocked: string[],
    maxLength = 1000
): ValidationResult {
    const errors: string[] = [];

    if (!input.trim()) {
        errors.push("Input cannot be empty or only whitespace.");
    }

    if (blocked.some(blockedWord => input.includes(blockedWord))) {
        errors.push("Input contains blocked words.");
    }  
    
    if (input.length > maxLength) {
        errors.push(`Input exceeds maximum length of ${maxLength} characters.`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}