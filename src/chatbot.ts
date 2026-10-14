import * as readLine from "node:readline/promises"
import * as crypto from 'node:crypto';
import type { Message } from "./utils/types.ts"
import { streamResponse } from "./utils/streamResponse.ts"
import { ContextWindow } from "./contextWindow.ts";
import { MessageRepository } from "./messageRepository.ts";

const systemPrompt = process.argv[2];
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
    
    messageRepository.save(
        windowId, 
        contextWindow.addUserMessage(userPrompt)
    );

    process.stdout.write("Analista: Estou analisando, aguarde...\n\n")

    const fullResponse = await streamResponse(contextWindow.getMessages(), systemPrompt);
    
    messageRepository.save(
        windowId, 
        contextWindow.addAssistantMessage(fullResponse)
    );
}

console.log(`\n\n -------------- \nIdentificador da sessão: ${windowId}\n ---------------------------`);

rl.close();