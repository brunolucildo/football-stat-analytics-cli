import * as crypto from 'node:crypto';
import { generateWithCritique } from './utils/generateWithCritique.ts';
import type { PersonaName } from './utils/pesonas.ts';
import { buildSystemPrompt } from './utils/prompts.ts';
import { OFFER } from './utils/offers.ts';
import { ContextWindow } from './contextWindow.ts';
import { summarizeHistory } from './utils/summarizeHistory.ts';
import { MessageRepository } from './messageRepository.ts';

const windowId = process.argv[2] || crypto.randomUUID();
const contextWindow = new ContextWindow();
const messageRepository = new MessageRepository();

console.log(`\n\n -------------- \nIniciando sessão de análise de propostas de transferência de atletas. Identificador da sessão: ${windowId}\n ---------------------------`);

const initialMessages = messageRepository.load(windowId);
if (initialMessages.length > 0) {
    console.log(`\n\n -------------- \nRestaurando histórico de mensagens da sessão anterior. Identificador da sessão: ${windowId}\n ---------------------------`);
    console.log(`\n\n -------------- \n${initialMessages.length} mensagens restauradas.\n ---------------------------`);
    initialMessages.forEach(message => {
        contextWindow.restore(message.role, message.content);
    });
 }

function offerAnalysisPrompt(
    params: {
        offerText: string;
        clientType: "national team" | "international team";
    }
){
    return ` Contexto da negociação:
                - Clube vendedor: Palmeiras.
                - Atleta: Gabriel Martins.
                - Valor de mercado estimado: € 1.600.000,00.
                - O Palmeiras não tem interesse em vender o atleta por um valor significativamente inferior ao seu valor de mercado estimado.
                - Clube interessado: ${params.clientType === "international team" ? "Internacional, sediado fora do Brasil." : "Nacional, sediado no Brasil."}

                Critérios de avaliação:
                1. Valor da proposta:
                Compare o valor oferecido com o valor de mercado estimado do atleta. Considere a diferença percentual e o impacto financeiro da negociação.

                2. Clube interessado:
                ${params.clientType === "national team"
                    ? `Adote uma postura mais rígida nas negociações, pois a transferência para um clube nacional pode fortalecer um concorrente direto do Palmeiras. Exija condições financeiras mais vantajosas e considere o impacto esportivo da transferência.`
                    : `Adote uma postura menos rígida em relação à negociação, mas exija uma margem financeira adicional em razão do maior poder aquisitivo geralmente associado a clubes internacionais. Não presuma que todo clube estrangeiro possui maior capacidade financeira sem evidências. Considere também os riscos e as condições de pagamento.`}

                Proposta recebida:
                <proposta>
                ${params.offerText}
                </proposta>
            `.trim();
}

async function chatWithPersona( 
    persona: PersonaName,
    question: string
){
    const systemPrompt = buildSystemPrompt(persona);
    const userMessage = contextWindow.addUserMessage(question);
    messageRepository.save(windowId, userMessage);
    const response = await generateWithCritique(systemPrompt, contextWindow);
    const assistantMessage = contextWindow.addAssistantMessage(response);
    messageRepository.save(windowId, assistantMessage);
    console.log(`\n\n[${persona.toUpperCase()}] resposta:\n`, response)    
}

await chatWithPersona("analistaProposta",offerAnalysisPrompt({
        offerText: OFFER.offer1, 
        clientType: "international team",
    })
)

await chatWithPersona("analistaProposta",offerAnalysisPrompt({
        offerText: OFFER.offer2, 
        clientType: "international team",
    })
)

await chatWithPersona("analistaProposta",offerAnalysisPrompt({
        offerText: OFFER.offer3, 
        clientType: "international team",
    })
)

console.log("\n\n -------------- \nResumo do histórico de mensagens:\n ---------------------------");
console.log(await summarizeHistory(contextWindow));
    
console.log("\n\n -------------- \nPara resumir essa sessão, utilize o seguinte identificador: ", windowId);