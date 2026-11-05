import type { Message } from "../utils/types.ts";
import { aggregateAthleteSamples, type ConsensusResult } from "./consensus.ts";
import { generateSamples } from "./generate.ts";

/** Samples must differ a little for the vote to mean anything; 0.5 keeps them on topic. */
export const DEFAULT_SAMPLING_TEMPERATURE = 0.5;
/**
 * Off by default (1 = a single streamed answer). The experiments in the README show that the vote
 * raises the share of valid answers but does not reliably make the scores more stable, and it costs
 * three times the generation tokens. Set CONSISTENCY_SAMPLES=3 to enable it.
 */
export const DEFAULT_CONSISTENCY_SAMPLES = 1;

export function configuredSamples(): number {
    const value = Number(process.env.CONSISTENCY_SAMPLES ?? DEFAULT_CONSISTENCY_SAMPLES);
    return Number.isInteger(value) && value >= 1 && value <= 9 ? value : DEFAULT_CONSISTENCY_SAMPLES;
}

export async function generateConsensus(
    system: string,
    history: Message[],
    userEvidence: string,
    samples = configuredSamples(),
    temperature = DEFAULT_SAMPLING_TEMPERATURE
): Promise<ConsensusResult> {
    const answers = await generateSamples(system, history, samples, temperature);
    return aggregateAthleteSamples(answers, userEvidence);
}
