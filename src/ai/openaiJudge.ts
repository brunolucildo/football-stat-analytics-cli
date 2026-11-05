import { openai } from "../clients/openai.ts";
import { withRetry } from "../utils/withRetry.ts";
import type { SemanticJudge } from "./semanticVerifier.ts";

export const openAiJudge: SemanticJudge = prompt =>
    withRetry(async () => {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }]
        });
        return response.choices[0].message?.content ?? "";
    });

/** The semantic check costs one extra request per answer; SEMANTIC_VERIFY=off disables it. */
export function semanticVerificationEnabled(): boolean {
    return (process.env.SEMANTIC_VERIFY ?? "on").toLowerCase() !== "off";
}
