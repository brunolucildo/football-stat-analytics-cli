# Football Stat Analytics CLI

An experimental command-line application for football analysis powered by the OpenAI API. It can extract text from local PDF reports, index that text as embeddings in SQLite, and answer questions using the most relevant passages. It also includes an interactive streaming chatbot.

## Features

- **PDF report ingestion:** extracts text from the configured reports in `relatorios/`, translates it from Spanish to Brazilian Portuguese, splits it into chunks, generates embeddings, and stores them in `vector_db.db`.
- **Retrieval-augmented answers (RAG):** embeds a question, retrieves the five most similar stored chunks, and asks the model to answer using that context.
- **Interactive streaming chat:** streams responses to the terminal and supports a custom system prompt or the default sports-analyst persona.
- **Persistent conversation history:** stores user and assistant messages in a local SQLite database and restores them when the same session ID is used again.
- **Context management:** estimates token usage and summarizes older messages when the interactive chat's context reaches its configured threshold.
- **Input and output checks:** applies basic blocked-word checks to user messages and checks generated responses for configured hallucination signals.
- **AI personas and policies:** includes sports-performance, transfer-market, and Scout Vision (SV) instructions.

> This project is experimental. Model-generated answers are not verified against official statistics or market data. PDF ingestion extracts text and does not perform OCR; image-only or scanned reports may not produce usable text. The input and output checks are simple safeguards, not a substitute for reviewing results.

## Requirements

- Node.js **22.6 or later**, for native TypeScript type stripping and the built-in SQLite module.
- An OpenAI API key with access to `gpt-4o-mini`.

## Installation and configuration

Install the dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example`, then set `OPENAI_API_KEY` to your API key. On Windows, run:

```powershell
npm run env:setup
```

On macOS or Linux, use:

```bash
cp .env.example .env.local
```

Edit `.env.local` and replace the placeholder value. Do not share or commit your API key. Node loads this file when run with the `--env-file` option in the commands below.

## Usage

### Index the PDF reports

```bash
node --experimental-strip-types --env-file=.env.local src/ingest.ts
```

The ingest entry point automatically reads every PDF file in `relatorios/`; add or remove reports in that directory to control what gets indexed. Other file types and subdirectories are ignored. The PDF files are not included in the repository, so place the reports in `relatorios/` before running ingestion.

The extracted text is translated from Spanish to Brazilian Portuguese with `gpt-4o-mini`, split into chunks, embedded with OpenAI, and saved in `vector_db.db`. Translation errors stop ingestion rather than indexing untranslated report text. This database persists between runs. Running ingestion again inserts the configured reports again; it does not replace or deduplicate previously indexed chunks.

### Ask a question about indexed reports

```bash
node --experimental-strip-types --env-file=.env.local src/index.ts
```

The question is currently defined directly in `src/index.ts`. Change that string to ask a different question. Run PDF ingestion first so the vector database contains report content.

### Start the interactive chat

```bash
node --experimental-strip-types --env-file=.env.local src/chatbot.ts
```

By default, the chat uses the sports-performance analyst persona. To use the Scout Vision methodology persona, pass `analistaSV` as the first argument:

```bash
node --experimental-strip-types --env-file=.env.local src/chatbot.ts analistaSV
```

For a useful SV analysis, include the player's position, team playing model, match context, and relevant observations, statistics, or match clips in your chat. The persona does not fetch or watch matches; it only analyzes information supplied in the conversation. For progress tracking, provide comparable quantitative and qualitative indicators from multiple periods.

You can also provide a custom system prompt as the first argument. When resuming a chat that uses a named persona, pass the session ID as the second argument:

```bash
node --experimental-strip-types --env-file=.env.local src/chatbot.ts analistaSV <session-id>
```

Use `sair` to end the chat. The application prints the session ID when it exits. Pass that ID as the second argument, after the system prompt, to restore the conversation:

```bash
node --experimental-strip-types --env-file=.env.local src/chatbot.ts "You are a football performance analyst." <session-id>
```

The application creates `pos_ia-m3.db` in the current working directory and creates its `messages` table if needed. Keep this file to retain conversation history.

### Example chatbot interaction

The default `analistaEsportivo` persona returns a JSON assessment. The scores below are illustrative: they show the response shape, not a fixed calculation from the event counts.

```text
Você (digite sua análise ou 'sair' para encerrar): Avalie este ponta: em 70 minutos, registrou 7 acelerações em transições ofensivas, completou 3 de 5 dribles, acertou 6 de 8 passes progressivos, finalizou 4 vezes (2 no alvo e 1 gol), ganhou 4 de 6 duelos defensivos e 5 de 8 duelos físicos.

Analista: {
  "pace": {
    "score": 68,
    "justification": "As sete acelerações em transições ofensivas indicam participação em ações de progressão."
  },
  "shot": {
    "score": 72,
    "justification": "As quatro finalizações, duas no alvo e um gol fornecem evidências positivas de conclusão."
  },
  "pass": {
    "score": 68,
    "justification": "Acertar seis de oito passes progressivos indica contribuição para a progressão da equipe."
  },
  "dribble": {
    "score": 62,
    "justification": "Completou três de cinco dribles, com sucesso em parte das tentativas."
  },
  "defence": {
    "score": 60,
    "justification": "Ganhou quatro de seis duelos defensivos, evidência de contribuição defensiva nesta amostra."
  },
  "physic": {
    "score": 60,
    "justification": "Ganhou cinco de oito duelos físicos; não há dados de resistência ou intensidade ao longo do jogo."
  },
  "overall": {
    "score": 64,
    "justification": "Síntese dos seis atributos com evidências disponíveis nesta amostra."
  }
}

Você (digite sua análise ou 'sair' para encerrar): sair
Encerrado o chatbot. Até logo!
```

Scores are qualitative judgments guided by the supplied evidence; the application does not calculate them from a statistical formula. Actual answers can differ, and the model may still make mistakes. Use `sair` to finish and copy the printed session ID to resume later.

## Technical behavior and limitations

### OpenAI API errors and retries

The OpenAI client is created in `src/clients/openai.ts` from `OPENAI_API_KEY`. The SDK's default retry policy allows two retries for transient connection failures and selected HTTP responses (including 408, 409, 429, and 5xx); it also uses retry headers when provided by the API. Authentication, permission, and invalid-request errors generally need a configuration or input change rather than another attempt.

The project adds `withRetry` around report translation and the optional draft/critique/revision flow. That helper makes up to three calls, retrying rate-limit, connection, timeout, and server errors with exponential waits (2 seconds, then 4 seconds with its defaults). Because the SDK also retries internally, these wrapped operations can make more than three HTTP attempts. Other operations—including the interactive streaming response, embeddings, history summarization, and RAG completion—use the SDK's retries but are not wrapped by this project helper.

Input validation rejects empty, overlong, or blocked-word messages before they are saved. A response that fails the configured output check is reported and is not saved as an assistant message. API, database, and other unexpected errors are not converted into friendly chatbot messages: they propagate to the command line and can stop the current process. The user's message is saved before the API request, so a failed request may leave an unmatched user turn in the session history. Streaming output also cannot resume automatically if a stream fails after it has started. Keep the terminal error details for troubleshooting; do not paste API keys into logs or reports.

### Token and context management

The interactive chat estimates tokens by dividing the character count of stored message content by three. This is a lightweight heuristic, not the OpenAI tokenizer: it excludes message roles, the system prompt, request formatting, and other API overhead, and accuracy varies by language and content. It should not be used to predict billing or guarantee that a request fits a model context window.

When this estimate reaches 4,096, the application summarizes the older half of the conversation and sends that summary together with the newer half. The summary is a separate OpenAI request. This compression changes the context sent for that response, not the SQLite conversation history; old messages remain persisted and can be summarized again on a later turn. The in-memory sliding window separately retains at most 100 user/assistant exchanges after it is applied. These are application-level controls, not an exact token budget. The requests do not set an explicit maximum completion-token value, and the context estimate does not include the persona's system prompt.

### Metrics and how to interpret them

The analyst personas organize player evidence into dimensions rather than applying a hidden statistical formula:

| Dimension | Evidence considered | Why it matters |
|---|---|---|
| **Pace** | Speed, acceleration, movement, and transitions | Describes the player's ability to gain or cover space and contribute during changes of phase. |
| **Shot** | Attempts, goals, and the quality of finishes | Separates evidence about concluding attacks from performance in other areas. |
| **Pass** | Passing accuracy, build-up, and chance creation | Helps describe how the player retains possession, advances play, or creates opportunities. |
| **Dribble** | Ball control, carries, dribbles, and progression with the ball | Captures individual progress with possession; a dribble alone is not treated as evidence of pace or passing. |
| **Defence** | Marking, tackles, interceptions, pressure, and recovery | Describes defensive contribution; physical duels count here only when the data identifies a defensive action. |
| **Physic** | Strength, physical duels, stamina, and intensity | Describes physical contribution and is not inferred solely from tackles or defensive actions. |
| **Overall** | Synthesis of dimensions with sufficient evidence | Provides a bounded summary; missing evidence is a limitation, not a zero or a negative performance. |

Scores range from 0 to 99 when a dimension can be assessed, but they are qualitative evidence-based judgments, not percentiles, probabilities, or direct conversions from counts and percentages. The model should use only information supplied in the conversation, avoid comparisons without a supplied benchmark, and explain when the sample is insufficient. Counts describe volume; a rate adds context when both numerator and denominator are known (for example, 3 successful dribbles from 5 attempts is 60%, but does not by itself establish whether the performance was good for that role or match). Likewise, shot attempts, shots on target, and goals describe different parts of finishing; a pass total does not establish progression or chance creation; and a duel should be identified as defensive or physical before it is assigned to a dimension. For a stronger assessment, provide the match period, position, role, sample size, and comparable observations or statistics.

For report retrieval, a different score ranks text chunks: `hybridScore` combines cosine similarity between embeddings (70% by default) with keyword overlap (30%). Chunks below 0.39 are filtered out, and at most five are sent to the answer prompt. This score measures relevance to the query—not a player's performance, factual certainty, or answer quality. If no chunks meet the threshold, the prompt may have no report context and should not be treated as a verified answer.

## Project structure

```text
src/
├── index.ts                     # RAG question-and-answer entry point
├── chatbot.ts                   # Interactive streaming chat
├── contextWindow.ts             # In-memory conversation history
├── messageRepository.ts          # SQLite message persistence
├── vectorRepository.ts          # SQLite vector storage and similarity search
├── ingest.ts                    # PDF extraction and ingestion entry point
├── clients/
│   └── openai.ts                # OpenAI API client
├── ai/
│   ├── blockedWords.ts          # Input and output validation signals
│   ├── embed.ts                 # OpenAI text embeddings
│   ├── generateWithCritique.ts  # Draft, critique, and revision flow
│   ├── maybeCompress.ts         # Context summarization threshold
│   ├── personas.ts              # Analyst personas
│   ├── policies.ts              # Analysis policies and output formats
│   ├── prompts.ts               # System prompt composition
│   ├── streamResponse.ts        # Streaming chat completion
│   ├── summarizeHistory.ts      # Conversation summarization
│   ├── validateInput.ts         # User input validation
│   └── validateOutputs.ts       # Generated response checks
└── utils/
    ├── buildRagPrompt.ts        # Builds the context-grounded question prompt
    ├── chunkText.ts             # Splits text into chunks
    ├── cosineSimilarity.ts      # Vector similarity calculation
    ├── estimateTokens.ts        # Approximate context token estimator
    ├── ingest.ts                # Embeds and stores document chunks
    ├── offers.ts                # Sample transfer offers
    ├── ragAnswer.ts             # Retrieves context and generates an answer
    ├── stitchContext.ts         # Builds summarized conversation context
    ├── types.ts                 # Shared message and validation types
    └── withRetry.ts             # Exponential retry helper
```

## Technologies

- TypeScript with native Node.js type stripping and ES modules.
- Node.js built-in `node:sqlite` module for local conversation storage.
- OpenAI Node SDK (`gpt-4o-mini` and `text-embedding-3-small`).
- `pdf-parse` for extracting text from PDF reports.
- `node:readline/promises` for terminal input.
