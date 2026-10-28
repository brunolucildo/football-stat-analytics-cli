import { OpenAI } from "openai";

export async function withRetry<T>(fn: () => Promise<T>, retries: number = 3, delayInSeconds: number = 1): Promise<T> {
    if (!Number.isInteger(retries) || retries < 1) {
        throw new RangeError("Retry count must be a positive integer.");
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const isRetryable =
                error instanceof OpenAI.RateLimitError ||
                error instanceof OpenAI.APIConnectionError ||
                error instanceof OpenAI.APIConnectionTimeoutError ||
                error instanceof OpenAI.APIError &&
                (error.status === 429 || error.status >= 500);

            if (!isRetryable || attempt === retries) {
                throw error;
            }

            const exponentialDelay = Math.pow(2, attempt) * (delayInSeconds * 1000);
            console.warn(`Attempt ${attempt} failed. Retrying in ${exponentialDelay}ms...`, error);

            await new Promise(resolve => setTimeout(resolve, exponentialDelay));
        }
    }
    throw new Error("Unreachable code: all retry attempts have been exhausted.");
}