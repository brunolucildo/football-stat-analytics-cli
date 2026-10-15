# Football Stat Analytics CLI

CLI experimental para analisar desempenho de atletas e propostas de transferência com apoio da API da OpenAI. As análises são geradas pelo modelo `gpt-4o-mini` a partir das informações fornecidas pelo usuário; o projeto não busca estatísticas em bases externas.

## Recursos

- **Análise esportiva:** avalia Pace, Shot, Pass, Dribble, Defence, Physic e Overall. Cada atributo recebe uma nota inteira de 0 a 99 e uma justificativa objetiva, em um JSON definido pelo prompt.
- **Análise de propostas:** considera valor de mercado e oferta, idade, potencial, desempenho, posição, contrato e condições da negociação quando essas informações forem fornecidas. A recomendação é `ACEITAR`, `NEGOCIAR` ou `RECUSAR`.
- **Personas e políticas:** cada analista tem instruções e critérios próprios. As análises devem se limitar aos dados informados, sem inventar estatísticas ou fatos.
- **Revisão com crítica:** o fluxo de análise de proposta gera uma resposta inicial, solicita uma crítica ao modelo e, se necessário, pede uma versão revisada.
- **Chat interativo com streaming:** permite conversar com o analista esportivo ou usar outro prompt de sistema, mantendo o histórico durante a sessão e exibindo a resposta à medida que é gerada.
- **Tentativas com backoff:** o fluxo de geração com crítica repete chamadas em erros de limite de taxa e de conexão, além de erros de API elegíveis.

> As notas e recomendações são produzidas por um modelo de linguagem e não são validadas contra dados oficiais. Forneça contexto suficiente e revise os resultados antes de usá-los em decisões.

## Requisitos

- Node.js **22.6 ou superior** (para executar arquivos TypeScript com remoção de tipos nativa).
- Uma chave de API da OpenAI com acesso ao `gpt-4o-mini`.

## Instalação e configuração

```bash
npm install
```

Crie `.env.local` a partir do exemplo e preencha `OPENAI_API_KEY` com sua chave:

```bash
npm run env:setup
```

O script `env:setup` usa o comando `copy` do Windows. Em macOS ou Linux, crie o arquivo manualmente:

```bash
cp .env.example .env.local
```

Não compartilhe nem versione sua chave de API. O arquivo `.env.local` é lido pelo Node ao executar os comandos abaixo.

## Como executar

### Demonstração de análise de proposta

```bash
node --experimental-strip-types --env-file=.env.local src/index.ts
```

O exemplo em `src/index.ts` analisa uma proposta fictícia dirigida ao Palmeiras e classifica o clube interessado como internacional. A postura para clubes nacionais e internacionais é ajustada no prompt da proposta.

### Chat interativo

```bash
node --experimental-strip-types --env-file=.env.local src/chatbot.ts "Você é um especialista em análise de desempenho no futebol."
```

Digite uma solicitação no terminal. Para encerrar, digite `sair`. Se nenhum prompt de sistema for informado, o chatbot usa a persona de analista esportivo.

## Estrutura do projeto

```text
src/
├── index.ts                    # Exemplo executável de análise de proposta
├── chatbot.ts                  # Chat interativo com histórico e streaming
├── pesonas.ts                  # Personas disponíveis
├── policies.ts                 # Critérios e formatos esperados para cada análise
├── prompts.ts                  # Composição do prompt de sistema
├── types.ts                    # Tipos compartilhados do histórico
├── clients/
│   └── openai.ts               # Cliente da API OpenAI
└── utils/
    ├── generateWithCritique.ts # Geração, crítica e revisão da resposta
    ├── streamResponse.ts       # Geração em streaming
    └── withRetry.ts            # Retentativas com backoff exponencial
```

## Tecnologias

- TypeScript com módulos ES.
- Node.js com suporte nativo à remoção de tipos.
- OpenAI Node SDK e API `gpt-4o-mini`.
- `node:readline/promises` para a interface interativa no terminal.
