import { openai } from "../clients/openai.ts";
import type { Message } from "../utils/types.ts";
import { withRetry } from "../utils/withRetry.ts";

/** Non-streaming completion, used by the evaluation harness. */
export async function generateOnce(system: string, history: Message[], temperature = 0): Promise<string> {
    return withRetry(async () => {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature,
            messages: [{ role: "system", content: system }, ...history]
        });
        return response.choices[0].message?.content ?? "";
    });
}
