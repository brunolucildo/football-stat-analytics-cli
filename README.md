# Football Stat Analytics CLI

An experimental command-line application for football player performance analysis and transfer-offer evaluation, powered by the OpenAI API. The application analyzes only the information provided in the conversation; it does not retrieve player statistics or market data from external sources.

## Features

- **Player performance analysis:** evaluates Pace, Shot, Pass, Dribble, Defence, Physic, and Overall. The sports analyst is instructed to return a JSON object with scores from 0 to 99 where the supplied evidence is sufficient.
- **Transfer offer analysis:** evaluates a proposal from the selling club's perspective and returns one of three recommendations: `ACEITAR` (accept), `NEGOCIAR` (negotiate), or `RECUSAR` (reject). It can consider market value, offer structure, bonuses, contract details, and sporting factors when provided.
- **Persona-based policies:** provides sports-performance and transfer-market analyst personas with defined scopes, evaluation rules, and output formats.
- **Draft, critique, and revision:** the transfer-analysis flow asks the model to critique its first response and revises it when the critique is not `approved`.
- **Interactive streaming chat:** streams responses to the terminal and supports a custom system prompt or the default sports-analyst persona.
- **Persistent conversation history:** stores user and assistant messages in a local SQLite database and restores them when the same session ID is used again.
- **Context management:** estimates token usage and summarizes older messages when the interactive chat's context reaches its configured threshold.
- **Input and output checks:** applies basic blocked-word checks to user messages and checks generated responses for configured hallucination signals.
- **Retry helper:** retries API calls in the draft/critique/revision flow with exponential delays.

> This project is experimental. Model-generated scores and recommendations are not verified against official statistics or market data. Validation and blocked-word checks are simple safeguards, not a substitute for reviewing the results.

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

### Run the transfer-offer demonstration

```bash
node --experimental-strip-types --env-file=.env.local src/index.ts
```

The demonstration evaluates three example offers for Gabriel Martins from the perspective of Palmeiras. The example player, estimated market value, and offers are defined in the source code; they are not loaded from a live data source.

To resume or extend a prior session, pass its session ID as the first argument:

```bash
node --experimental-strip-types --env-file=.env.local src/index.ts <session-id>
```

### Start the interactive chat

```bash
node --experimental-strip-types --env-file=.env.local src/chatbot.ts
```

By default, the chat uses the sports-performance analyst persona. You can provide a custom system prompt as the first argument:

```bash
node --experimental-strip-types --env-file=.env.local src/chatbot.ts "You are a football performance analyst."
```

Use `sair` to end the chat. The application prints the session ID when it exits. Pass that ID as the second argument, after the system prompt, to restore the conversation:

```bash
node --experimental-strip-types --env-file=.env.local src/chatbot.ts "You are a football performance analyst." <session-id>
```

The application creates `pos_ia-m3.db` in the current working directory and creates its `messages` table if needed. Keep this file to retain conversation history.

## Project structure

```text
src/
├── index.ts                     # Transfer-offer analysis demonstration
├── chatbot.ts                   # Interactive streaming chat
├── contextWindow.ts             # In-memory conversation history
├── messageRepository.ts          # SQLite message persistence
├── clients/
│   └── openai.ts                # OpenAI API client
└── utils/
    ├── blockedWords.ts          # Input and output validation signals
    ├── estimateTokens.ts        # Approximate context token estimator
    ├── generateWithCritique.ts  # Draft, critique, and revision flow
    ├── maybeCompress.ts         # Context summarization threshold
    ├── offers.ts                # Sample transfer offers
    ├── pesonas.ts               # Analyst personas
    ├── policies.ts              # Analysis policies and output formats
    ├── prompts.ts               # System prompt composition
    ├── stitchContext.ts         # Builds summarized conversation context
    ├── streamResponse.ts        # Streaming chat completion
    ├── summarizeHistory.ts      # Conversation summarization
    ├── types.ts                 # Shared message and validation types
    ├── validateInput.ts         # User input validation
    ├── validateOutputs.ts       # Generated response checks
    └── withRetry.ts             # Exponential retry helper
```

## Technologies

- TypeScript with native Node.js type stripping and ES modules.
- Node.js built-in `node:sqlite` module for local conversation storage.
- OpenAI Node SDK and the `gpt-4o-mini` model.
- `node:readline/promises` for terminal input.
