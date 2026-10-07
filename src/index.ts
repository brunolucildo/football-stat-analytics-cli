import { generateWithCritique } from './utils/generateWithCritique.ts';
import { withRetry } from './utils/withRetry.ts';
import { PERSONAS } from './pesonas.ts';

const offer = `Olá, equipe do Palmeiras,
                    Gostaríamos de manifestar nosso interesse na contratação do atleta Gabriel Martins, atualmente vinculado ao clube.
                    Após analisarmos seu desempenho recente e seu perfil, entendemos que o jogador possui características alinhadas ao nosso projeto esportivo. Gostaríamos de saber sobre a disponibilidade do atleta para uma possível transferência e quais seriam as condições iniciais para avançarmos nas negociações.
                    Oferecemos de início o valor de 1.000.000,00 em Euros.
                    Ficamos à disposição para conversar sobre valores, formato da operação e demais condições.
                    Atenciosamente,
                    Departamento de Futebol
                    Real Madrid`

function offerAnalysisPrompt(
    params: {
        offerText: string;
        clientType: "national team" | "international team";
    }
){
    return `
                Leve em consideração o time que enviou a proposta ${params.clientType === "international team" ? "time de fora do país" : "time nacional"}

                Se o time for nacional, adote uma postura mais rígida, pois o jogador está indo para um possível concorrente no campeonato.
                Se for um time de fora, adote uma postura menos rígida, porém aumente a margem em relação ao valor da proposta, devido ao poder aquisitivo do exterior.  
                
                Proposta:${params.offerText}`.trim();
}

async function chatWithPersona( 
    persona: keyof typeof PERSONAS,
    question: string
){
    await withRetry(async () => {
        const systemPrompt = PERSONAS[persona];
        const response = await generateWithCritique(systemPrompt,question);

        console.log(`\n\n[${persona.toUpperCase()}] resposta:\n`, response)
    })
}

await chatWithPersona("analistaProposta",offerAnalysisPrompt({
        offerText: offer, 
        clientType: "international team",
    })
)