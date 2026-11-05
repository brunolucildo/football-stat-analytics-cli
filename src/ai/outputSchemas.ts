import type { ValidationResult } from "../utils/types.ts";
import { normalizeText } from "../utils/text.ts";
import {
    extractNumberMentions,
    findUngroundedMentions,
    findUnsupportedTerms,
    findValorativeTerms,
    findViewingClaims
} from "./groundingChecks.ts";

export const ATHLETE_ATTRIBUTES = ["pace", "shot", "pass", "dribble", "defence", "physic", "overall"] as const;
export const PROPOSAL_DECISIONS = ["ACEITAR", "NEGOCIAR", "RECUSAR"] as const;
export const PROPOSAL_FIELDS = [
    "decisao", "justificativa", "valorMercado", "valorOferta", "diferencaPercentual", "pontosPrincipais"
] as const;

const MAX_JUSTIFICATION_LENGTH = 300;
const MAX_PROPOSAL_WORDS = 200;
const MAX_SCORE = 99;

type JsonObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseStrictJsonObject(text: string): { value?: JsonObject; error?: string } {
    const trimmed = text.trim();

    if (trimmed.startsWith("```")) {
        return { error: "A resposta usa bloco de código Markdown; era esperado somente o objeto JSON." };
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(trimmed);
    } catch {
        return { error: "A resposta não é um JSON válido (ou contém texto antes/depois do objeto)." };
    }

    if (!isPlainObject(parsed)) {
        return { error: "A resposta JSON deve ser um objeto." };
    }

    return { value: parsed };
}

function checkExactKeys(object: JsonObject, expected: readonly string[], label: string, errors: string[]): void {
    const missing = expected.filter(key => !(key in object));
    const extra = Object.keys(object).filter(key => !expected.includes(key));

    if (missing.length > 0) {
        errors.push(`${label}: campos ausentes (${missing.join(", ")}).`);
    }
    if (extra.length > 0) {
        errors.push(`${label}: campos não permitidos (${extra.join(", ")}).`);
    }
}

function declaresInsufficientEvidence(justification: string): boolean {
    return /(nao (ha|existem?|foram|foi|houve)[^.;]*(evidencias?|dados|informacoes|indicadores)|evidencias? insuficientes?|dados insuficientes|sem evidencias?|insuficiencia de (dados|evidencias))/
        .test(normalizeText(justification));
}

function result(errors: string[], warnings: string[]): ValidationResult {
    return { isValid: errors.length === 0, errors, warnings };
}

export function validateAthleteAssessment(text: string, userInput?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const parsed = parseStrictJsonObject(text);

    if (!parsed.value) {
        return result([parsed.error ?? "JSON inválido."], warnings);
    }

    const assessment = parsed.value;
    checkExactKeys(assessment, ATHLETE_ATTRIBUTES, "Avaliação", errors);

    const scores: Partial<Record<(typeof ATHLETE_ATTRIBUTES)[number], number>> = {};

    for (const attribute of ATHLETE_ATTRIBUTES) {
        const entry = assessment[attribute];
        if (entry === undefined) {
            continue;
        }
        if (!isPlainObject(entry)) {
            errors.push(
                `${attribute}: deve ser um objeto com score e justification, nunca ${entry === null ? "null" : "outro tipo"}; ` +
                `para atributo sem evidências use {"score": null, "justification": "Não há evidências suficientes ..."}.`
            );
            continue;
        }

        checkExactKeys(entry, ["score", "justification"], attribute, errors);

        const { score, justification } = entry;
        const hasJustification = typeof justification === "string" && justification.trim().length > 0;

        if (!hasJustification) {
            errors.push(`${attribute}: justification deve ser um texto não vazio.`);
        }

        if (score === null) {
            if (hasJustification && !declaresInsufficientEvidence(justification as string)) {
                errors.push(`${attribute}: score nulo exige justificar explicitamente a falta de evidências.`);
            }
        } else if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
            errors.push(`${attribute}: score deve ser um inteiro entre 0 e ${MAX_SCORE} (ou null sem evidências).`);
        } else {
            scores[attribute] = score;
            if (score === 0 && hasJustification && declaresInsufficientEvidence(justification as string)) {
                errors.push(`${attribute}: score 0 não pode representar ausência de dados; use null.`);
            }
        }

        if (!hasJustification) {
            continue;
        }

        const reason = justification as string;
        if (reason.length > MAX_JUSTIFICATION_LENGTH) {
            warnings.push(`${attribute}: justificativa com mais de ${MAX_JUSTIFICATION_LENGTH} caracteres (esperada curta).`);
        }

        if (userInput === undefined) {
            continue;
        }

        const valorative = findValorativeTerms(reason, userInput);
        if (valorative.length > 0) {
            errors.push(`${attribute}: termos valorativos sem parâmetro de comparação fornecido (${valorative.join(", ")}).`);
        }

        const suppliedNumbers = extractNumberMentions(userInput).map(mention => mention.value);
        if (
            attribute !== "overall" &&
            typeof score === "number" &&
            suppliedNumbers.length > 0 &&
            // at least one number of the justification must be grounded (supplied or a derived percentage)
            extractNumberMentions(reason).length === findUngroundedMentions(reason, userInput).length
        ) {
            errors.push(`${attribute}: a justificativa não cita nenhum indicador numérico fornecido nos dados.`);
        }

        const unsupported = findUnsupportedTerms(reason, userInput);
        if (unsupported.length > 0) {
            errors.push(`${attribute}: cita ações ou características ausentes dos dados (${unsupported.join(", ")}).`);
        }

        if (attribute === "defence" && /duelos? fisicos?/.test(normalizeText(reason))) {
            errors.push("defence: duelos físicos não são evidência de Defence sem ação defensiva explícita.");
        }
    }

    const componentScores = ATHLETE_ATTRIBUTES
        .filter(attribute => attribute !== "overall")
        .map(attribute => scores[attribute])
        .filter((score): score is number => score !== undefined);

    if (scores.overall !== undefined && componentScores.length > 0) {
        const lowest = Math.min(...componentScores);
        const highest = Math.max(...componentScores);
        if (scores.overall < lowest || scores.overall > highest) {
            errors.push(`overall: ${scores.overall} está fora do intervalo dos atributos avaliados (${lowest}–${highest}).`);
        }
    }

    if (userInput !== undefined) {
        const mean = componentScores.length > 0
            ? componentScores.reduce((sum, score) => sum + score, 0) / componentScores.length
            : 0;
        const overallExtras = [
            ...componentScores,
            ...(scores.overall !== undefined ? [scores.overall] : []),
            Math.floor(mean),
            Math.round(mean),
            Math.ceil(mean)
        ];

        for (const attribute of ATHLETE_ATTRIBUTES) {
            const entry = assessment[attribute];
            const reason = isPlainObject(entry) ? entry.justification : undefined;
            if (typeof reason !== "string") {
                continue;
            }
            const ungrounded = findUngroundedMentions(reason, userInput, {
                extraAllowed: attribute === "overall" ? overallExtras : []
            });
            if (ungrounded.length > 0) {
                errors.push(`${attribute}: números ausentes dos dados fornecidos (${ungrounded.map(item => item.raw).join(", ")}).`);
            }
        }
    }

    return result(errors, warnings);
}

function isNullableNumber(value: unknown): value is number | null {
    return value === null || (typeof value === "number" && Number.isFinite(value));
}

export function validateTransferProposal(text: string, userInput?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const parsed = parseStrictJsonObject(text);

    if (!parsed.value) {
        return result([parsed.error ?? "JSON inválido."], warnings);
    }

    const proposal = parsed.value;
    checkExactKeys(proposal, PROPOSAL_FIELDS, "Proposta", errors);

    const { decisao, justificativa, valorMercado, valorOferta, diferencaPercentual, pontosPrincipais } = proposal;

    if (typeof decisao !== "string" || !(PROPOSAL_DECISIONS as readonly string[]).includes(decisao)) {
        errors.push(`decisao deve ser exatamente ${PROPOSAL_DECISIONS.join(", ")}.`);
    }
    if (typeof justificativa !== "string" || justificativa.trim().length === 0) {
        errors.push("justificativa deve ser um texto não vazio.");
    }
    for (const [name, value] of [["valorMercado", valorMercado], ["valorOferta", valorOferta], ["diferencaPercentual", diferencaPercentual]] as const) {
        if (name in proposal && !isNullableNumber(value)) {
            errors.push(`${name} deve ser um número ou null.`);
        }
    }
    if (
        !Array.isArray(pontosPrincipais) ||
        pontosPrincipais.length === 0 ||
        pontosPrincipais.some(point => typeof point !== "string" || point.trim().length === 0)
    ) {
        errors.push("pontosPrincipais deve ser uma lista não vazia de textos.");
    }

    const words = text.trim().split(/\s+/).length;
    if (words > MAX_PROPOSAL_WORDS) {
        warnings.push(`A resposta tem ${words} palavras; a persona limita a ${MAX_PROPOSAL_WORDS}.`);
    }

    const market = typeof valorMercado === "number" ? valorMercado : null;
    const offer = typeof valorOferta === "number" ? valorOferta : null;
    const difference = typeof diferencaPercentual === "number" ? diferencaPercentual : null;

    if (market !== null && offer !== null && market > 0) {
        const expected = ((offer - market) / market) * 100;
        if (difference === null) {
            errors.push("diferencaPercentual deve ser calculada quando valorMercado e valorOferta são informados.");
        } else if (Math.abs(difference - expected) > 0.5) {
            errors.push(`diferencaPercentual (${difference}) difere do cálculo esperado (${expected.toFixed(1)}).`);
        }
        if (decisao === "RECUSAR" && offer >= market) {
            warnings.push("Decisão RECUSAR com oferta igual ou acima do valor de mercado: confirme se há condições desfavoráveis.");
        }
    } else if (difference !== null) {
        errors.push("diferencaPercentual deve ser null quando valorMercado ou valorOferta não foram informados.");
    }

    if (userInput !== undefined) {
        const supplied = extractNumberMentions(userInput).map(mention => mention.value);
        const suppliedWithSums = [...supplied, ...supplied.flatMap(a => supplied.map(b => a + b))];

        for (const [name, value] of [["valorMercado", market], ["valorOferta", offer]] as const) {
            if (value !== null && !suppliedWithSums.some(candidate => Math.abs(candidate - value) < 0.01)) {
                errors.push(`${name} (${value}) não aparece nos dados fornecidos.`);
            }
        }

        const prose = [
            typeof justificativa === "string" ? justificativa : "",
            ...(Array.isArray(pontosPrincipais) ? pontosPrincipais.filter(point => typeof point === "string") : [])
        ].join(" ");
        const derivedValues = [market, offer, difference]
            .filter((value): value is number => value !== null)
            .flatMap(value => [value, Math.round(value), Math.round(value * 10) / 10, Math.abs(value), Math.round(Math.abs(value))]);
        const ungrounded = findUngroundedMentions(prose, userInput, {
            deriveSumsAndDifferences: true,
            extraAllowed: derivedValues
        });
        if (ungrounded.length > 0) {
            errors.push(`Texto cita números ausentes dos dados fornecidos (${ungrounded.map(item => item.raw).join(", ")}).`);
        }
    }

    return result(errors, warnings);
}

/** Checks for personas that answer in free text (Scout Vision). */
export function validateFreeTextAnalysis(text: string, userInput?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (text.trim().length === 0) {
        errors.push("A resposta está vazia.");
    }

    if (userInput !== undefined) {
        const claims = findViewingClaims(text, userInput);
        if (claims.length > 0) {
            errors.push("A resposta alega ter assistido a jogos ou vídeos que não foram fornecidos.");
        }

        // List markers and policy-defined figures ("3 minutos") are not statistics, so
        // only percentages and larger numbers are held against the supplied data.
        const ungrounded = findUngroundedMentions(text, userInput)
            .filter(mention => mention.isPercent || mention.value >= 10);
        if (ungrounded.length > 0) {
            warnings.push(`Números sem correspondência nos dados fornecidos: ${ungrounded.map(item => item.raw).join(", ")}.`);
        }
    }

    return result(errors, warnings);
}
