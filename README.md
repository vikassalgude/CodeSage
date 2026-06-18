# CodeSage 🔍

> Production-grade GitHub Codebase RAG Assistant

Ask questions about any public/private GitHub repository in natural language.
Get answers with **exact file + line citations**, streamed token by token, rendered inside a styled cyberpunk dashboard.

## Stack
- **Backend**: Node.js 20 + Express
- **DB**: PostgreSQL 16 + Prisma ORM
- **Vector DB**: Qdrant (384-dimensional collection per repo)
- **Queue**: BullMQ + Redis 7
- **AI / LLM**: Groq SDK (`llama-3.3-70b-versatile` chat generation)
- **Embeddings**: Local `@Xenova/all-MiniLM-L6-v2` (384-dim local ONNX pipelines)
- **Parser**: Tree-sitter AST chunking
- **Frontend**: React + Vite + Tailwind + Monaco Editor
- **Observability**: Langfuse (optional)

## Quick Start

```bash
# 1. Start infrastructure (PG, Redis, Qdrant)
docker compose up -d

# 2. Install server deps
cd server && npm install

# 3. Fill in your environment keys
cp .env.example .env  # or edit your existing .env
# Set DATABASE_URL, REDIS_URL, QDRANT_URL, JWT_SECRET, and GROQ_API_KEY.
# For GitHub OAuth integration, configure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.

# 4. Run Prisma migrations
npm run db:migrate

# 5. Start API server (dev)
npm run dev

# 6. Start ingestion worker (separate terminal)
npm run dev:worker
```

## Production Deployment Guidelines
- **Hosting Model**: Since the embeddings are processed locally via `@xenova/transformers`, the backend loads a ~90MB ONNX model file. To avoid extreme cold-start delays and file-write limits, this codebase should be deployed on **container/server runtimes** (such as Railway, Render, Fly.io, or AWS ECS/EC2) instead of serverless function runtimes.
- **Environment Parameters**: Make sure to configure all database connections, JWT secret, Groq keys, and GitHub OAuth credentials on your cloud provider.

