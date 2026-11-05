import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { compareAthleteRuns } from "../src/ai/consistency.ts";
import { validateWithRepair } from "../src/ai/repairResponse.ts";
import { validateAthleteAssessment } from "../src/ai/outputSchemas.ts";
import { ATHLETE_INPUT, athleteWith, validAthleteAssessment } from "./fixtures/cases.js";

const json = value => JSON.stringify(value);
const validate = response => validateAthleteAssessment(response, ATHLETE_INPUT);

describe("reparo de resposta rejeitada", () => {
    it("não regenera quando a primeira resposta é válida", async () => {
        let regenerations = 0;

        const outcome = await validateWithRepair({
            response: json(validAthleteAssessment()),
            validate,
            regenerate: async () => {
                regenerations += 1;
                return "";
            }
        });

        assert.equal(outcome.validation.isValid, true);
        assert.equal(outcome.repairs, 0);
        assert.equal(regenerations, 0);
    });

    it("regenera uma vez com os erros como feedback e aceita a versão corrigida", async () => {
        const invalid = json(athleteWith("dribble", { justification: "Um desempenho sólido nos dribles." }));
        let feedback = [];

        const outcome = await validateWithRepair({
            response: invalid,
            validate,
            regenerate: async (previous, errors) => {
                assert.equal(previous, invalid);
                feedback = errors;
                return json(validAthleteAssessment());
            }
        });

        assert.match(feedback.join(" "), /dribble: termos valorativos/);
        assert.equal(outcome.validation.isValid, true);
        assert.equal(outcome.repairs, 1);
    });

    it("limita as tentativas e devolve a resposta ainda inválida", async () => {
        const invalid = json(athleteWith("dribble", { justification: "Um desempenho sólido nos dribles." }));
        let regenerations = 0;

        const outcome = await validateWithRepair({
            response: invalid,
            validate,
            maxRepairs: 2,
            regenerate: async () => {
                regenerations += 1;
                return invalid;
            }
        });

        assert.equal(outcome.validation.isValid, false);
        assert.equal(outcome.repairs, 2);
        assert.equal(regenerations, 2);
    });

    it("usa uma única tentativa de reparo por padrão", async () => {
        let regenerations = 0;

        await validateWithRepair({
            response: "texto que não é JSON",
            validate,
            regenerate: async () => {
                regenerations += 1;
                return "ainda não é JSON";
            }
        });

        assert.equal(regenerations, 1);
    });
});

describe("consistência entre execuções", () => {
    it("reconhece execuções com o mesmo vetor de scores mesmo com justificativas diferentes", () => {
        const first = validAthleteAssessment();
        const second = athleteWith("pace", { justification: "Sete acelerações registradas em transições ofensivas." });

        const report = compareAthleteRuns([json(first), json(second), json(first)], ATHLETE_INPUT);

        assert.equal(report.runs, 3);
        assert.equal(report.validRuns, 3);
        assert.equal(report.identicalScores, true);
        assert.equal(report.maxSpread, 0);
    });

    it("mede a dispersão dos scores por atributo", () => {
        const report = compareAthleteRuns([
            json(validAthleteAssessment()),
            json(athleteWith("shot", { score: 76 })),
            json(athleteWith("shot", { score: 70 }))
        ], ATHLETE_INPUT);

        assert.equal(report.identicalScores, false);
        assert.equal(report.spreadByAttribute.shot, 6);
        assert.equal(report.spreadByAttribute.pace, 0);
        assert.equal(report.maxSpread, 6);
    });

    it("exclui das métricas as execuções inválidas e as contabiliza", () => {
        const report = compareAthleteRuns([
            json(validAthleteAssessment()),
            "não é JSON",
            json(athleteWith("dribble", { justification: "Dribles excelentes." }))
        ], ATHLETE_INPUT);

        assert.equal(report.runs, 3);
        assert.equal(report.validRuns, 1);
        assert.equal(report.identicalScores, true);
    });

    it("não declara consistência quando nenhuma execução é válida", () => {
        const report = compareAthleteRuns(["x", "y"], ATHLETE_INPUT);

        assert.equal(report.validRuns, 0);
        assert.equal(report.identicalScores, false);
    });
});
