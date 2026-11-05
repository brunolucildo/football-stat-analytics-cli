import { mkdirSync, writeFileSync } from "node:fs";
import { compareAthleteRuns } from "../ai/consistency.ts";
import { generateConsensus } from "../ai/consensusGenerate.ts";
import { generateOnce } from "../ai/generate.ts";
import { buildSystemPrompt } from "../ai/prompts.ts";
import { parseStrictJsonObject, validateAthleteAssessment } from "../ai/outputSchemas.ts";
import { EVAL_CASES } from "./cases.ts";

/**
 * Consistency experiment: the same athlete input is answered many times in three modes and the
 * spread of the scores is measured. Only the deterministic validation is applied (no semantic
 * verifier, no repair), so the cost is just generation. It calls the OpenAI API.
 */
const runs = Number(process.env.EVAL_RUNS ?? 8);
const athleteCases = EVAL_CASES.filter(evalCase => evalCase.persona === "analistaEsportivo" && !evalCase.expectBlocked);
const system = buildSystemPrompt("analistaEsportivo");

const modes = {
    "temperature 0, sem seed": (input: string) => generateOnce(system, [{ role: "user", content: input }], 0, false),
    "temperature 0, com seed": (input: string) => generateOnce(system, [{ role: "user", content: input }], 0, true),
    "consenso T=0.5 (mediana de 3)": async (input: string) =>
        (await generateConsensus(system, [{ role: "user", content: input }], input, 3, 0.5)).response,
    "consenso T=0.2 (mediana de 3)": async (input: string) =>
        (await generateConsensus(system, [{ role: "user", content: input }], input, 3, 0.2)).response
} as const;

function scoreVector(response: string): string {
    const parsed = parseStrictJsonObject(response).value ?? {};
    return ["pace", "shot", "pass", "dribble", "defence", "physic", "overall"]
        .map(attribute => (parsed[attribute] as { score?: number | null } | undefined)?.score ?? "null")
        .join(",");
}

const rows = [];
for (const evalCase of athleteCases) {
    for (const [mode, generate] of Object.entries(modes)) {
        const responses: string[] = [];
        for (let run = 0; run < runs; run++) {
            responses.push(await generate(evalCase.input));
        }

        const valid = responses.filter(response => validateAthleteAssessment(response, evalCase.input).isValid);
        const vectors = valid.map(scoreVector);
        const counts = new Map<string, number>();
        vectors.forEach(vector => counts.set(vector, (counts.get(vector) ?? 0) + 1));
        const modal = Math.max(0, ...counts.values());
        const report = compareAthleteRuns(valid, evalCase.input);

        rows.push({
            caso: evalCase.id,
            modo: mode,
            execucoes: runs,
            validas: valid.length,
            vetores_distintos: counts.size,
            parcela_do_vetor_mais_comum: valid.length ? `${Math.round((modal / valid.length) * 100)}%` : "-",
            dispersao_maxima: report.maxSpread
        });
    }
}

const report = { date: new Date().toISOString(), model: "gpt-4o-mini", runsPerCaseAndMode: runs, rows };
mkdirSync("eval-results", { recursive: true });
const file = `eval-results/consistency-${report.date.slice(0, 19).replace(/[:T]/g, "-")}.json`;
writeFileSync(file, JSON.stringify(report, null, 2));

console.log(`\nExperimento de consistência (${runs} execuções por caso e modo) — ${file}\n`);
console.table(rows);
