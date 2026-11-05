import { ATHLETE_ATTRIBUTES, parseStrictJsonObject, validateAthleteAssessment } from "./outputSchemas.ts";

/**
 * Self-consistency for the athlete assessment. Several answers to the same input
 * are generated, only those that pass the deterministic validation take part, and
 * the final score of each attribute is the median of their scores. Because the
 * median of an odd number of samples is always one of them, the score and the
 * justification that goes with it come from the same validated answer.
 */

type Entry = { score: number | null; justification: string };

export type ConsensusResult = {
    response: string;
    totalSamples: number;
    validSamples: number;
    /** True when the response was built by voting; false when a single answer was kept. */
    aggregated: boolean;
    /** Highest minus lowest score per attribute among the valid samples (0 = unanimous). */
    spread: Record<string, number>;
};

export function aggregateAthleteSamples(samples: string[], userEvidence: string): ConsensusResult {
    const candidates = samples
        .map(text => ({ text, parsed: parseStrictJsonObject(text).value, valid: validateAthleteAssessment(text, userEvidence).isValid }))
        .filter(candidate => candidate.valid && candidate.parsed);

    const fallback = (text: string): ConsensusResult => ({
        response: text,
        totalSamples: samples.length,
        validSamples: candidates.length,
        aggregated: false,
        spread: {}
    });

    if (candidates.length === 0) {
        return fallback(samples[0] ?? "");
    }
    if (candidates.length === 1) {
        return fallback(candidates[0].text);
    }

    const result: Record<string, Entry> = {};
    const spread: Record<string, number> = {};

    for (const attribute of ATHLETE_ATTRIBUTES) {
        const entries = candidates.map(candidate => candidate.parsed![attribute] as Entry);
        const insufficient = entries.filter(entry => entry.score === null);

        if (insufficient.length * 2 > entries.length) {
            result[attribute] = insufficient[0];
            spread[attribute] = 0;
            continue;
        }

        const numeric = entries.filter(entry => entry.score !== null).sort((a, b) => a.score! - b.score!);
        result[attribute] = numeric[Math.floor((numeric.length - 1) / 2)];
        spread[attribute] = numeric[numeric.length - 1].score! - numeric[0].score!;
    }

    // Medians of the attributes can drift outside the median of overall: keep it inside the range.
    const components = ATHLETE_ATTRIBUTES
        .filter(attribute => attribute !== "overall")
        .map(attribute => result[attribute].score)
        .filter((score): score is number => score !== null);
    const overall = result.overall;
    if (overall.score !== null && components.length > 0) {
        const clamped = Math.min(Math.max(overall.score, Math.min(...components)), Math.max(...components));
        result.overall = { ...overall, score: clamped };
    }

    const response = JSON.stringify(result, null, 2);
    if (!validateAthleteAssessment(response, userEvidence).isValid) {
        return fallback(candidates[0].text);
    }

    return {
        response,
        totalSamples: samples.length,
        validSamples: candidates.length,
        aggregated: true,
        spread
    };
}
