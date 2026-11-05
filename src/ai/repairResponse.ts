import type { ValidationResult } from "../utils/types.ts";

export type RepairOutcome = {
    response: string;
    validation: ValidationResult;
    /** Number of regeneration requests that were needed (0 = first answer was valid). */
    repairs: number;
};

/**
 * Validates a response and, when it fails, asks for a corrected version
 * with the validation errors as feedback. Stops after `maxRepairs` attempts so
 * the cost and the latency stay bounded; the caller decides what to do with a
 * response that is still invalid.
 */
export async function validateWithRepair(params: {
    response: string;
    validate: (response: string) => ValidationResult | Promise<ValidationResult>;
    regenerate: (previousResponse: string, errors: string[]) => Promise<string>;
    maxRepairs?: number;
}): Promise<RepairOutcome> {
    const maxRepairs = params.maxRepairs ?? 1;
    let response = params.response;
    let validation = await params.validate(response);
    let repairs = 0;

    while (!validation.isValid && repairs < maxRepairs) {
        response = await params.regenerate(response, validation.errors);
        validation = await params.validate(response);
        repairs += 1;
    }

    return { response, validation, repairs };
}
