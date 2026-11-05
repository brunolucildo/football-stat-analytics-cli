import { mkdirSync, writeFileSync } from "node:fs";
import { blockedWords, hallucinationSignals } from "../ai/blockedWords.ts";
import { compareAthleteRuns } from "../ai/consistency.ts";
import { validateComplete } from "../ai/fullValidation.ts";
import { generateOnce } from "../ai/generate.ts";
import { openAiJudge } from "../ai/openaiJudge.ts";
import { buildSystemPrompt } from "../ai/prompts.ts";
import { regenerateWithFeedback } from "../ai/regenerate.ts";
import { validateWithRepair } from "../ai/repairResponse.ts";
import { validateInput } from "../ai/validateInput.ts";
import { parseStrictJsonObject } from "../ai/outputSchemas.ts";
import { safeRagAnswer } from "../utils/safeRagAnswer.ts";
import { VectorRepository } from "../vectorRepository.ts";
import { EVAL_CASES, RAG_EVAL_CASES } from "./cases.ts";

/**
 * Live evaluation: runs the real model against the evaluation cases and reports
 * how often the answers pass the validation pipeline. It calls the OpenAI API
 * (about 3 requests per run), so it is never part of `npm test`.
 */
const runs = Number(process.env.EVAL_RUNS ?? 3);

type RunResult = {
    firstAttemptValid: boolean;
    firstAttemptErrors: string[];
    repairs: number;
    finalValid: boolean;
    finalErrors: string[];
    checkError: string | null;
    response: string;
};

const caseSummaries = [];

for (const evalCase of EVAL_CASES) {
    const inputResult = validateInput(evalCase.input, blockedWords);

    if (evalCase.expectBlocked) {
        caseSummaries.push({
            id: evalCase.id,
            persona: evalCase.persona,
            runs: 0,
            passed: !inputResult.isValid,
            note: inputResult.isValid ? "entrada não foi bloqueada" : `bloqueada na validação de entrada: ${inputResult.errors.join(", ")}`
        });
        continue;
    }

    const system = buildSystemPrompt(evalCase.persona);
    const history = [{ role: "user" as const, content: evalCase.input }];
    const results: RunResult[] = [];

    for (let run = 0; run < runs; run++) {
        const first = await generateOnce(system, history);
        let firstAttempt: { valid: boolean; errors: string[] } | undefined;

        const outcome = await validateWithRepair({
            response: first,
            validate: async response => {
                const validation = await validateComplete(response, {
                    persona: evalCase.persona,
                    userEvidence: evalCase.input,
                    hallucinationSignals,
                    judge: openAiJudge
                });
                firstAttempt ??= { valid: validation.isValid, errors: validation.errors };
                return validation;
            },
            regenerate: (previous, errors) => regenerateWithFeedback(system, history, previous, errors)
        });

        const answer = parseStrictJsonObject(outcome.response).value;
        results.push({
            firstAttemptValid: firstAttempt?.valid ?? false,
            firstAttemptErrors: firstAttempt?.errors ?? [],
            repairs: outcome.repairs,
            finalValid: outcome.validation.isValid,
            finalErrors: outcome.validation.errors,
            checkError: outcome.validation.isValid && answer && evalCase.check ? evalCase.check(answer) : null,
            response: outcome.response
        });
    }

    const finalResponses = results.filter(result => result.finalValid).map(result => result.response);
    caseSummaries.push({
        id: evalCase.id,
        persona: evalCase.persona,
        runs,
        firstAttemptValid: results.filter(result => result.firstAttemptValid).length,
        validAfterRepair: results.filter(result => result.finalValid).length,
        postConditionFailures: results.filter(result => result.checkError).length,
        consistency: evalCase.persona === "analistaEsportivo" ? compareAthleteRuns(finalResponses, evalCase.input) : undefined,
        results
    });
}

const ragSummaries = [];
const vectorDb = process.env.VECTOR_DB_PATH ?? "vector_db_capstone.db";
const repository = new VectorRepository(vectorDb);
try {
    for (const ragCase of RAG_EVAL_CASES) {
        const answer = await safeRagAnswer(ragCase.question, repository, [], { semanticJudge: openAiJudge });
        const refused = /Não encontrei informações suficientes/.test(answer);
        ragSummaries.push({
            id: ragCase.id,
            question: ragCase.question,
            expectRefusal: ragCase.expectRefusal,
            refused,
            passed: refused === ragCase.expectRefusal,
            // the retrieved excerpts come from private reports, so only the answer and the checks are stored
            answer: answer.split("\n\nTrechos recuperados")[0]
        });
    }
} finally {
    repository.close();
}

const report = { date: new Date().toISOString(), model: "gpt-4o-mini", runsPerCase: runs, vectorDb, cases: caseSummaries, rag: ragSummaries };

mkdirSync("eval-results", { recursive: true });
const file = `eval-results/live-eval-${report.date.slice(0, 19).replace(/[:T]/g, "-")}.json`;
writeFileSync(file, JSON.stringify(report, null, 2));

console.log(`\nAvaliação ao vivo (${runs} execuções por caso) — detalhes em ${file}\n`);
console.table(caseSummaries.map(({ id, runs: n, firstAttemptValid, validAfterRepair, postConditionFailures, passed, consistency }: any) => ({
    caso: id,
    execucoes: n,
    validas_1a_tentativa: firstAttemptValid ?? "-",
    validas_apos_reparo: validAfterRepair ?? "-",
    falhas_pos_condicao: postConditionFailures ?? "-",
    bloqueio_ok: passed ?? "-",
    scores_identicos: consistency ? consistency.identicalScores : "-",
    dispersao_maxima: consistency ? consistency.maxSpread : "-"
})));
console.table(ragSummaries.map(({ id, expectRefusal, refused, passed }) => ({ caso: id, esperava_recusa: expectRefusal, recusou: refused, ok: passed })));
