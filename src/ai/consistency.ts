import { ATHLETE_ATTRIBUTES, parseStrictJsonObject, validateAthleteAssessment } from "./outputSchemas.ts";

export type ConsistencyReport = {
    runs: number;
    validRuns: number;
    /** True when every valid run produced exactly the same score for every attribute. */
    identicalScores: boolean;
    /** Largest difference between the highest and lowest score of any attribute. */
    maxSpread: number;
    spreadByAttribute: Record<string, number>;
};

function extractScores(response: string): Record<string, number> | undefined {
    const parsed = parseStrictJsonObject(response).value;
    if (!parsed) {
        return undefined;
    }

    const scores: Record<string, number> = {};
    for (const attribute of ATHLETE_ATTRIBUTES) {
        const entry = parsed[attribute] as { score?: unknown } | undefined;
        if (typeof entry?.score === "number") {
            scores[attribute] = entry.score;
        }
    }
    return scores;
}

/**
 * Compares several answers to the same athlete input. Structure and scores are
 * measured objectively; the wording of the justifications is not compared.
 */
export function compareAthleteRuns(responses: string[], userInput?: string): ConsistencyReport {
    const valid = responses.filter(response => validateAthleteAssessment(response, userInput).isValid);
    const scoreSets = valid
        .map(extractScores)
        .filter((scores): scores is Record<string, number> => scores !== undefined);

    const spreadByAttribute: Record<string, number> = {};
    for (const attribute of ATHLETE_ATTRIBUTES) {
        const values = scoreSets
            .map(scores => scores[attribute])
            .filter((value): value is number => value !== undefined);
        if (values.length > 0) {
            spreadByAttribute[attribute] = Math.max(...values) - Math.min(...values);
        }
    }

    const maxSpread = Math.max(0, ...Object.values(spreadByAttribute));

    return {
        runs: responses.length,
        validRuns: valid.length,
        identicalScores: valid.length > 0 && maxSpread === 0,
        maxSpread,
        spreadByAttribute
    };
}
