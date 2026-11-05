import { normalizeText, splitSentences, tokenize } from "../utils/text.ts";

/**
 * Deterministic groundedness checks. They compare a generated text with the
 * evidence supplied by the user and flag content that cannot be traced back to
 * it. They are lexical heuristics: they reduce unsupported claims but do not
 * prove that a statement is semantically correct.
 */

export type NumberMention = {
    raw: string;
    value: number;
    isPercent: boolean;
};

const NUMBER_WORDS: Record<string, number> = {
    zero: 0, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7,
    oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14,
    quatorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18,
    dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50
};

// "seis atributos" counts the schema, not an observed statistic.
const STRUCTURAL_WORDS = new Set([
    "atributo", "atributos", "dimensao", "dimensoes", "criterio", "criterios", "categoria", "categorias"
]);

const NEGATION_TOKENS = new Set([
    "nao", "sem", "nenhum", "nenhuma", "nem", "ausencia", "ausente", "ausentes",
    "insuficiente", "insuficientes", "inexistente", "inexistentes", "falta", "faltam"
]);

export function parsePtNumber(raw: string): number {
    if (raw.includes(",") && raw.includes(".")) {
        return Number(raw.replaceAll(".", "").replace(",", "."));
    }
    if (raw.includes(".")) {
        return /^\d{1,3}(\.\d{3})+$/.test(raw) ? Number(raw.replaceAll(".", "")) : Number(raw);
    }
    return Number(raw.replace(",", "."));
}

export function extractNumberMentions(text: string): NumberMention[] {
    const tokens = normalizeText(text).match(/\d+(?:[.,]\d+)*|%|[a-z]+/g) ?? [];
    const mentions: NumberMention[] = [];

    tokens.forEach((token, index) => {
        const next = tokens[index + 1] ?? "";
        let value: number | undefined;

        if (/^\d/.test(token)) {
            value = parsePtNumber(token);
        } else if (token in NUMBER_WORDS) {
            value = NUMBER_WORDS[token];
        }

        if (value === undefined || Number.isNaN(value) || STRUCTURAL_WORDS.has(next)) {
            return;
        }

        const isPercent = next === "%";
        if (next === "milhao" || next === "milhoes") {
            value *= 1_000_000;
        } else if (next === "mil" && /^\d/.test(token)) {
            value *= 1_000;
        }

        mentions.push({ raw: isPercent ? `${token}%` : token, value, isPercent });
    });

    return mentions;
}

/** Pairs such as "3 de 5", "três de cinco" or "3/5" -> [3, 5]. */
export function extractRatioPairs(text: string): [number, number][] {
    const word = Object.keys(NUMBER_WORDS).join("|");
    const operand = `(\\d+(?:[.,]\\d+)?|${word})`;
    const pattern = new RegExp(`\\b${operand}\\s*(?:\\bde\\b|/)\\s*${operand}\\b`, "g");
    const toNumber = (token: string) => (token in NUMBER_WORDS ? NUMBER_WORDS[token] : parsePtNumber(token));

    return [...normalizeText(text).matchAll(pattern)]
        .map(match => [toNumber(match[1]), toNumber(match[2])] as [number, number])
        .filter(([part, whole]) => whole > 0 && part <= whole);
}

function sameNumber(a: number, b: number): boolean {
    return Math.abs(a - b) < 1e-6;
}

export function findUngroundedNumbers(
    text: string,
    source: string,
    options: { extraAllowed?: number[]; deriveSumsAndDifferences?: boolean } = {}
): string[] {
    return [...new Set(findUngroundedMentions(text, source, options).map(mention => mention.raw))];
}

export function findUngroundedMentions(
    text: string,
    source: string,
    options: { extraAllowed?: number[]; deriveSumsAndDifferences?: boolean } = {}
): NumberMention[] {
    const base = [...new Set(extractNumberMentions(source).map(mention => mention.value))];
    const allowed = [...base, ...(options.extraAllowed ?? [])];
    // A percentage is only derivable from an explicit "X de Y" (or "X/Y") pair in the source.
    const ratios = extractRatioPairs(source).map(([part, whole]) => (part / whole) * 100);

    for (const a of base) {
        if (options.deriveSumsAndDifferences) {
            for (const b of base) {
                allowed.push(a + b, Math.abs(a - b));
            }
        }
    }

    return extractNumberMentions(text).filter(mention => {
        if (allowed.some(value => sameNumber(value, mention.value))) {
            return false;
        }
        if (mention.isPercent && ratios.some(ratio => Math.abs(ratio - mention.value) <= 0.51)) {
            return false;
        }
        return true;
    });
}

const VALORATIVE_TERMS = [
    "excelente", "excelentes", "otimo", "otima", "otimos", "otimas", "bom", "boa", "bons", "boas",
    "solido", "solida", "solidos", "solidas", "razoavel", "razoaveis", "ruim", "ruins",
    "impressionante", "impressionantes", "notavel", "notaveis", "excepcional", "excepcionais"
];

const BENCHMARK_PHRASES = ["acima da media", "abaixo da media", "para a posicao", "da competicao", "do mercado"];

export function findValorativeTerms(text: string, source: string): string[] {
    const tokens = tokenize(text);
    const sourceTokens = new Set(tokenize(source));
    const found = new Set<string>();

    tokens.forEach((token, index) => {
        const isPartitive = (token === "boa" || token === "boas") && tokens[index + 1]?.startsWith("part");
        if (VALORATIVE_TERMS.includes(token) && !sourceTokens.has(token) && !isPartitive) {
            found.add(token);
        }
    });

    const normalized = normalizeText(text);
    const normalizedSource = normalizeText(source);
    for (const phrase of BENCHMARK_PHRASES) {
        if (normalized.includes(phrase) && !normalizedSource.includes(phrase)) {
            found.add(phrase);
        }
    }

    return [...found];
}

const UNSUPPORTED_TERM_LEXICON: { stem: string; label: string }[] = [
    { stem: "desarm", label: "desarme" },
    { stem: "intercep", label: "interceptação" },
    { stem: "cruzament", label: "cruzamento" },
    { stem: "assistenc", label: "assistência" },
    { stem: "cabece", label: "cabeceio" },
    { stem: "lancament", label: "lançamento" },
    { stem: "escanteio", label: "escanteio" },
    { stem: "resistenc", label: "resistência" },
    { stem: "intensidad", label: "intensidade" },
    { stem: "folego", label: "fôlego" },
    { stem: "stamina", label: "stamina" },
    { stem: "forca", label: "força" }
];

/**
 * Flags actions or physical traits that the answer asserts but the user never
 * mentioned. A sentence that negates the term ("não há dados de resistência")
 * is an admitted limitation, not an unsupported claim, and is ignored.
 */
export function findUnsupportedTerms(text: string, source: string): string[] {
    const sourceTokens = tokenize(source);
    const found = new Set<string>();

    for (const sentence of splitSentences(text)) {
        const tokens = tokenize(sentence);
        if (tokens.some(token => NEGATION_TOKENS.has(token))) {
            continue;
        }
        for (const { stem, label } of UNSUPPORTED_TERM_LEXICON) {
            const mentioned = tokens.some(token => token.startsWith(stem));
            const supplied = sourceTokens.some(token => token.startsWith(stem));
            if (mentioned && !supplied) {
                found.add(label);
            }
        }
    }

    return [...found];
}

const VIEWING_CLAIMS = [
    /\b(assisti|assistimos|assistiu)\b/,
    /\b(vi|vimos) (o|os|a|as) (jogo|jogos|partida|partidas|video|videos|lance|lances)\b/,
    /\banalisei (o|os|a|as) (jogo|jogos|partida|partidas|video|videos)\b/
];

export function findViewingClaims(text: string, source: string): string[] {
    if (/video|clipe|lance|trecho|link|imagem/.test(normalizeText(source))) {
        return [];
    }

    return splitSentences(text)
        .filter(sentence => {
            const normalized = normalizeText(sentence);
            return !/\bnao\b/.test(normalized) && VIEWING_CLAIMS.some(pattern => pattern.test(normalized));
        });
}
