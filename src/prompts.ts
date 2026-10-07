import { PERSONAS, type PersonaName } from "./pesonas.ts"
import { POLICIES } from "./policies.ts"

export function buildSystemPrompt(persona: PersonaName): string {
    return `${PERSONAS[persona]}\n\nPolítica de análise:\n${POLICIES[persona]}`
}