// Shared fixtures: evidence supplied by the user and reference model answers.
// The reference answer is the example documented in the README, so the validators are
// exercised against the same output shape that users see.

export const ATHLETE_INPUT =
    "Avalie este ponta: em 70 minutos, registrou 7 acelerações em transições ofensivas, " +
    "completou 3 de 5 dribles, acertou 6 de 8 passes progressivos, finalizou 4 vezes " +
    "(2 no alvo e 1 gol), ganhou 4 de 6 duelos defensivos e 5 de 8 duelos físicos.";

export function validAthleteAssessment() {
    return {
        pace: {
            score: 68,
            justification: "As sete acelerações em transições ofensivas indicam participação em ações de progressão."
        },
        shot: {
            score: 72,
            justification: "As quatro finalizações, duas no alvo e um gol fornecem evidências positivas de conclusão."
        },
        pass: {
            score: 68,
            justification: "Acertar seis de oito passes progressivos indica contribuição para a progressão da equipe."
        },
        dribble: {
            score: 62,
            justification: "Completou três de cinco dribles, com sucesso em parte das tentativas."
        },
        defence: {
            score: 60,
            justification: "Ganhou quatro de seis duelos defensivos, evidência de contribuição defensiva nesta amostra."
        },
        physic: {
            score: 60,
            justification: "Ganhou cinco de oito duelos físicos; não há dados de resistência ou intensidade ao longo do jogo."
        },
        overall: {
            score: 64,
            justification: "Síntese dos seis atributos com evidências disponíveis nesta amostra."
        }
    };
}

export function athleteWith(attribute, changes) {
    const assessment = validAthleteAssessment();
    assessment[attribute] = { ...assessment[attribute], ...changes };
    return assessment;
}

// Each case mutates the valid answer in one way that the documentation reports as a
// real failure mode (or that the policy forbids) and states which rule must catch it.
export const REJECTED_ATHLETE_CASES = [
    {
        name: "adjetivo valorativo sem parâmetro (extrapolação observada na avaliação ao vivo)",
        build: () => athleteWith("dribble", { justification: "Completou três de cinco dribles, um desempenho sólido." }),
        expected: /dribble: termos valorativos.*solido/
    },
    {
        name: "comparação com média não fornecida",
        build: () => athleteWith("pass", { justification: "Seis de oito passes progressivos, acima da média da posição." }),
        expected: /pass: termos valorativos.*acima da media/
    },
    {
        name: "resistência inferida a partir de duelos (extrapolação observada)",
        build: () => athleteWith("physic", { justification: "Ganhou cinco de oito duelos físicos, o que demonstra grande resistência." }),
        expected: /physic: cita ações ou características ausentes.*resistência/
    },
    {
        name: "desarme citado sem existir nos dados (extrapolação observada)",
        build: () => athleteWith("defence", { justification: "Ganhou quatro de seis duelos defensivos e fez desarmes decisivos." }),
        expected: /defence: cita ações ou características ausentes.*desarme/
    },
    {
        name: "duelos físicos usados como evidência de Defence",
        build: () => athleteWith("defence", { justification: "Ganhou cinco de oito duelos físicos, contribuindo na defesa." }),
        expected: /defence: duelos físicos/
    },
    {
        name: "percentual que não decorre dos dados",
        build: () => athleteWith("dribble", { justification: "Completou 80% dos dribles tentados." }),
        expected: /dribble: números ausentes.*80%/
    },
    {
        name: "quantidade inventada",
        build: () => athleteWith("shot", { justification: "Realizou 9 finalizações, com 1 gol." }),
        expected: /shot: números ausentes.*9/
    },
    {
        name: "score zero por falta de dados",
        build: () => athleteWith("physic", { score: 0, justification: "Não há dados suficientes sobre o atributo." }),
        expected: /physic: score 0 não pode representar ausência/
    },
    {
        name: "score nulo sem explicar a falta de evidências",
        build: () => athleteWith("physic", { score: null, justification: "Sem comentários." }),
        expected: /physic: score nulo exige justificar/
    },
    {
        name: "score fora da faixa 0-99",
        build: () => athleteWith("shot", { score: 100 }),
        expected: /shot: score deve ser um inteiro entre 0 e 99/
    },
    {
        name: "score decimal",
        build: () => athleteWith("shot", { score: 72.5 }),
        expected: /shot: score deve ser um inteiro/
    },
    {
        name: "overall fora do intervalo dos atributos",
        build: () => athleteWith("overall", { score: 90 }),
        expected: /overall: 90 está fora do intervalo/
    },
    {
        name: "justificativa sem nenhum indicador numérico dos dados",
        build: () => athleteWith("pace", { justification: "Participou ativamente das transições ofensivas." }),
        expected: /pace: a justificativa não cita nenhum indicador numérico/
    },
    {
        name: "atributo sem evidência devolvido como null em vez do objeto (falha observada na avaliação ao vivo)",
        build: () => ({ ...validAthleteAssessment(), physic: null }),
        expected: /physic: deve ser um objeto com score e justification, nunca null/
    },
    {
        name: "campo adicional no atributo",
        build: () => athleteWith("pace", { confidence: 0.9 }),
        expected: /pace: campos não permitidos \(confidence\)/
    }
];

export const OFFER_INPUT =
    "Olá, equipe do Palmeiras, nossa oferta contempla € 1.700.000,00 como valor fixo pelo atleta Gabriel Martins. " +
    "O valor de mercado estimado pelo vendedor é de € 2.000.000,00.";

export const OFFER_WITHOUT_MARKET_INPUT =
    "Olá, equipe do Palmeiras, nossa oferta contempla € 1.700.000,00 como valor fixo pelo atleta Gabriel Martins.";

export function validProposal() {
    return {
        decisao: "NEGOCIAR",
        justificativa: "A oferta fixa de 1700000 está 15% abaixo do valor de mercado de 2000000 informado.",
        valorMercado: 2000000,
        valorOferta: 1700000,
        diferencaPercentual: -15,
        pontosPrincipais: ["Valor fixo sem bônus", "Diferença de 300000 em relação ao valor de mercado"]
    };
}
