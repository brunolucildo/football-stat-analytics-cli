import type { ValidationResult } from "../utils/types.ts";
import { normalizeText } from "../utils/text.ts";
import type { PersonaName } from "./personas.ts";
import {
    validateAthleteAssessment,
    validateFreeTextAnalysis,
    validateTransferProposal
} from "./outputSchemas.ts";

export type OutputValidationOptions = {
    /** Persona whose output contract should be enforced. Omit for custom system prompts. */
    persona?: PersonaName;
    /** Evidence supplied by the user; enables groundedness checks when present. */
    userInput?: string;
};

export function validateOutput(
    response: string,
    hallucinationSignals: string[],
    options: OutputValidationOptions = {}
): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const normalizedResponse = normalizeText(response);

    const triggered = hallucinationSignals.filter(signal => normalizedResponse.includes(normalizeText(signal)));
    if (triggered.length > 0) {
        errors.push(`Output contains hallucination signals: ${triggered.join(", ")}.`);
    }

    const personaResult = validateForPersona(response, options);
    errors.push(...personaResult.errors);
    warnings.push(...(personaResult.warnings ?? []));

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

function validateForPersona(response: string, options: OutputValidationOptions): ValidationResult {
    switch (options.persona) {
        case "analistaEsportivo":
            return validateAthleteAssessment(response, options.userInput);
        case "analistaProposta":
            return validateTransferProposal(response, options.userInput);
        case "analistaSV":
            return validateFreeTextAnalysis(response, options.userInput);
        default:
            return { isValid: true, errors: [] };
    }
}
