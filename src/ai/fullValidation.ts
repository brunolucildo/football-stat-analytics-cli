import type { ValidationResult } from "../utils/types.ts";
import type { PersonaName } from "./personas.ts";
import { extractClaims, verifyClaims, type SemanticJudge } from "./semanticVerifier.ts";
import { validateOutput } from "./validateOutputs.ts";

/**
 * Structural and lexical validation first (free, deterministic); the semantic
 * judge runs only for the JSON personas and only when the cheap checks passed,
 * so a response that is already rejected does not cost an extra request.
 */
export async function validateComplete(
    response: string,
    params: {
        persona?: PersonaName;
        userEvidence: string;
        hallucinationSignals: string[];
        judge?: SemanticJudge;
    }
): Promise<ValidationResult> {
    const cheap = validateOutput(response, params.hallucinationSignals, {
        persona: params.persona,
        userInput: params.userEvidence
    });

    if (!cheap.isValid || !params.judge) {
        return cheap;
    }

    const claims = extractClaims(response, params.persona);
    const { result } = await verifyClaims(claims, params.userEvidence, params.judge);

    return {
        isValid: result.isValid,
        errors: result.errors,
        warnings: [...(cheap.warnings ?? []), ...(result.warnings ?? [])]
    };
}
