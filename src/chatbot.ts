import * as readLine from "node:readline/promises"
import type { History } from "./types.ts"
import { streamResponse } from "./utils/streamResponse.ts"

const systemPrompt = process.argv[2]
const rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout
})
const history: History[] = [];

while(true){
    const userPrompt = await rl.question("Você (digite sua análise ou 'sair' para encerrar): ")
    if (userPrompt.toLowerCase() === "sair") {
        console.log("Encerrado o chatbot. Até logo!")
        break;
    }

    history.push({ role:"user", content: userPrompt});

    process.stdout.write("Analista: Estou analisando, aguarde...\n\n")

    const fullResponse = await streamResponse(history, systemPrompt);
    
    history.push({role: "assistant", content: fullResponse})
}

rl.close();