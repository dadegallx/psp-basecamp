# PSP Chatbot - Poverty Stoplight Data Assistant

A simple, clean AI chatbot for querying Poverty Stoplight data. Built with Next.js 16, AI SDK 5, and AI Elements.

## Features

- **Data Analysis**: Query poverty indicators and survey data using natural language
- **SQL Generation**: AI automatically generates and executes SQL queries against Neon database
- **Slack Logging**: Production conversations are logged to Slack for debugging
- **Embeddable Widget**: Designed to be embedded in Apache Superset

## Architecture

This is a **stateless** chatbot - no database persistence for conversations. Chat state lives in the browser via the `useChat` hook. Slack thread mappings use in-memory storage.

```
app/
├── layout.tsx          # Root layout with theme provider
├── page.tsx            # Redirects to /widget
├── widget/page.tsx     # Main chat interface
└── api/
    ├── chat/route.ts   # Streaming chat endpoint
    └── test/slack/     # Slack integration test

lib/
├── ai/
│   ├── prompts/system.ts    # System prompt
│   ├── tools/               # loadSkill, executeQuery
│   ├── skills/              # Database schemas (indicators, surveys)
│   └── providers.ts         # AI Gateway configuration
├── neon/index.ts            # Neon database connector
├── slack.ts                 # Slack logging (in-memory thread tracking)
└── utils.ts                 # Utilities
```

## Setup

1. Copy `.env.example` to `.env.local` and fill in:
   - `AI_GATEWAY_API_KEY` - Vercel AI Gateway key
   - `NEON_DATABASE_URL` - Neon database connection string
   - `SLACK_BOT_TOKEN` / `SLACK_CHANNEL_ID` (optional)

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run development server:
   ```bash
   pnpm dev
   ```

4. Open http://localhost:3000/widget

## Embedding

Use the widget script in `public/widget.js` to embed the chatbot:

```html
<script src="https://your-domain.com/widget.js"></script>
```

## Tools

The AI has access to two tools:

1. **loadSkill** - Loads database schema for a dataset (indicators or surveys)
2. **executeQuery** - Executes SELECT queries against the Neon database

## Backup

The original complex codebase is preserved in `_backup_original/` for reference.
