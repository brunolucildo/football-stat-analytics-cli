# What this is
Uma CLI de análise e negociação de jogadores de futebol alimentada por IA, que usa OpenAI para avaliar estatísticas de atletas e analisar propostas de transferência. O projeto implementa múltiplos "personas" (analista esportivo e analista de mercado) que fornecem avaliações estruturadas e recomendações sobre viabilidade de transferências entre clubes.

# Stack
Language(s): TypeScript
Framework / runtime: Node.js (ES modules)
Notable libraries: OpenAI API (gpt-4o-mini), Readline (CLI interativo)
# How it's organized
Code
src/
  index.ts             Entrada principal: demonstra análise de proposta com persona analistaProposta
  chatbot.ts           CLI interativa que aceita system prompt e mantém histórico de conversa
  pesonas.ts           Definições de personas (analistaEsportivo, analistaProposta)
  types.ts             Type History para mensagens
  
  clients/
    openai.ts          Inicializa cliente OpenAI com API key
  
  utils/
    generateWithCritique.ts    Genera resposta + crítica + versão refinada (3 turnos com gpt-4o-mini)
    streamResponse.ts          Faz chamada com stream=true e escreve output em tempo real
    withRetry.ts               Retry com backoff exponencial para erros de rate limit / conexão

.env.example           Template com OPENAI_API_KEY
package.json           Dependências: openai, @types/node
tsconfig.json          Config TypeScript strict=true, target=es2022
# Como funciona: 
O fluxo principal (index.ts) demonstra uma análise de proposta de transferência usando o generateWithCritique: faz um draft da análise, depois pede crítica ao modelo, e se não for "approved", regenera com base na crítica. O chatbot.ts oferece um loop interativo via readline que mantém histórico de conversa e faz streaming de respostas em tempo real. Ambas as funções usam withRetry para resilência contra erros da API.

# How to run it
bash
# Instalação
npm install

# Setup de variáveis de ambiente
npm run env:setup
# Editar .env.local e colocar sua OPENAI_API_KEY

# Executar demonstração de análise de proposta
node --loader ts-node/esm src/index.ts

# Executar chatbot interativo (com system prompt via argumento)
node --loader ts-node/esm src/chatbot.ts "Você é um especialista em futebol"
Requisitos: Node.js 18+, OPENAI_API_KEY válida em .env.local (ou .env)
