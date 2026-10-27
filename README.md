# Football Stat Analytics CLI

An experimental command-line application for football analysis powered by the OpenAI API. It can extract text from local PDF reports, index that text as embeddings in SQLite, and answer questions using the most relevant passages. It also includes an interactive streaming chatbot.

## Features

- **PDF report ingestion:** extracts text from the configured reports in `relatorios/`, splits it into chunks, generates embeddings, and stores them in `vector_db.db`.
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

The extracted text is split into chunks, embedded with OpenAI, and saved in `vector_db.db`. This database persists between runs. Running ingestion again inserts the configured reports again; it does not replace or deduplicate previously indexed chunks.

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
