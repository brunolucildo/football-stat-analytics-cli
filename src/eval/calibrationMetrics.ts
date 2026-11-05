export type Decision = "accept" | "reject" | "unavailable";

export type CalibrationOutcome = {
    id: string;
    expected: "accept" | "reject";
    decision: Decision;
};

export type CalibrationMetrics = {
    total: number;
    unavailable: number;
    /** Rejected and should have been. */
    truePositives: number;
    /** Accepted although it should have been rejected (a statement without support got through). */
    falseNegatives: number;
    /** Accepted and should have been. */
    trueNegatives: number;
    /** Rejected although it was supported (a correct statement was blocked). */
    falsePositives: number;
    /** Share of unsupported statements that the verifier rejected. */
    rejectionRecall: number | null;
    /** Share of supported statements that the verifier wrongly rejected. */
    falseRejectionRate: number | null;
    accuracy: number | null;
    misclassified: string[];
};

function ratio(numerator: number, denominator: number): number | null {
    return denominator === 0 ? null : numerator / denominator;
}

export function scoreCalibration(outcomes: CalibrationOutcome[]): CalibrationMetrics {
    const decided = outcomes.filter(outcome => outcome.decision !== "unavailable");
    const count = (expected: string, decision: string) =>
        decided.filter(outcome => outcome.expected === expected && outcome.decision === decision).length;

    const truePositives = count("reject", "reject");
    const falseNegatives = count("reject", "accept");
    const trueNegatives = count("accept", "accept");
    const falsePositives = count("accept", "reject");

    return {
        total: outcomes.length,
        unavailable: outcomes.length - decided.length,
        truePositives,
        falseNegatives,
        trueNegatives,
        falsePositives,
        rejectionRecall: ratio(truePositives, truePositives + falseNegatives),
        falseRejectionRate: ratio(falsePositives, falsePositives + trueNegatives),
        accuracy: ratio(truePositives + trueNegatives, decided.length),
        misclassified: decided.filter(outcome => outcome.expected !== outcome.decision).map(outcome => outcome.id)
    };
}
