import * as readLine from "node:readline/promises"
import * as crypto from 'node:crypto';
import { streamResponse } from "./ai/streamResponse.ts"
import { ContextWindow } from "./contextWindow.ts";
import { MessageRepository } from "./messageRepository.ts";
import { maybeCompress } from "./ai/maybeCompress.ts";
import { stitchContext } from "./utils/stitchContext.ts";
import { validateInput } from "./ai/validateInput.ts";
import { blockedWords, hallucinationSignals } from "./ai/blockedWords.ts";
import { validateComplete } from "./ai/fullValidation.ts";
import { openAiJudge, semanticVerificationEnabled } from "./ai/openaiJudge.ts";
import { isPersonaName, type PersonaName } from "./ai/personas.ts";
import { buildSystemPrompt } from "./ai/prompts.ts";
import { validateWithRepair } from "./ai/repairResponse.ts";
import { regenerateWithFeedback } from "./ai/regenerate.ts";
import { configuredSamples, generateConsensus } from "./ai/consensusGenerate.ts";

const promptArgument = process.argv[2];
const systemPrompt = promptArgument && isPersonaName(promptArgument)
    ? buildSystemPrompt(promptArgument)
    : promptArgument;
// Without an argument streamResponse falls back to the sports analyst persona; a custom
// system prompt has no output contract, so only the textual signals are checked for it.
const persona: PersonaName | undefined = !promptArgument
    ? "analistaEsportivo"
    : isPersonaName(promptArgument) ? promptArgument : undefined;
// Structured (JSON) personas run deterministically to keep scores stable between runs.
const temperature = persona === "analistaEsportivo" || persona === "analistaProposta" ? 0 : undefined;
const windowId = process.argv[3] || crypto.randomUUID();

const rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout
})

const contextWindow = new ContextWindow();
const messageRepository = new MessageRepository();

const initialMessages = messageRepository.load(windowId);
initialMessages.forEach(message => {
    contextWindow.restore(message.role, message.content);
});


while(true){
    const userPrompt = await rl.question("Você (digite sua análise ou 'sair' para encerrar): ")

    if (userPrompt.toLowerCase() === "sair") {
        console.log("Encerrado o chatbot. Até logo!")
        break;
    }

    const inputResult = validateInput(userPrompt, blockedWords);
    if (!inputResult.isValid) {
        console.log("Entrada inválida:", inputResult.errors.join(", "));
        continue;
    }
    
    messageRepository.save(
        windowId, 
        contextWindow.addUserMessage(userPrompt)
    );

    const compressed = await maybeCompress(contextWindow);
    const stitched = stitchContext({
        recentMessages: compressed,
    });

    process.stdout.write("Analista: Estou analisando, aguarde...\n\n")

    const userEvidence = contextWindow
        .getMessages()
        .filter(message => message.role === "user")
        .map(message => message.content)
        .join("\n");

    let streamedResponse: string;
    const samples = persona === "analistaEsportivo" ? configuredSamples() : 1;
    if (samples > 1) {
        // Several answers are generated and the median score of each attribute is kept,
        // which makes the scores more stable between runs. The result is shown at the end.
        const consensus = await generateConsensus(
            systemPrompt ?? buildSystemPrompt("analistaEsportivo"),
            stitched,
            userEvidence,
            samples
        );
        streamedResponse = consensus.response;
        console.log(streamedResponse);
        console.log(
            `\n(consenso entre ${consensus.validSamples} de ${consensus.totalSamples} respostas válidas; ` +
            `maior dispersão de score: ${Math.max(0, ...Object.values(consensus.spread))})`
        );
    } else {
        streamedResponse = await streamResponse(stitched, systemPrompt, temperature);
    }

    const outcome = await validateWithRepair({
        response: streamedResponse,
        validate: response => validateComplete(response, {
            persona,
            userEvidence,
            hallucinationSignals,
            judge: semanticVerificationEnabled() ? openAiJudge : undefined
        }),
        regenerate: (previousResponse, errors) => {
            console.log("\n\nResposta rejeitada pela validação; solicitando correção:", errors.join(" | "));
            return regenerateWithFeedback(systemPrompt ?? buildSystemPrompt("analistaEsportivo"), stitched, previousResponse, errors);
        }
    });

    if (!outcome.validation.isValid) {
        console.log("\nSaída inválida:", outcome.validation.errors.join(", "));
        continue;
    }

    if (outcome.repairs > 0) {
        console.log(`\nResposta corrigida:\n${outcome.response}`);
    }
    if (outcome.validation.warnings?.length) {
        console.log("\nAvisos de validação:", outcome.validation.warnings.join(" | "));
    }

    messageRepository.save(
        windowId,
        contextWindow.addAssistantMessage(outcome.response)
    );
}

console.log(`\n\n -------------- \nIdentificador da sessão: ${windowId}\n ---------------------------`);

rl.close();