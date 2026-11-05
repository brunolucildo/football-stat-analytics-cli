import { embed } from "../ai/embed.ts";
import { openai } from "../clients/openai.ts";
import { VectorRepository, type RetrievedChunk } from "../vectorRepository.ts";
import { buildRagPrompt } from "./buildRagPrompt.ts";
import { checkRagGrounding, extractCheckableSentences, formatGroundingReport } from "./ragGrounding.ts";
import { formatSemanticReport, verifyClaims, type SemanticJudge } from "../ai/semanticVerifier.ts";

type GenerateAnswer = (prompt: string) => Promise<string>;

export async function ragAnswer(
    question: string,
    repo: VectorRepository,
    retrievedChunks?: RetrievedChunk[],
    generateAnswer?: GenerateAnswer,
    semanticJudge?: SemanticJudge
) {
    const results = retrievedChunks ?? repo.search(question, await embed(question));
    const chunks = results.map(result => `[Fonte: ${result.source}]\n${result.chunk}`);
    const prompt = buildRagPrompt(
        question,
        chunks,
    )
    const answer = generateAnswer
        ? await generateAnswer(prompt)
        : (await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0,
            messages: [{ role: "user", content: prompt}]
        })).choices[0].message.content ?? "";

    const references = results.map(result =>
        `- ${result.source} (score de relevância: ${result.score.toFixed(2)}): "${result.chunk.slice(0, 240)}${result.chunk.length > 240 ? "..." : ""}"`
    );
    let grounding = formatGroundingReport(checkRagGrounding(answer, results));

    if (semanticJudge) {
        const claims = extractCheckableSentences(answer).map((text, index) => ({ label: `afirmação ${index + 1}`, text }));
        const evidence = results.map(result => result.chunk).join("\n\n");
        const { result, verdicts } = await verifyClaims(claims, evidence, semanticJudge);
        const semantic = result.warnings?.length ? `Verificação semântica: ${result.warnings.join(" ")}` : formatSemanticReport(verdicts);
        grounding = `${grounding}\n${semantic}`;
    }

    return `${answer}\n\n${grounding}\n\nTrechos recuperados (score de relevância, não de certeza):\n${references.join("\n")}`;
}