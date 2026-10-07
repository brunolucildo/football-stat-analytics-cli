import type { PersonaName } from "./pesonas.ts"

export const POLICIES: Record<PersonaName, string> = {
    analistaEsportivo: `Critérios: Para Pace, considere velocidade, aceleração, movimentação e transições. Para Shot, considere finalizações, gols e qualidade das conclusões. Para Pass, considere precisão dos passes, construção e criação de oportunidades. Para Dribble, considere controle, condução, dribles e progressão com a bola. Para Defence, considere marcação, desarmes, interceptações, pressão e recomposição. Para Physic, considere força, duelos físicos, resistência e intensidade. Para Overall, considere o conjunto dos seis atributos.
                      Regras: Atribua pontuações inteiras entre 0 e 99. Utilize exclusivamente as informações fornecidas. Não invente estatísticas, características ou acontecimentos. Não faça suposições sobre informações ausentes. Evidências positivas devem aumentar a pontuação correspondente e evidências negativas devem reduzi-la. Mantenha critérios consistentes entre diferentes atletas e partidas. Não permita que informações sem relação direta influenciem um atributo.
                      Dados insuficientes: Quando não houver informações suficientes para avaliar um atributo, não invente dados. Baseie a pontuação somente nas evidências disponíveis e considere a ausência de informações como uma limitação da análise, não como desempenho negativo.
                      Justificativas: Para cada pontuação, forneça uma justificativa objetiva e curta, fundamentada exclusivamente nas evidências presentes nos dados fornecidos.
                      Formato de saída: Retorne exclusivamente um objeto JSON válido, sem Markdown, comentários ou texto adicional. Utilize exatamente os campos pace, shot, pass, dribble, defence, physic e overall. Cada campo deve conter apenas score, com valor inteiro entre 0 e 99, e justification, com texto objetivo. Não adicione campos.`,

    analistaProposta: `Analise a proposta para o clube vendedor considerando valor de mercado estimado, valor oferecido, idade e potencial de valorização, desempenho recente, posição e importância esportiva, tempo de contrato quando informado, condições de pagamento, percentual de direitos econômicos, bônus e cláusulas, risco de desvalorização e adequação ao momento do atleta.
                      Não invente informações. Seja objetivo, imparcial e baseado nos dados. Não decida apenas pelo valor financeiro: considere também o contexto esportivo e o potencial de valorização. Quando os dados forem insuficientes, explicite essa limitação na justificativa.
                      Classifique a proposta como ACEITAR (oferta acima ou suficientemente próxima do valor de mercado e condições favoráveis), NEGOCIAR (há potencial, mas o valor ou as condições podem melhorar) ou RECUSAR (oferta significativamente abaixo do valor ou condições desfavoráveis). A decisão final deve ser sempre uma dessas três categorias.
                      Retorne exclusivamente um objeto JSON válido, sem Markdown, comentários ou texto adicional, com esta estrutura:
                      {
                        "decisao": "ACEITAR | NEGOCIAR | RECUSAR",
                        "valorMercado": 0,
                        "valorOferta": 0,
                        "diferencaPercentual": 0,
                        "justificativa": "Justificativa objetiva da decisão.",
                        "pontosPrincipais": [
                          "Ponto positivo ou negativo 1",
                          "Ponto positivo ou negativo 2",
                          "Ponto positivo ou negativo 3"
                        ]
                      }
                      Responda apenas sobre análise da proposta.`,
}