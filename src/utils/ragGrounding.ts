import { findUngroundedNumbers } from "../ai/groundingChecks.ts";
import type { RetrievedChunk } from "../vectorRepository.ts";
import { normalizeText, splitSentences, tokenize } from "./text.ts";

/**
 * Lexical groundedness report for a RAG answer. It measures whether the words,
 * numbers and cited sources of the answer can be found in the retrieved chunks.
 * It is a traceability aid, not a semantic fact check.
 */
export type GroundingReport = {
    isRefusal: boolean;
    checkedClaims: number;
    supportedClaims: number;
    unsupportedClaims: { sentence: string; support: number }[];
    ungroundedNumbers: string[];
    unknownSources: string[];
};

const STOPWORDS = new Set([
    "que", "para", "com", "por", "uma", "uns", "umas", "dos", "das", "nos", "nas", "como", "mais",
    "mas", "pelo", "pela", "pelos", "pelas", "este", "esta", "isso", "essa", "esse", "esses", "essas",
    "seu", "sua", "seus", "suas", "ele", "ela", "eles", "elas", "foi", "ser", "sao", "tem", "ter",
    "entre", "sobre", "quando", "onde", "seja", "ainda", "tambem", "pode", "podem", "cada", "contexto",
    "trecho", "trechos", "fonte", "relatorio", "relatorios", "documento", "informacoes"
]);

const REFUSAL = "nao encontrei informacoes suficientes";
const MIN_CONTENT_TOKENS = 3;

function stem(token: string): string {
    return token.slice(0, 5);
}

function contentStems(text: string): string[] {
    return tokenize(text)
        .filter(token => token.length > 3 && !STOPWORDS.has(token) && !/^\d+$/.test(token))
        .map(stem);
}

/** Sentences with enough content words to be treated as factual statements. */
export function extractCheckableSentences(answer: string): string[] {
    if (normalizeText(answer).includes(REFUSAL)) {
        return [];
    }
    return splitSentences(answer).filter(sentence => contentStems(sentence).length >= MIN_CONTENT_TOKENS);
}

export function checkRagGrounding(
    answer: string,
    retrieved: RetrievedChunk[],
    minSupport = 0.5
): GroundingReport {
    const context = retrieved.map(item => item.chunk).join("\n");
    const contextStems = new Set(contentStems(context));
    const isRefusal = normalizeText(answer).includes(REFUSAL);

    const report: GroundingReport = {
        isRefusal,
        checkedClaims: 0,
        supportedClaims: 0,
        unsupportedClaims: [],
        ungroundedNumbers: [],
        unknownSources: []
    };

    if (isRefusal) {
        return report;
    }

    for (const sentence of splitSentences(answer)) {
        const stems = contentStems(sentence);
        if (stems.length < MIN_CONTENT_TOKENS) {
            continue;
        }

        const support = stems.filter(item => contextStems.has(item)).length / stems.length;
        report.checkedClaims += 1;

        if (support >= minSupport) {
            report.supportedClaims += 1;
        } else {
            report.unsupportedClaims.push({ sentence, support });
        }
    }

    report.ungroundedNumbers = findUngroundedNumbers(answer, context);

    const knownSources = retrieved.map(item => normalizeText(item.source));
    const cited = [...answer.matchAll(/Fonte:\s*([^\]\)\n]+)/g)].map(match => match[1].trim());
    report.unknownSources = [...new Set(cited)].filter(name => {
        const normalized = normalizeText(name);
        return !knownSources.some(source => source.includes(normalized) || normalized.includes(source));
    });

    return report;
}

export function formatGroundingReport(report: GroundingReport): string {
    if (report.isRefusal) {
        return "Verificação de fundamentação: a resposta declarou informação insuficiente; nenhuma afirmação a verificar.";
    }

    const lines = [
        report.checkedClaims === 0
            ? "Verificação de fundamentação (lexical, não semântica): nenhuma afirmação verificável na resposta."
            : `Verificação de fundamentação (lexical, não semântica): ${report.supportedClaims} de ${report.checkedClaims} afirmações com suporte nos trechos recuperados.`
    ];

    for (const claim of report.unsupportedClaims.slice(0, 3)) {
        const text = claim.sentence.length > 160 ? `${claim.sentence.slice(0, 160)}...` : claim.sentence;
        lines.push(`[!] Sem suporte lexical suficiente (${claim.support.toFixed(2)}): "${text}"`);
    }
    if (report.ungroundedNumbers.length > 0) {
        lines.push(`[!] Números ausentes dos trechos recuperados: ${report.ungroundedNumbers.join(", ")}`);
    }
    if (report.unknownSources.length > 0) {
        lines.push(`[!] Fontes citadas que não foram recuperadas: ${report.unknownSources.join(", ")}`);
    }

    return lines.join("\n");
}
