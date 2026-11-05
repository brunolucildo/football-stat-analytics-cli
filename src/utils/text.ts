export function normalizeText(text: string): string {
    return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function splitSentences(text: string): string[] {
    return text
        .split(/(?<=[.!?;])\s+|\n+/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0);
}

export function tokenize(text: string): string[] {
    return normalizeText(text).match(/[a-z0-9]+/g) ?? [];
}
