import { openai } from "../clients/openai.ts";
import type { Message } from "../utils/types.ts";
import { withRetry } from "../utils/withRetry.ts";

/** Fixed seed: makes repeated requests more reproducible (the API treats it as best effort). */
export const GENERATION_SEED = 42;

/** Non-streaming completion, used by the evaluation harness. */
export async function generateOnce(
    system: string,
    history: Message[],
    temperature = 0,
    useSeed = true
): Promise<string> {
    return withRetry(async () => {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature,
            ...(useSeed ? { seed: GENERATION_SEED } : {}),
            messages: [{ role: "system", content: system }, ...history]
        });
        return response.choices[0].message?.content ?? "";
    });
}

/** Several independent answers to the same input in a single request. */
export async function generateSamples(
    system: string,
    history: Message[],
    samples: number,
    temperature: number
): Promise<string[]> {
    return withRetry(async () => {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature,
            n: samples,
            seed: GENERATION_SEED,
            messages: [{ role: "system", content: system }, ...history]
        });
        return response.choices.map(choice => choice.message?.content ?? "");
    });
}
