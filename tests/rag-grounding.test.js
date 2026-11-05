import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.OPENAI_API_KEY ??= "test-key-not-used";

const { buildRagPrompt } = await import("../src/utils/buildRagPrompt.ts");
const { checkRagGrounding, formatGroundingReport } = await import("../src/utils/ragGrounding.ts");
const { ragAnswer } = await import("../src/utils/ragAnswer.ts");
const { VectorRepository } = await import("../src/vectorRepository.ts");

const RETRIEVED = [
    {
        source: "relatorios/Postpartido - Nil Coch.pdf",
        chunk: "Nil Coch se oferece em zonas livres para receber durante a progressão. Deve gerir melhor a pausa na execução do passe progressivo.",
        score: 0.36
    },
    {
        source: "relatorios/Prepartido - Nil Coch x SC Poltava.pdf",
        chunk: "O lateral realizou 12 ações de progressão com bola no primeiro tempo.",
        score: 0.38
    }
];

describe("fundamentação lexical das respostas RAG", () => {
    it("considera apoiada a resposta que reutiliza os termos dos trechos recuperados", () => {
        const answer = "Nil Coch se oferece em zonas livres para receber durante a progressão (Fonte: relatorios/Postpartido - Nil Coch.pdf).";
        const report = checkRagGrounding(answer, RETRIEVED);

        assert.equal(report.checkedClaims, 1);
        assert.equal(report.supportedClaims, 1);
        assert.deepEqual(report.unsupportedClaims, []);
        assert.deepEqual(report.unknownSources, []);
    });

    it("sinaliza afirmação cujo conteúdo não aparece nos trechos", () => {
        const answer = "O atleta lidera a competição em finalizações certas e foi campeão estadual invicto.";
        const report = checkRagGrounding(answer, RETRIEVED);

        assert.equal(report.checkedClaims, 1);
        assert.equal(report.supportedClaims, 0);
        assert.match(report.unsupportedClaims[0].sentence, /lidera a competição/);
    });

    it("sinaliza números ausentes dos trechos e aceita os presentes", () => {
        const invented = checkRagGrounding("Ele realizou 20 ações de progressão com bola.", RETRIEVED);
        const present = checkRagGrounding("Ele realizou 12 ações de progressão com bola.", RETRIEVED);

        assert.deepEqual(invented.ungroundedNumbers, ["20"]);
        assert.deepEqual(present.ungroundedNumbers, []);
    });

    it("sinaliza fonte citada que não foi recuperada", () => {
        const answer = "A progressão é positiva (Fonte: relatorios/Relatorio inexistente.pdf) e (Fonte: relatorios/Postpartido - Nil Coch.pdf).";
        const report = checkRagGrounding(answer, RETRIEVED);

        assert.deepEqual(report.unknownSources, ["relatorios/Relatorio inexistente.pdf"]);
    });

    it("trata a declaração de informação insuficiente como recusa, sem afirmações a verificar", () => {
        const report = checkRagGrounding("Não encontrei informações suficientes para essa pergunta.", RETRIEVED);

        assert.equal(report.isRefusal, true);
        assert.equal(report.checkedClaims, 0);
        assert.match(formatGroundingReport(report), /nenhuma afirmação a verificar/);
    });

    it("formata o relatório deixando claro que a verificação é lexical", () => {
        const text = formatGroundingReport(checkRagGrounding(
            "O atleta lidera a competição em finalizações certas e foi campeão estadual invicto.",
            RETRIEVED
        ));

        assert.match(text, /lexical, não semântica/);
        assert.match(text, /0 de 1 afirmações/);
        assert.match(text, /\[!\] Sem suporte lexical suficiente/);
    });
});

describe("integração da verificação no ragAnswer", () => {
    it("anexa a verificação de fundamentação entre a resposta e os trechos recuperados", async () => {
        const repository = new VectorRepository(":memory:");
        try {
            const response = await ragAnswer(
                "progressão",
                repository,
                RETRIEVED,
                async () => "O atleta lidera a competição em finalizações certas e foi campeão estadual invicto."
            );

            const verification = response.indexOf("Verificação de fundamentação");
            const references = response.indexOf("Trechos recuperados (score de relevância, não de certeza)");

            assert.ok(verification > 0 && references > verification);
            assert.match(response, /\[!\] Sem suporte lexical suficiente/);
        } finally {
            repository.close();
        }
    });

    it("não acusa falta de suporte quando a resposta reproduz o conteúdo recuperado", async () => {
        const repository = new VectorRepository(":memory:");
        try {
            const response = await ragAnswer(
                "progressão",
                repository,
                RETRIEVED,
                async () => "Nil Coch se oferece em zonas livres para receber durante a progressão."
            );

            assert.match(response, /1 de 1 afirmações com suporte/);
            assert.doesNotMatch(response, /\[!\]/);
        } finally {
            repository.close();
        }
    });
});

describe("prompt RAG fundamentado", () => {
    it("exige citação de fonte por afirmação, proíbe extrapolação e mantém a recusa padrão", () => {
        const prompt = buildRagPrompt("pergunta", ["[Fonte: a.pdf]\ntexto"]);

        assert.match(prompt, /\(Fonte: nome do arquivo\)/);
        assert.match(prompt, /Não acrescente números, ações, resultados ou características/);
        assert.match(prompt, /sem exibir o raciocínio/);
        assert.match(prompt, /Não encontrei informações suficientes para essa pergunta/);
        assert.match(prompt, /\[Fonte: a\.pdf\]/);
    });
});
