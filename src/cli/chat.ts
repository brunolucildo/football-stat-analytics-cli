import * as readLine from "node:readline/promises"
import * as crypto from 'node:crypto';
import { streamResponse } from "../ai/chat/streamResponse.ts"
import { ContextWindow } from "../chat/contextWindow.ts";
import { MessageRepository } from "../repositories/messageRepository.ts";
import { maybeCompress } from "../ai/history/maybeCompress.ts";
import { stitchContext } from "../chat/stitchContext.ts";
import { validateInput } from "../ai/safeguards/validateInput.ts";
import { blockedWords, hallucinationSignals } from "../ai/safeguards/blockedWords.ts";
import { validateOutput } from "../ai/safeguards/validateOutputs.ts";
import { isPersonaName } from "../ai/prompts/personas.ts";
import { buildSystemPrompt } from "../ai/prompts/prompts.ts";

const promptArgument = process.argv[2];
const systemPrompt = promptArgument && isPersonaName(promptArgument)
    ? buildSystemPrompt(promptArgument)
    : promptArgument;
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

    const fullResponse = await streamResponse(stitched, systemPrompt);
    
    const outputResult = validateOutput(fullResponse, hallucinationSignals);
    if (!outputResult.isValid) {
        console.log("Saída inválida:", outputResult.errors.join(", "));
        continue;
    } 

    messageRepository.save(
        windowId, 
        contextWindow.addAssistantMessage(fullResponse)
    );
}

console.log(`\n\n -------------- \nIdentificador da sessão: ${windowId}\n ---------------------------`);

rl.close();