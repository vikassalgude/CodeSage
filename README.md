# 🧙‍♂️ CodeSage: Enterprise-Grade AI-Powered Codebase RAG & Semantic Search Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Vector DB](https://img.shields.io/badge/VectorDB-Qdrant-red.svg)](https://qdrant.tech/)
[![LLM Engine](https://img.shields.io/badge/LLM-Groq%20Llama%203.3%2070B-orange.svg)](https://groq.com/)
[![Embeddings](https://img.shields.io/badge/Embeddings-MiniLM--L6--v2%20(Local)-blueviolet.svg)](https://huggingface.co/Xenova/all-MiniLM-L6-v2)

**CodeSage** is a state-of-the-art, open-source Retrieval-Augmented Generation (RAG) platform engineered specifically for source code repositories and technical documentation. It turns any GitHub codebase into an interactive, conversational intelligence engine capable of answering architectural questions, locating bugs, explaining complex logic, and generating dynamic system diagrams—all backed by line-precise citations.

Unlike generic RAG tools that naively slice files by byte count, CodeSage uses **AST (Abstract Syntax Tree) parsing**, **semantic token chunking**, **local CPU vector embedding**, **Qdrant vector storage**, **Maximal Marginal Relevance (MMR) re-ranking**, and **streaming Llama 3.3 70B** to deliver production-grade accuracy and zero-hallucination code search.

---

## 📸 Key Features at a Glance

- 🌳 **AST-Aware Code Chunking**: Uses Tree-sitter parsers to slice code at exact functional boundaries (functions, classes, methods) with docstring context preservation.
- 📄 **Documentation & Plain-Text Fallback**: Token-window fallback chunker powered by `tiktoken` for `.md`, `.json`, `.css`, `.yaml`, ensuring READMEs and configs are searchable.
- 🏷️ **Source Type Citation Badging**: Classifies and visualizes citations with distinct `[Code]` and sky-blue `[Doc]` badges linking straight to Monaco line ranges.
- ⚡ **Memory-Efficient Batched Ingestion**: Processes large repos in background batches of 10–20 files, freeing memory after each batch write to prevent RAM spikes.
- 🚀 **Incremental Availability (`PARTIALLY_READY`)**: Codebases become queryable instantly as soon as Batch 1 completes, while remaining files index in the background.
- 🔍 **Hybrid Query Rewriting + MMR Re-Ranking**: Rewrites natural user questions into search-optimized keywords and re-ranks top candidates using Maximal Marginal Relevance ($\lambda=0.7$) to eliminate redundant chunks.
- 💻 **Local CPU Embedding Engine**: Runs `@xenova/transformers` (`all-MiniLM-L6-v2`) locally via ONNX Runtime—zero external API cost or network latency for vector embeddings.
- 📊 **Dynamic Mermaid Diagram Generation**: Automatically detects database schema and flow questions to render dynamic, interactive Mermaid flowcharts in responses.
- 🛰️ **Real-Time SSE Streaming**: Low-latency token-by-token streaming with progress phase indicators via Server-Sent Events.

---

## 🏗️ System Architecture & Data Flow

### 1. High-Level System Architecture

```mermaid
graph TD
    subgraph Client Layer
        UI["React + Vite UI<br/>(Monaco Editor, SSE Listener, Mermaid.js)"]
    end

    subgraph API & Routing Layer
        API["Express API Server<br/>(Auth, Repos, Query Controllers)"]
        JWT["JWT & GitHub OAuth"]
    end

    subgraph Asynchronous Processing Layer
        Queue["BullMQ Queue<br/>(Ingestion & Reindex Tasks)"]
        Worker["BullMQ Background Worker<br/>(Concurrency: 2 Jobs/Worker)"]
        Redis[("Redis 7<br/>Job Store & Lock Manager")]
    end

    subgraph Processing & Parsing Core
        GitService["GitHub Fetcher & Filter"]
        ASTParser["Tree-sitter AST Parser<br/>(JS/TS/Python)"]
        TextChunker["Tiktoken Fallback Chunker<br/>(Markdown, JSON, Configs)"]
        LocalEmbedder["Xenova Local Embedder<br/>(all-MiniLM-L6-v2 - 384 dims)"]
    end

    subgraph Database & Vector Layer
        PostgreSQL[("PostgreSQL Database<br/>(Users, Repos, Chunks, Messages)")]
        Qdrant[("Qdrant Vector DB<br/>(Cosine Similarity Collections)")]
    end

    subgraph AI Generation Layer
        Groq["Groq API<br/>(Llama 3.3 70B Versatile)"]
    end

    UI -->|1. OAuth Login / Add Repo / Query| API
    API -->|Auth Check| JWT
    API -->|2. Enqueue Ingestion Job| Queue
    Queue <--> Redis
    Queue -->|3. Consume Jobs| Worker
    Worker -->|4. Fetch Blobs| GitService
    Worker -->|5. AST Splitting| ASTParser
    Worker -->|5. Token Splitting| TextChunker
    Worker -->|6. Vectorize Batches| LocalEmbedder
    Worker -->|7. Persist Metadata| PostgreSQL
    Worker -->|7. Upsert Vectors| Qdrant

    API -->|8. Search Vectors| Qdrant
    API -->|9. MMR Re-ranking| API
    API -->|10. Stream Prompt Context| Groq
    Groq -->|11. SSE Token Stream| UI
```

---

### 2. Ingestion & Memory-Optimized Batching Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as React Client
    participant API as Express API
    participant Queue as BullMQ / Redis
    participant Worker as Ingestion Worker
    participant DB as PostgreSQL
    participant Qdrant as Qdrant Vector DB

    User->>Frontend: Submit GitHub Repository URL
    Frontend->>API: POST /api/repos { repoUrl }
    API->>DB: Create Repo Row (Status: QUEUED)
    API->>Queue: Add Ingestion Job (repoId)
    API-->>Frontend: 202 Accepted { repoId }

    Queue->>Worker: Process Job
    Worker->>DB: Update Status to INDEXING
    Worker->>Worker: Fetch & Filter File Tree (Filter noise/binaries)
    
    loop Batch Execution (10-20 Files per Batch)
        Worker->>Worker: Parse Files (Tree-sitter AST or Tiktoken Plain-text)
        Worker->>Worker: Generate 384-dim Local Vectors
        Worker->>DB: Batch Insert Chunk Metadata
        Worker->>Qdrant: Batch Upsert Points (Payload: code/doc)
        Worker->>Worker: Discard Batch Objects (Trigger GC)
        
        opt First Batch Complete
            Worker->>DB: Set Status to PARTIALLY_READY
            DB-->>Frontend: Live Status Update (Querying Enabled!)
        end
    end

    Worker->>DB: Update Status to READY (100% Indexed)
    Worker-->>Queue: Mark Job Complete
```

---

### 3. Query Execution, RAG & Streaming Pipeline

```mermaid
flowchart TD
    A["User Submits Question"] --> B["Express POST /api/query"]
    B --> C{"Is Repo Status READY or PARTIALLY_READY?"}
    C -- No --> D["Return 400 Repo Not Ready Error"]
    C -- Yes --> E["Step 1: LLM Query Rewriting<br/>(Convert to keyword code search query)"]
    
    E --> F["Step 2: Vector Search<br/>(Embed query via Xenova & fetch top 20 candidate vectors from Qdrant)"]
    
    F --> G["Step 3: Maximal Marginal Relevance (MMR)<br/>Re-rank candidates using cosine similarity (λ=0.7) to top 5 diverse chunks"]
    
    G --> H["Step 4: Prompt Construction<br/>(Inject system prompt, code/doc context blocks, line numbers & conversation history)"]
    
    H --> I["Step 5: Groq Llama 3.3 70B Generation<br/>(Stream back response tokens via SSE)"]
    
    I --> J["Step 6: Real-time UI Rendering<br/>(Render Markdown, Monaco citations & Mermaid flowcharts)"]
    J --> K["Save Chat Session & Messages to PostgreSQL"]
```

---

## 🛠️ Technology Stack & Trade-Off Decisions

| Component | Technology | Rationale & Trade-off Analysis |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18 + Vite** | High-performance SPA with instant HMR. Vite provides minimal bundle overhead for Monaco Editor and Mermaid integration. |
| **Code Editor Engine** | **Monaco Editor** | Offers an authentic VS Code-like snippet review experience directly inside citation cards. |
| **Backend Runtime** | **Node.js 20 (ESM)** | Asynchronous non-blocking I/O allows simultaneous streaming of SSE client queries and worker queue dispatching. |
| **API Framework** | **Express.js** | Flexible middleware ecosystem paired with standard event-stream support for SSE endpoints. |
| **Task Queue** | **BullMQ + Redis 7** | Guarantees atomic background job execution, worker concurrency control, automatic retries with exponential backoffs, and memory safety. |
| **AST Parser** | **Tree-sitter** | Outperforms line-based splitting by parsing code into formal syntax trees, ensuring functions/classes are never chopped in half. |
| **Fallback Chunker** | **Tiktoken** | Paragraph-aware token window chunker for non-AST documentation (`.md`, `.json`, `.yaml`), granting full searchability to project guides. |
| **Embedding Engine** | **@xenova/transformers** | Runs ONNX `all-MiniLM-L6-v2` locally on Node.js CPU. **Trade-off**: Zero third-party API costs and no rate limits, at the cost of minor local CPU usage. |
| **Vector Storage** | **Qdrant** | Cloud-native Rust vector engine with fast HNSW indexing, Cosine metric payload filtering, and lightweight Docker footprint. |
| **Relational Metadata** | **PostgreSQL 15 + Prisma** | Stores structured relational entities (Users, Repositories, File Chunks, Chat Messages) with strong schema guarantees. |
| **LLM Inference** | **Groq (Llama 3.3 70B)** | Sub-second Time-To-First-Token (TTFT) inference powered by LPU hardware, delivering hyper-fast code generation and streaming responses. |

---

## 🧠 Key Technical Challenges & Engineering Solutions

### 1. Memory Spikes During Large Repository Ingestion
* **Problem**: Ingesting repositories with thousands of files loaded every AST tree, raw source string, and floating-point vector into Node.js heap memory simultaneously, causing `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`.
* **Solution**: Designed a **Batched Processing Pipeline**. Files are fetched and filtered upfront, then processed in strict batches of 10–20 files. After each batch is vectorized, writes are committed to PostgreSQL and Qdrant in a single transaction/upsert call, and references are immediately dropped to allow Node.js garbage collection to reclaim heap space before proceeding to the next batch.

### 2. High Search Latency & Irrelevant Chunks (Context Redundancy)
* **Problem**: Standard vector similarity search frequently retrieved multiple near-identical chunks from the same long source file (e.g. 5 variants of similar helper methods), wasting LLM context window space and causing hallucinations.
* **Solution**: Implemented **Maximal Marginal Relevance (MMR) Re-Ranking**. The system queries Qdrant for a broad candidate set of $N=20$ vectors, then iteratively selects top $K=5$ chunks by maximizing similarity to the query while penalizing similarity to already-selected chunks ($\lambda = 0.7$). This ensures the context supplied to Llama 3.3 contains diverse, non-overlapping parts of the codebase.

### 3. Skipping Non-Code Documentation & Config Files
* **Problem**: Traditional AST parsers silently ignore Markdown files (`README.md`), configuration files (`package.json`, `.dockerignore`), and CSS styles, rendering critical repository documentation invisible to RAG search.
* **Solution**: Introduced a dual-stage **File Classifier & Fallback Token Chunker**. Files are classified by extension: Tree-sitter handles code (`.js`, `.ts`, `.py`), while a `tiktoken` paragraph-aware token sliding window handles plain-text documentation. Skipped files (binary assets, minified JS, node_modules) are logged explicitly with reasons.

### 4. Dynamic Mermaid Diagram Generation & Rendering
* **Problem**: Users frequently ask architectural questions like *"Show me the database schema"* or *"Map the authentication flow"*, but text-only RAG responses are difficult to digest visually.
* **Solution**: Integrated a specialized system prompt rule forcing Llama 3.3 to emit clean Mermaid standard blocks (` ```mermaid ... ``` `) when responding to flow or architecture queries. Engineered a custom React `MermaidRenderer` component with inline error boundaries to render live SVG diagrams smoothly without breaking UI rendering on syntax edge-cases.

---

## 🎤 Interviewer Deep-Dive: Questions & Detailed Answers

If you are presenting CodeSage in a technical interview, use these answers to explain the system design decisions:

<details>
<summary><b>Q1: Why did you choose Qdrant over Pgvector or Pinecone?</b></summary>

> **Answer**: 
> 1. **Performance & Footprint**: Qdrant is written in Rust, optimized for low memory usage and ultra-low search latency using HNSW vector indexing.
> 2. **Payload Filtering**: Qdrant supports complex metadata filtering (e.g. filtering vectors by `repoId` and `sourceType`) directly during the vector search phase without secondary query overhead.
> 3. **Local Self-Hosting**: Unlike Pinecone (which introduces third-party cloud costs and network latency), Qdrant runs locally inside Docker alongside PostgreSQL, keeping development decoupled from external dependencies.
</details>

<details>
<summary><b>Q2: How does CodeSage handle authentication and authorization for private repositories?</b></summary>

> **Answer**: 
> CodeSage leverages **GitHub OAuth 2.0**. When a user logs in, GitHub grants a temporary user access token. This token is securely used by `@octokit/rest` inside server memory to fetch repo trees and file contents matching the authenticated user's permissions. Tokens are never exposed to client-side scripts.
</details>

<details>
<summary><b>Q3: What happens if a background worker crashes mid-ingestion?</b></summary>

> **Answer**: 
> BullMQ handles job durability via Redis state tracking. If an ingestion worker process dies unexpectedly:
> 1. BullMQ detects the stalled lock and retries the job up to 3 times with exponential backoff.
> 2. The repository status is safely caught and updated to `FAILED` in PostgreSQL if retries are exhausted.
> 3. Qdrant vector collections support idempotent upserts based on deterministic chunk IDs (`${repoId}_${filePath}_${startLine}`), so re-running a job overwrites existing vectors cleanly without leaving duplicate orphaned embeddings.
</details>

<details>
<summary><b>Q4: Why run embeddings locally on CPU instead of using OpenAI embeddings API?</b></summary>

> **Answer**: 
> 1. **Zero Marginal Cost**: Local CPU inference via ONNX Runtime (`Xenova/all-MiniLM-L6-v2`) eliminates API costs per repository ingestion.
> 2. **No Rate Limits**: Ingesting large repositories requires embedding thousands of text chunks; local embedding avoids API HTTP rate limits and throttling.
> 3. **Privacy**: Code chunks never leave the server instance during the embedding phase.
</details>

---

## 📂 Project Directory Structure

```
codesage/
├── client/                      # React + Vite Frontend Application
│   ├── src/
│   │   ├── components/          # Reusable UI Components
│   │   │   ├── CitationCard.jsx # Monaco citation block with sky-blue [Doc] badges
│   │   │   ├── MermaidRenderer.jsx # Live SVG diagram renderer
│   │   │   └── SearchBar.jsx    # Search input & query controller
│   │   ├── pages/               # Application Views (Dashboard, Chat, Auth)
│   │   ├── services/            # Axios API & SSE Event Source Handlers
│   │   ├── App.jsx              # Main React Router & Global State Setup
│   │   └── index.css            # Custom Design System & Glassmorphism Tokens
│   └── package.json
│
├── server/                      # Node.js + Express RAG Backend Server
│   ├── prisma/                  # Relational Schema Definition
│   │   └── schema.prisma        # User, Repo, Chunk, Message models
│   ├── src/
│   │   ├── config/              # PostgreSQL, Redis & Qdrant Client Singletons
│   │   ├── controllers/         # API Route Handlers (Auth, Repo, Query)
│   │   ├── middleware/          # JWT Verification & Rate Limiting
│   │   ├── queues/              # BullMQ Ingestion & Reindex Queue Definitions
│   │   ├── routes/              # Express API Endpoint Routes
│   │   ├── services/            # Core Business Logic Subsystems
│   │   │   ├── chunker.service.js  # Tree-sitter AST + Tiktoken Fallback
│   │   │   ├── embedder.service.js # Xenova Local Embedding Pipeline
│   │   │   ├── github.service.js   # Octokit Git Tree Fetcher & Filter
│   │   │   ├── llm.service.js      # Groq Llama 3.3 Prompt & Query Rewriter
│   │   │   └── qdrant.service.js   # Vector Search & MMR Re-Ranking Algorithm
│   │   ├── workers/             # Asynchronous BullMQ Worker Processes
│   │   ├── app.js               # Express Application Setup
│   │   ├── server.js            # API Web Server Entrypoint
│   │   └── worker.js            # Queue Worker Entrypoint
│   └── package.json
│
├── docker-compose.yml           # Infrastructure Orchestration (PostgreSQL, Redis, Qdrant)
├── BACKEND_SCRATCH_BUILD_GUIDE.md # Comprehensive Backend Architecture Blueprint
└── README.md                    # Project Documentation
```

---

## 🚀 Getting Started & Local Setup

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher
- **Docker Desktop**: Active container runtime for local databases
- **Groq API Key**: Free API key from [console.groq.com](https://console.groq.com)
- **GitHub OAuth Credentials**: Created under [GitHub Developer Settings](https://github.com/settings/developers)

---

### 2. Infrastructure Setup (Docker)

Spin up PostgreSQL, Redis, and Qdrant containers:

```bash
docker compose up -d
```

Verify services are running:
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **Qdrant Dashboard**: `localhost:6333/dashboard`

---

### 3. Server Configuration & Environment Variables

Navigate to the `server/` directory and create a `.env` file:

```bash
cd server
cp .env.example .env
```

Set the following variables in `.env`:

```env
PORT=5000
NODE_ENV=development

# Database URLs
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/codesage?schema=public"
REDIS_URL="redis://localhost:6379"
QDRANT_URL="http://localhost:6333"

# Authentication & APIs
JWT_SECRET="your-super-secret-jwt-key"
GITHUB_CLIENT_ID="your-github-oauth-client-id"
GITHUB_CLIENT_SECRET="your-github-oauth-client-secret"
GROQ_API_KEY="gsk_your_groq_api_key_here"
FRONTEND_URL="http://localhost:5173"
```

Install dependencies and run database migrations:

```bash
npm install
npx prisma db push
```

---

### 4. Running the Development Application

Open two separate terminal windows:

**Terminal 1: Express Web API Server**
```bash
cd server
npm run dev
```

**Terminal 2: BullMQ Background Worker**
```bash
cd server
npm run dev:worker
```

**Terminal 3: React Frontend**
```bash
cd client
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser to sign in via GitHub and ingest your first codebase!

---

## 🔌 API Endpoints Summary

### Authentication Routes
- `POST /api/auth/github` — Exchange OAuth code for JWT & user profile.
- `GET /api/auth/me` — Retrieve current authenticated user session.

### Repository Management Routes
- `POST /api/repos` — Enqueue repository for ingestion (`{ repoUrl }`).
- `GET /api/repos` — List all repositories belonging to the authenticated user.
- `GET /api/repos/:id` — Get detailed indexing status and file count for a repository.
- `DELETE /api/repos/:id` — Delete a repository, clearing PostgreSQL chunks and Qdrant vector collections.

### Semantic Search & RAG Routes
- `POST /api/query` — Execute semantic search & SSE token streaming (`{ repoId, query, history }`).

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more details.

---

## 👨‍💻 Author & Acknowledgments

Developed with ❤️ by **Vikas Salgude**. Special thanks to the open-source communities behind **Tree-sitter**, **Qdrant**, **Groq**, **BullMQ**, and **Xenova Transformers**.
