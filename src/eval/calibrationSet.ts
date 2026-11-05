/**
 * Hand-labelled statements used to measure the semantic verifier. "accept" means the
 * evidence supports the statement (or it is a fair inference or a true statement of missing
 * data); "reject" means it adds a fact or contradicts the evidence. The labels were written by
 * the author of the project, not by an independent reviewer.
 */
export type CalibrationItem = {
    id: string;
    evidenceId: keyof typeof EVIDENCES;
    claim: string;
    expected: "accept" | "reject";
    kind: string;
};

export const EVIDENCES = {
    athlete:
        "Avalie este ponta: em 70 minutos, registrou 7 acelerações em transições ofensivas, " +
        "completou 3 de 5 dribles, acertou 6 de 8 passes progressivos, finalizou 4 vezes " +
        "(2 no alvo e 1 gol), ganhou 4 de 6 duelos defensivos e 5 de 8 duelos físicos.",
    proposal:
        "Olá, equipe do Palmeiras. Oferecemos € 1.700.000,00 como valor fixo pelo atleta Gabriel Martins. " +
        "O valor de mercado informado pelo vendedor é € 2.000.000,00.",
    report:
        "Nil Coch se oferece em zonas livres para receber durante a progressão. " +
        "Deve gerir melhor a pausa na execução do passe progressivo."
} as const;

export const CALIBRATION_SET: CalibrationItem[] = [
    { id: "a1", evidenceId: "athlete", claim: "Registrou 7 acelerações em transições ofensivas.", expected: "accept", kind: "fato literal" },
    { id: "a2", evidenceId: "athlete", claim: "Completou 3 de 5 dribles (60%).", expected: "accept", kind: "fato com percentual derivado" },
    { id: "a3", evidenceId: "athlete", claim: "Acertou 6 de 8 passes progressivos (75%).", expected: "accept", kind: "fato com percentual derivado" },
    { id: "a4", evidenceId: "athlete", claim: "Finalizou 4 vezes, sendo 2 no alvo e 1 gol.", expected: "accept", kind: "fato literal" },
    { id: "a5", evidenceId: "athlete", claim: "Ganhou 4 de 6 duelos defensivos.", expected: "accept", kind: "fato literal" },
    { id: "a6", evidenceId: "athlete", claim: "Ganhou 5 de 8 duelos físicos; não há dados de resistência.", expected: "accept", kind: "fato e limitação verdadeira" },
    { id: "a7", evidenceId: "athlete", claim: "Acertou 75% dos passes progressivos, o que indica contribuição para a progressão.", expected: "accept", kind: "inferência" },
    { id: "a8", evidenceId: "athlete", claim: "Não há dados de velocidade máxima.", expected: "accept", kind: "limitação verdadeira" },
    { id: "a9", evidenceId: "athlete", claim: "Mostrou um desempenho sólido nos dribles.", expected: "reject", kind: "qualificação sem benchmark" },
    { id: "a10", evidenceId: "athlete", claim: "Demonstra grande resistência física.", expected: "reject", kind: "característica ausente" },
    { id: "a11", evidenceId: "athlete", claim: "Fez desarmes decisivos.", expected: "reject", kind: "ação ausente" },
    { id: "a12", evidenceId: "athlete", claim: "Realizou 9 finalizações.", expected: "reject", kind: "número contradito" },
    { id: "a13", evidenceId: "athlete", claim: "Completou 5 de 5 dribles.", expected: "reject", kind: "número contradito" },
    { id: "a14", evidenceId: "athlete", claim: "Não há dados sobre dribles.", expected: "reject", kind: "limitação falsa" },
    { id: "a15", evidenceId: "athlete", claim: "Ganhou mais duelos do que a média da posição.", expected: "reject", kind: "comparação sem referência" },
    { id: "p1", evidenceId: "proposal", claim: "A oferta de € 1.700.000,00 está 15% abaixo do valor de mercado de € 2.000.000,00.", expected: "accept", kind: "cálculo sobre os dados" },
    { id: "p2", evidenceId: "proposal", claim: "A diferença entre a oferta e o valor de mercado é de € 300.000,00.", expected: "accept", kind: "cálculo sobre os dados" },
    { id: "p3", evidenceId: "proposal", claim: "Portanto, a proposta pode ser melhorada para se aproximar do valor de mercado.", expected: "accept", kind: "inferência" },
    { id: "p4", evidenceId: "proposal", claim: "Não foram informadas as condições de pagamento.", expected: "accept", kind: "limitação verdadeira" },
    { id: "p5", evidenceId: "proposal", claim: "A oferta contempla bônus por metas esportivas.", expected: "reject", kind: "fato ausente" },
    { id: "p6", evidenceId: "proposal", claim: "O clube comprador é o Real Madrid.", expected: "reject", kind: "fato ausente" },
    { id: "p7", evidenceId: "proposal", claim: "O atleta tem 24 anos.", expected: "reject", kind: "fato ausente" },
    { id: "p8", evidenceId: "proposal", claim: "O pagamento será parcelado em três vezes.", expected: "reject", kind: "fato ausente" },
    { id: "p9", evidenceId: "proposal", claim: "O valor de mercado do atleta não foi informado.", expected: "reject", kind: "limitação falsa" },
    { id: "r1", evidenceId: "report", claim: "Nil Coch se oferece em zonas livres para receber.", expected: "accept", kind: "fato literal" },
    { id: "r2", evidenceId: "report", claim: "Precisa gerir melhor a pausa antes do passe progressivo.", expected: "accept", kind: "paráfrase" },
    { id: "r3", evidenceId: "report", claim: "Nil Coch recebe em zonas livres durante a progressão e deve melhorar a pausa no passe progressivo.", expected: "accept", kind: "paráfrase" },
    { id: "r4", evidenceId: "report", claim: "Nil Coch marcou dois gols na partida.", expected: "reject", kind: "fato ausente" },
    { id: "r5", evidenceId: "report", claim: "Nil Coch é o melhor jogador da equipe na progressão.", expected: "reject", kind: "comparação sem referência" },
    { id: "r6", evidenceId: "report", claim: "Nil Coch tem excelente leitura de jogo.", expected: "reject", kind: "qualificação sem benchmark" }
];
