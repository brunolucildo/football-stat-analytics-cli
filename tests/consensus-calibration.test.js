import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { aggregateAthleteSamples } from "../src/ai/consensus.ts";
import { validateAthleteAssessment } from "../src/ai/outputSchemas.ts";
import { CALIBRATION_SET, EVIDENCES } from "../src/eval/calibrationSet.ts";
import { scoreCalibration } from "../src/eval/calibrationMetrics.ts";
import { ATHLETE_INPUT, athleteWith, validAthleteAssessment } from "./fixtures/cases.js";

const json = value => JSON.stringify(value);

// Valid answer in which only the given attributes have a different score.
function withScores(scores) {
    const assessment = validAthleteAssessment();
    for (const [attribute, score] of Object.entries(scores)) {
        assessment[attribute] = { ...assessment[attribute], score };
    }
    return assessment;
}

function allScores(value, overrides = {}) {
    return withScores({ pace: value, shot: value, pass: value, dribble: value, defence: value, physic: value, overall: value, ...overrides });
}

describe("consenso entre amostras", () => {
    it("usa a mediana de cada atributo e mantém a justificativa da amostra escolhida", () => {
        const samples = [60, 70, 80].map(score => {
            const sample = withScores({ pace: score, overall: 64 });
            sample.pace.justification = `Registrou 7 acelerações (versão ${{ 60: "alfa", 70: "beta", 80: "gama" }[score]}).`;
            return json(sample);
        });

        const result = aggregateAthleteSamples(samples, ATHLETE_INPUT);
        const final = JSON.parse(result.response);

        assert.equal(result.aggregated, true);
        assert.equal(final.pace.score, 70);
        assert.match(final.pace.justification, /versão beta/);
        assert.equal(result.spread.pace, 20);
        assert.equal(result.spread.shot, 0);
        assert.equal(validateAthleteAssessment(result.response, ATHLETE_INPUT).isValid, true);
    });

    it("exclui amostras que falham na validação e usa a menor mediana quando restam duas", () => {
        const valid = [withScores({ pace: 60 }), withScores({ pace: 70 })].map(json);
        const invalid = json(athleteWith("dribble", { justification: "Um desempenho sólido nos dribles." }));

        const result = aggregateAthleteSamples([...valid, invalid], ATHLETE_INPUT);

        assert.equal(result.totalSamples, 3);
        assert.equal(result.validSamples, 2);
        assert.equal(JSON.parse(result.response).pace.score, 60);
    });

    it("mantém a única amostra válida sem agregar", () => {
        const only = json(validAthleteAssessment());

        const result = aggregateAthleteSamples(["não é JSON", only], ATHLETE_INPUT);

        assert.equal(result.aggregated, false);
        assert.equal(result.validSamples, 1);
        assert.equal(result.response, only);
    });

    it("devolve a primeira amostra quando nenhuma é válida, para que o reparo trate o erro", () => {
        const result = aggregateAthleteSamples(["a", "b", "c"], ATHLETE_INPUT);

        assert.equal(result.validSamples, 0);
        assert.equal(result.aggregated, false);
        assert.equal(result.response, "a");
    });

    it("considera o atributo sem evidência quando a maioria das amostras o declara assim", () => {
        const insufficient = { score: null, justification: "Não há evidências suficientes para avaliar este atributo." };
        const samples = [
            { ...validAthleteAssessment(), physic: insufficient },
            { ...validAthleteAssessment(), physic: insufficient },
            validAthleteAssessment()
        ].map(json);

        const final = JSON.parse(aggregateAthleteSamples(samples, ATHLETE_INPUT).response);

        assert.equal(final.physic.score, null);
    });

    it("não deixa a minoria sem evidência anular um score numérico", () => {
        const insufficient = { score: null, justification: "Não há evidências suficientes para avaliar este atributo." };
        const samples = [
            { ...validAthleteAssessment(), physic: insufficient },
            validAthleteAssessment(),
            validAthleteAssessment()
        ].map(json);

        assert.equal(JSON.parse(aggregateAthleteSamples(samples, ATHLETE_INPUT).response).physic.score, 60);
    });

    it("mantém o Overall dentro do intervalo dos atributos resultantes", () => {
        const samples = [
            allScores(50, { pace: 99, overall: 99 }),
            allScores(50, { shot: 99, overall: 99 }),
            allScores(50, { pass: 99, overall: 50 })
        ].map(json);

        const result = aggregateAthleteSamples(samples, ATHLETE_INPUT);
        const final = JSON.parse(result.response);

        assert.equal(final.pace.score, 50);
        assert.equal(final.overall.score, 50);
        assert.equal(validateAthleteAssessment(result.response, ATHLETE_INPUT).isValid, true);
    });

    it("reduz a dispersão: o resultado é igual para amostras em ordem diferente", () => {
        const samples = [60, 70, 80].map(score => json(withScores({ shot: score, overall: 66 })));

        const forward = aggregateAthleteSamples(samples, ATHLETE_INPUT).response;
        const backward = aggregateAthleteSamples([...samples].reverse(), ATHLETE_INPUT).response;

        assert.equal(forward, backward);
    });
});

describe("calibração do verificador semântico", () => {
    it("conta acertos, falhas e itens indisponíveis e calcula as taxas", () => {
        const metrics = scoreCalibration([
            { id: "1", expected: "reject", decision: "reject" },
            { id: "2", expected: "reject", decision: "reject" },
            { id: "3", expected: "reject", decision: "accept" },
            { id: "4", expected: "accept", decision: "accept" },
            { id: "5", expected: "accept", decision: "reject" },
            { id: "6", expected: "accept", decision: "unavailable" }
        ]);

        assert.equal(metrics.total, 6);
        assert.equal(metrics.unavailable, 1);
        assert.equal(metrics.truePositives, 2);
        assert.equal(metrics.falseNegatives, 1);
        assert.equal(metrics.trueNegatives, 1);
        assert.equal(metrics.falsePositives, 1);
        assert.equal(metrics.rejectionRecall, 2 / 3);
        assert.equal(metrics.falseRejectionRate, 1 / 2);
        assert.equal(metrics.accuracy, 3 / 5);
        assert.deepEqual(metrics.misclassified, ["3", "5"]);
    });

    it("não inventa taxas quando não há itens de uma classe", () => {
        const metrics = scoreCalibration([{ id: "1", expected: "accept", decision: "accept" }]);

        assert.equal(metrics.rejectionRecall, null);
        assert.equal(metrics.falseRejectionRate, 0);
        assert.equal(scoreCalibration([]).accuracy, null);
    });

    it("tem conjunto rotulado íntegro: ids únicos, evidências existentes e as duas classes", () => {
        const ids = CALIBRATION_SET.map(item => item.id);
        const accepted = CALIBRATION_SET.filter(item => item.expected === "accept").length;
        const rejected = CALIBRATION_SET.filter(item => item.expected === "reject").length;

        assert.equal(new Set(ids).size, ids.length);
        assert.ok(CALIBRATION_SET.every(item => item.evidenceId in EVIDENCES));
        assert.ok(CALIBRATION_SET.length >= 30);
        assert.ok(accepted >= 10 && rejected >= 10);
        assert.deepEqual(new Set(CALIBRATION_SET.map(item => item.evidenceId)), new Set(Object.keys(EVIDENCES)));
    });
});
