import { mkdirSync, writeFileSync } from "node:fs";
import { openAiJudge } from "../ai/openaiJudge.ts";
import { verifyClaims } from "../ai/semanticVerifier.ts";
import { CALIBRATION_SET, EVIDENCES } from "./calibrationSet.ts";
import { scoreCalibration, type CalibrationOutcome, type Decision } from "./calibrationMetrics.ts";

/**
 * Measures the semantic verifier against hand-labelled statements. Statements that share
 * evidence are sent together, as in production. It calls the OpenAI API (3 requests per
 * repetition), so it is never part of `npm test`.
 */
const repetitions = Number(process.env.EVAL_RUNS ?? 3);
const evidenceIds = Object.keys(EVIDENCES) as (keyof typeof EVIDENCES)[];

const perRepetition = [];
const allOutcomes: CalibrationOutcome[][] = [];

for (let repetition = 0; repetition < repetitions; repetition++) {
    const outcomes: CalibrationOutcome[] = [];

    for (const evidenceId of evidenceIds) {
        const items = CALIBRATION_SET.filter(item => item.evidenceId === evidenceId);
        const { verdicts } = await verifyClaims(
            items.map(item => ({ label: item.id, text: item.claim })),
            EVIDENCES[evidenceId],
            openAiJudge
        );

        items.forEach((item, index) => {
            const verdict = verdicts[index]?.verdict;
            const decision: Decision = verdict === undefined
                ? "unavailable"
                : verdict === "unsupported" || verdict === "contradicted" ? "reject" : "accept";
            outcomes.push({ id: item.id, expected: item.expected, decision });
        });
    }

    allOutcomes.push(outcomes);
    perRepetition.push({ repetition: repetition + 1, ...scoreCalibration(outcomes) });
}

const pooled = scoreCalibration(allOutcomes.flat());
const report = {
    date: new Date().toISOString(),
    model: "gpt-4o-mini",
    items: CALIBRATION_SET.length,
    repetitions,
    pooled,
    perRepetition
};

mkdirSync("eval-results", { recursive: true });
const file = `eval-results/judge-calibration-${report.date.slice(0, 19).replace(/[:T]/g, "-")}.json`;
writeFileSync(file, JSON.stringify(report, null, 2));

const pct = (value: number | null) => (value === null ? "-" : `${(value * 100).toFixed(1)}%`);
console.log(`\nCalibração do verificador: ${CALIBRATION_SET.length} afirmações rotuladas × ${repetitions} repetições — ${file}\n`);
console.table([...perRepetition, { repetition: "total", ...pooled }].map(row => ({
    repeticao: row.repetition,
    rejeitou_certo: row.truePositives,
    deixou_passar: row.falseNegatives,
    aceitou_certo: row.trueNegatives,
    bloqueou_correta: row.falsePositives,
    indisponivel: row.unavailable,
    recall_rejeicao: pct(row.rejectionRecall),
    taxa_falsa_rejeicao: pct(row.falseRejectionRate),
    acuracia: pct(row.accuracy)
})));
if (pooled.misclassified.length > 0) {
    const counts = new Map<string, number>();
    pooled.misclassified.forEach(id => counts.set(id, (counts.get(id) ?? 0) + 1));
    console.log("Itens classificados errado (id: vezes):", [...counts].map(([id, n]) => `${id}: ${n}`).join(", "));
}
