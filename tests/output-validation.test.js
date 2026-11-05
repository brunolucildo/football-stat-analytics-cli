import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hallucinationSignals } from "../src/ai/blockedWords.ts";
import { extractNumberMentions, findViewingClaims } from "../src/ai/groundingChecks.ts";
import { validateAthleteAssessment, validateTransferProposal } from "../src/ai/outputSchemas.ts";
import { validateOutput } from "../src/ai/validateOutputs.ts";
import {
    ATHLETE_INPUT,
    OFFER_INPUT,
    OFFER_WITHOUT_MARKET_INPUT,
    REJECTED_ATHLETE_CASES,
    athleteWith,
    validAthleteAssessment,
    validProposal
} from "./fixtures/cases.js";

const json = value => JSON.stringify(value);

describe("validação estruturada da avaliação de atleta", () => {
    it("aceita o exemplo documentado no README com todos os atributos fundamentados", () => {
        const result = validateAthleteAssessment(json(validAthleteAssessment()), ATHLETE_INPUT);

        assert.deepEqual(result.errors, []);
        assert.equal(result.isValid, true);
    });

    it("exige JSON puro, sem Markdown nem texto fora do objeto", () => {
        const fenced = "```json\n" + json(validAthleteAssessment()) + "\n```";
        const withPreamble = "Segue a avaliação: " + json(validAthleteAssessment());

        assert.match(validateAthleteAssessment(fenced, ATHLETE_INPUT).errors[0], /Markdown/);
        assert.match(validateAthleteAssessment(withPreamble, ATHLETE_INPUT).errors[0], /não é um JSON válido/);
        assert.match(validateAthleteAssessment("[1, 2]", ATHLETE_INPUT).errors[0], /deve ser um objeto/);
    });

    it("rejeita atributos ausentes e campos não permitidos", () => {
        const assessment = validAthleteAssessment();
        delete assessment.dribble;
        assessment.extra = { score: 50, justification: "campo extra" };

        const errors = validateAthleteAssessment(json(assessment), ATHLETE_INPUT).errors.join(" | ");

        assert.match(errors, /campos ausentes \(dribble\)/);
        assert.match(errors, /campos não permitidos \(extra\)/);
    });

    for (const testCase of REJECTED_ATHLETE_CASES) {
        it(`rejeita: ${testCase.name}`, () => {
            const result = validateAthleteAssessment(json(testCase.build()), ATHLETE_INPUT);

            assert.equal(result.isValid, false);
            assert.match(result.errors.join(" | "), testCase.expected);
        });
    }

    it("aceita score nulo quando a justificativa declara a falta de evidências", () => {
        const assessment = athleteWith("physic", {
            score: null,
            justification: "Não há evidências suficientes para avaliar este atributo."
        });

        assert.equal(validateAthleteAssessment(json(assessment), ATHLETE_INPUT).isValid, true);
    });

    it("permite termo valorativo ou comparação quando o usuário os forneceu", () => {
        const assessment = athleteWith("pass", { justification: "Seis de oito passes, acima da média informada." });
        const input = ATHLETE_INPUT + " A média da posição informada pela comissão é 5 passes progressivos.";
        const withoutBenchmark = validateAthleteAssessment(json(assessment), ATHLETE_INPUT);

        assert.equal(withoutBenchmark.isValid, false);
        assert.equal(
            validateAthleteAssessment(json(assessment), input + " O atleta ficou acima da média.").isValid,
            true
        );
    });

    it("aceita percentuais derivados dos dados e síntese do Overall com contagem de atributos", () => {
        const assessment = validAthleteAssessment();
        assessment.dribble.justification = "Completou 60% dos dribles (3 de 5).";
        assessment.physic.justification = "Ganhou 62,5% dos duelos físicos; não há dados de resistência.";
        assessment.overall.justification = "Média de 64 pontos sobre os seis atributos avaliados.";

        const result = validateAthleteAssessment(json(assessment), ATHLETE_INPUT);

        assert.deepEqual(result.errors, []);
    });

    it("não considera a ausência declarada de dados como alegação de resistência", () => {
        const result = validateAthleteAssessment(json(validAthleteAssessment()), ATHLETE_INPUT);

        assert.equal(result.errors.some(error => /resistência/.test(error)), false);
    });

    it("sem evidências do usuário valida apenas a estrutura", () => {
        const assessment = athleteWith("shot", { justification: "Realizou 9 finalizações." });

        assert.equal(validateAthleteAssessment(json(assessment)).isValid, true);
    });

    it("emite aviso, sem bloquear, para justificativas longas", () => {
        const assessment = athleteWith("pace", { justification: "Sete acelerações em transições ofensivas. ".repeat(10) });
        const result = validateAthleteAssessment(json(assessment), ATHLETE_INPUT);

        assert.equal(result.isValid, true);
        assert.match(result.warnings.join(" "), /pace: justificativa com mais de 300 caracteres/);
    });
});

describe("validação estruturada da proposta de transferência", () => {
    it("aceita uma proposta coerente com os dados informados", () => {
        const result = validateTransferProposal(json(validProposal()), OFFER_INPUT);

        assert.deepEqual(result.errors, []);
    });

    it("aceita valor de mercado nulo quando a mensagem não o informa", () => {
        const proposal = {
            decisao: "NEGOCIAR",
            justificativa: "A mensagem informa apenas a oferta fixa de 1700000 e não informa valor de mercado.",
            valorMercado: null,
            valorOferta: 1700000,
            diferencaPercentual: null,
            pontosPrincipais: ["Valor fixo sem bônus", "Valor de mercado não informado"]
        };

        assert.deepEqual(validateTransferProposal(json(proposal), OFFER_WITHOUT_MARKET_INPUT).errors, []);
    });

    it("rejeita decisão fora das três categorias", () => {
        const proposal = { ...validProposal(), decisao: "TALVEZ" };

        assert.match(validateTransferProposal(json(proposal), OFFER_INPUT).errors.join(" "), /decisao deve ser exatamente/);
    });

    it("rejeita valor de mercado inventado", () => {
        const proposal = { ...validProposal(), valorMercado: 3000000, diferencaPercentual: -43.3 };
        const errors = validateTransferProposal(json(proposal), OFFER_WITHOUT_MARKET_INPUT).errors.join(" | ");

        assert.match(errors, /valorMercado \(3000000\) não aparece nos dados fornecidos/);
    });

    it("rejeita diferença percentual que não corresponde ao cálculo", () => {
        const proposal = { ...validProposal(), diferencaPercentual: -5 };

        assert.match(
            validateTransferProposal(json(proposal), OFFER_INPUT).errors.join(" "),
            /diferencaPercentual \(-5\) difere do cálculo esperado \(-15\.0\)/
        );
    });

    it("exige diferença nula quando o valor de mercado não foi informado", () => {
        const proposal = { ...validProposal(), valorMercado: null };

        assert.match(
            validateTransferProposal(json(proposal), OFFER_INPUT).errors.join(" "),
            /diferencaPercentual deve ser null/
        );
    });

    it("rejeita números do texto que não existem nos dados nem derivam deles", () => {
        const proposal = { ...validProposal(), justificativa: "O clube vendeu o atleta por 4500000 em 2019." };

        assert.match(
            validateTransferProposal(json(proposal), OFFER_INPUT).errors.join(" "),
            /Texto cita números ausentes.*4500000/
        );
    });

    it("rejeita campos ausentes, tipos incorretos e lista de pontos vazia", () => {
        const proposal = { ...validProposal(), valorOferta: "1.700.000", pontosPrincipais: [] };
        delete proposal.justificativa;
        const errors = validateTransferProposal(json(proposal), OFFER_INPUT).errors.join(" | ");

        assert.match(errors, /campos ausentes \(justificativa\)/);
        assert.match(errors, /valorOferta deve ser um número ou null/);
        assert.match(errors, /pontosPrincipais deve ser uma lista não vazia/);
    });

    it("emite aviso para RECUSAR com oferta acima do mercado", () => {
        const proposal = { ...validProposal(), decisao: "RECUSAR", valorMercado: 1500000, diferencaPercentual: 13.3 };
        const input = OFFER_INPUT.replace("2.000.000,00", "1.500.000,00");
        const result = validateTransferProposal(json(proposal), input);

        assert.match((result.warnings ?? []).join(" "), /RECUSAR com oferta igual ou acima/);
    });
});

describe("validateOutput por persona", () => {
    it("combina sinais de alucinação sem diferenciar maiúsculas e acentos", () => {
        const result = validateOutput("Ele teve HISTORICO DE SUCESSO.", hallucinationSignals);

        assert.equal(result.isValid, false);
        assert.match(result.errors[0], /histórico de sucesso/);
    });

    it("aplica o contrato JSON da persona analistaEsportivo", () => {
        const valid = validateOutput(json(validAthleteAssessment()), hallucinationSignals, {
            persona: "analistaEsportivo",
            userInput: ATHLETE_INPUT
        });
        const prose = validateOutput("O atleta foi bem.", hallucinationSignals, {
            persona: "analistaEsportivo",
            userInput: ATHLETE_INPUT
        });

        assert.equal(valid.isValid, true);
        assert.equal(prose.isValid, false);
    });

    it("não impõe formato JSON a prompts personalizados nem à persona SV", () => {
        const text = "Leitura tática em texto livre.";

        assert.equal(validateOutput(text, hallucinationSignals).isValid, true);
        assert.equal(validateOutput(text, hallucinationSignals, { persona: "analistaSV", userInput: "contexto" }).isValid, true);
    });

    it("bloqueia na persona SV a alegação de ter assistido a vídeos não fornecidos", () => {
        const claim = "Assisti ao jogo e o lateral foi pressionado.";

        assert.equal(
            validateOutput(claim, [], { persona: "analistaSV", userInput: "Lateral esquerdo, time joga em 4-3-3." }).isValid,
            false
        );
        assert.equal(
            validateOutput(claim, [], { persona: "analistaSV", userInput: "Segue o vídeo do lance do lateral." }).isValid,
            true
        );
    });
});

describe("utilitários de fundamentação", () => {
    it("interpreta números em formato brasileiro, por extenso e em milhões", () => {
        const values = extractNumberMentions("€ 1.700.000,00, 62,5%, sete jogos, 1,2 milhão e seis atributos").map(item => item.value);

        assert.deepEqual(values, [1700000, 62.5, 7, 1200000]);
    });

    it("identifica alegações de visualização e ignora a negação", () => {
        assert.equal(findViewingClaims("Eu vi os vídeos do atleta.", "sem material").length, 1);
        assert.equal(findViewingClaims("Não assisti a nenhum vídeo.", "sem material").length, 0);
    });
});
