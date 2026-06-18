import React from 'react';
import { 
  Terminal, 
  Play, 
  CheckCircle2, 
  Layers, 
  Search, 
  FileText, 
  MessageSquare, 
  Key, 
  Cpu, 
  Database, 
  BookOpen, 
  ArrowRight,
  ShieldAlert,
  GitBranch
} from 'lucide-react';

const GithubIcon = (props) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const LinkedinIcon = (props) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const TwitterIcon = (props) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
  </svg>
);

export default function Landing({ onNavigate }) {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="font-body-base text-on-background bg-background min-h-screen flex flex-col antialiased selection:bg-[#8b5cf6]/30 selection:text-white">
      
      {/* Top Navbar */}
      <header className="bg-background/80 backdrop-blur-md fixed top-0 left-0 w-full z-50 border-b border-outline-variant flex justify-between items-center h-16 px-6 lg:px-12 select-none">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1 rounded-md flex items-center justify-center text-background">
              <Terminal size={16} strokeWidth={2.5} />
            </div>
            <span className="font-headline-md text-headline-sm font-bold text-primary tracking-wide">CodeSage</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => scrollToSection('features')}
              className="text-on-surface-variant hover:text-primary transition-colors text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="text-on-surface-variant hover:text-primary transition-colors text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              How it works
            </button>
            <button 
              onClick={() => scrollToSection('docs')}
              className="text-on-surface-variant hover:text-primary transition-colors text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              Docs
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('auth')} 
            className="px-4 py-1.5 text-xs font-bold text-on-surface hover:text-primary transition-colors border border-outline-variant rounded-lg hover:bg-surface-container-low active:scale-[0.98] cursor-pointer"
          >
            Sign in
          </button>
          <button 
            onClick={() => onNavigate('auth')} 
            className="px-4 py-1.5 text-xs font-bold bg-primary text-background rounded-lg hover:opacity-90 transition-opacity active:scale-[0.98] cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="flex-1 flex flex-col items-center relative select-none">
        {/* Cyberpunk grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-20 opacity-30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#1a191f_0%,#0d0d0f_100%)] -z-30" />

        <div className="max-w-5xl mx-auto px-6 text-center pt-32 lg:pt-40 pb-20">
          {/* Tech Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container/50 border border-outline-variant/60 mb-8 animate-fadeIn">
            <Cpu size={12} className="text-[#a78bfa]" />
            <span className="font-code-base text-[9.5px] text-[#a78bfa] uppercase tracking-wider font-bold">
              Local ONNX Embeddings + Groq Llama-3.3
            </span>
          </div>
          
          {/* Hero Headline */}
          <h1 className="font-display-lg text-primary mb-6 tracking-tight text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] font-hanken">
            Understand any GitHub codebase <br className="hidden sm:inline" /> in minutes, not hours
          </h1>
          
          {/* Hero Subtitle */}
          <p className="text-on-surface-variant max-w-2xl mx-auto mb-10 text-[14px] leading-relaxed">
            CodeSage clones your repository, extracts functions and classes using tree-sitter AST parsing, embeds chunks locally, and indexes them in Qdrant. Ask questions and get responses streamed with exact file and line citations.
          </p>
          
          {/* CTA Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button 
              onClick={() => onNavigate('auth')} 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold rounded-lg transition-colors active:scale-[0.98] shadow-[0_0_20px_rgba(139,92,246,0.35)] text-sm cursor-pointer"
            >
              <GithubIcon className="w-4 h-4" />
              <span>Continue with GitHub</span>
              <ArrowRight size={14} />
            </button>
            <button 
              onClick={() => scrollToSection('demo')} 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-surface-container border border-outline-variant text-primary font-bold rounded-lg hover:bg-surface-container-high transition-colors active:scale-[0.98] text-sm cursor-pointer"
            >
              <Play size={14} />
              <span>Watch Demo</span>
            </button>
          </div>
          
          {/* Social Proof */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-outline text-[11px] uppercase tracking-wider font-code-base opacity-75 mb-24">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>Free for public repos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>No key required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>AST Syntax Aware</span>
            </div>
          </div>

          {/* Interactive Mock Workspace Demo Section */}
          <section id="demo" className="scroll-mt-24 mb-28 max-w-4xl mx-auto">
            <div className="relative rounded-xl border border-outline-variant bg-[#111113]/70 backdrop-blur-md overflow-hidden aspect-video shadow-2xl group cursor-pointer hover:border-[#8b5cf6]/40 transition-colors">
              
              {/* Terminal Title Bar */}
              <div className="h-9 border-b border-outline-variant/50 bg-[#151518] px-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                </div>
                <div className="text-[10px] font-mono text-outline-variant">codesage-demo.mp4</div>
                <div className="w-10"></div>
              </div>

              {/* Mock Screen Content */}
              <div className="absolute inset-0 top-9 bg-[#0e0e0f] flex items-center justify-center select-text opacity-40">
                <div className="font-mono text-[10px] text-left text-outline-variant p-6 space-y-2 w-full h-full overflow-hidden">
                  <p className="text-[#a78bfa]">[codesage] Initializing workspace agent...</p>
                  <p>[embedder] Loading local embeddings model (feature-extraction: Xenova/all-MiniLM-L6-v2)</p>
                  <p className="text-emerald-400">[qdrant] Database connected. Dimension: 384 [Cosine]</p>
                  <p>[git] Cloned repository: https://github.com/expressjs/express</p>
                  <p>[chunker] Indexing 142 codebase file blocks using tree-sitter AST chunker...</p>
                  <p className="text-yellow-400">[worker] BullMQ ingestion worker: active, processing batch 3/3</p>
                </div>
              </div>

              {/* Play Overlay */}
              <div className="absolute inset-x-0 bottom-0 top-9 flex flex-col items-center justify-center gap-3 bg-gradient-to-t from-background/80 to-transparent">
                <div className="w-14 h-14 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 flex items-center justify-center text-[#a78bfa] backdrop-blur-md group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                  <Play size={18} fill="currentColor" className="ml-1" />
                </div>
                <span className="text-[12px] font-bold text-primary tracking-wide">Play Demo Showcase</span>
                <span className="text-[10px] text-outline-variant">Demo video placeholder</span>
              </div>
            </div>
          </section>

          {/* Stepped Pipeline ("How it Works") */}
          <section id="how-it-works" className="scroll-mt-24 mb-28 space-y-12">
            <div className="space-y-3 select-none">
              <h2 className="text-2xl font-bold font-headline-sm text-primary">How CodeSage Works</h2>
              <p className="text-on-surface-variant max-w-xl mx-auto text-xs sm:text-sm">Four automated pipeline stages to transform a raw repository into semantic search answers</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left max-w-5xl mx-auto">
              
              {/* Step 1 */}
              <div className="bg-[#121214] border border-outline-variant rounded-xl p-5 relative">
                <div className="absolute -top-3.5 left-5 bg-[#8b5cf6] text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider">Step 01</div>
                <div className="w-9 h-9 rounded bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center text-[#a78bfa] mb-4 mt-1 select-none">
                  <GitBranch size={16} />
                </div>
                <h4 className="text-[13.5px] font-bold text-primary mb-1.5">Clone & AST Chunk</h4>
                <p className="text-outline-variant text-[11.5px] leading-relaxed">
                  Clones public repos via Octokit. Performs syntax-aware chunking using tree-sitter to parse actual functions and classes.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-[#121214] border border-outline-variant rounded-xl p-5 relative">
                <div className="absolute -top-3.5 left-5 bg-[#8b5cf6] text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider">Step 02</div>
                <div className="w-9 h-9 rounded bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center text-[#a78bfa] mb-4 mt-1 select-none">
                  <Cpu size={16} />
                </div>
                <h4 className="text-[13.5px] font-bold text-primary mb-1.5">ONNX Embedding</h4>
                <p className="text-outline-variant text-[11.5px] leading-relaxed">
                  Transforms code segments locally using ONNX feature-extraction models (`all-MiniLM-L6-v2`) in 384 dimensions.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-[#121214] border border-outline-variant rounded-xl p-5 relative">
                <div className="absolute -top-3.5 left-5 bg-[#8b5cf6] text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider">Step 03</div>
                <div className="w-9 h-9 rounded bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center text-[#a78bfa] mb-4 mt-1 select-none">
                  <Database size={16} />
                </div>
                <h4 className="text-[13.5px] font-bold text-primary mb-1.5">Index Database</h4>
                <p className="text-outline-variant text-[11.5px] leading-relaxed">
                  Stores vectors in a Qdrant collection and writes file coordinate maps (start/end lines) to PostgreSQL relational tables.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-[#121214] border border-outline-variant rounded-xl p-5 relative">
                <div className="absolute -top-3.5 left-5 bg-[#8b5cf6] text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider">Step 04</div>
                <div className="w-9 h-9 rounded bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center text-[#a78bfa] mb-4 mt-1 select-none">
                  <MessageSquare size={16} />
                </div>
                <h4 className="text-[13.5px] font-bold text-primary mb-1.5">Stream RAG Answers</h4>
                <p className="text-outline-variant text-[11.5px] leading-relaxed">
                  Query search yields semantic contexts. streams answers via Groq with exact line-highlight references.
                </p>
              </div>

            </div>
          </section>

          {/* Detailed Features Bento Grid */}
          <section id="features" className="scroll-mt-24 mb-28 space-y-12 select-none">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold font-headline-sm text-primary">Advanced Developer Features</h2>
              <p className="text-on-surface-variant max-w-xl mx-auto text-xs sm:text-sm">Built from the ground up for low-latency codebase search and navigation</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
              
              <div className="bg-surface-container border border-outline-variant p-6 rounded-xl hover:border-outline transition-colors">
                <Search className="text-[#a78bfa] mb-4" size={20} />
                <h3 className="text-[14.5px] font-bold text-primary mb-2">Semantic search & MMR</h3>
                <p className="text-outline-variant text-[12px] leading-relaxed">
                  Retrieves code files using dense search. Reranks using Maximal Marginal Relevance (MMR) to guarantee diverse, context-rich results.
                </p>
              </div>

              <div className="bg-surface-container border border-outline-variant p-6 rounded-xl hover:border-outline transition-colors">
                <FileText className="text-[#a78bfa] mb-4" size={20} />
                <h3 className="text-[14.5px] font-bold text-primary mb-2">Line Citations</h3>
                <p className="text-outline-variant text-[12px] leading-relaxed">
                  Never guess where an answer came from. Clicking bookmark citations automatically opens Monaco Editor and highlights the lines.
                </p>
              </div>

              <div className="bg-surface-container border border-outline-variant p-6 rounded-xl hover:border-outline transition-colors">
                <Key className="text-[#a78bfa] mb-4" size={20} />
                <h3 className="text-[14.5px] font-bold text-primary mb-2">Private Repos & OAuth</h3>
                <p className="text-outline-variant text-[12px] leading-relaxed">
                  Enabling GitHub OAuth lists all personal repositories and enables indexing private projects using user token credentials.
                </p>
              </div>

              <div className="bg-surface-container border border-outline-variant p-6 rounded-xl hover:border-outline transition-colors">
                <MessageSquare className="text-[#a78bfa] mb-4" size={20} />
                <h3 className="text-[14.5px] font-bold text-primary mb-2">Conversation Memory</h3>
                <p className="text-outline-variant text-[12px] leading-relaxed">
                  Maintains thread context over multiple questions. History is saved automatically so you can resume chat threads later.
                </p>
              </div>

              <div className="bg-surface-container border border-outline-variant p-6 rounded-xl hover:border-outline transition-colors">
                <Layers className="text-[#a78bfa] mb-4" size={20} />
                <h3 className="text-[14.5px] font-bold text-primary mb-2">Delta sync webhooks</h3>
                <p className="text-outline-variant text-[12px] leading-relaxed">
                  Monitors commits using push webhooks. Re-indexes only modified files to keep the vector database updated without full ingestion.
                </p>
              </div>

              <div className="bg-surface-container border border-outline-variant p-6 rounded-xl hover:border-outline transition-colors">
                <ShieldAlert className="text-[#a78bfa] mb-4" size={20} />
                <h3 className="text-[14.5px] font-bold text-primary mb-2">Rate limit & tracing</h3>
                <p className="text-outline-variant text-[12px] leading-relaxed">
                  Maintains daily caps using Redis sliding window limiters. Logs RAG execution details using Langfuse observability tracing.
                </p>
              </div>

            </div>
          </section>

          {/* Quickstart & Docs */}
          <section id="docs" className="scroll-mt-24 mb-16 text-left max-w-3xl mx-auto space-y-6">
            <div className="space-y-3 select-none text-center">
              <h2 className="text-2xl font-bold font-headline-sm text-primary">Quickstart Documentation</h2>
              <p className="text-on-surface-variant max-w-xl mx-auto text-xs sm:text-sm">Bootstrap your own local instance of CodeSage in under 5 minutes</p>
            </div>

            {/* Terminal Panel */}
            <div className="border border-outline-variant bg-[#0e0e10] rounded-xl overflow-hidden shadow-xl font-code-base">
              <div className="h-9 bg-surface-container border-b border-outline-variant/80 px-4 flex items-center gap-2 select-none">
                <BookOpen size={13} className="text-[#a78bfa]" />
                <span className="text-[10px] text-on-surface-variant font-semibold">GETTING_STARTED.md</span>
              </div>
              <div className="p-5 text-xs text-primary leading-relaxed space-y-4 select-text whitespace-pre-wrap overflow-x-auto">
                <div>
                  <p className="text-outline-variant"># 1. Start Docker services (Postgres, Redis, Qdrant)</p>
                  <p className="text-emerald-400">docker compose up -d</p>
                </div>
                <div>
                  <p className="text-outline-variant"># 2. Set your environment variables in server/.env</p>
                  <p className="text-[#a78bfa]">
                    DATABASE_URL="postgresql://codesage:codesage_secret@localhost:5432/codesage"<br />
                    REDIS_URL="redis://localhost:6379"<br />
                    QDRANT_URL="http://localhost:6333"<br />
                    GROQ_API_KEY="gsk_..."<br />
                    JWT_SECRET="long_random_development_string_here"
                  </p>
                </div>
                <div>
                  <p className="text-outline-variant"># 3. Synchronize database and boot application</p>
                  <p className="text-emerald-400">
                    cd server && npm run db:migrate<br />
                    npm run dev &amp; npm run dev:worker
                  </p>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant/60 py-10 px-6 bg-[#0c0c0e] select-none">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-60">
            <span className="font-code-base text-[11px] text-outline-variant">© 2026 CODESAGE • DEVELOPER SUITE</span>
          </div>
          
          {/* Social Handles */}
          <div className="flex gap-6 items-center">
            <a 
              href="https://github.com/vikassalgude" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-on-surface-variant hover:text-primary transition-colors hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] p-1 rounded"
              title="GitHub Profile"
            >
              <GithubIcon className="w-4.5 h-4.5" />
            </a>
            <a 
              href="https://www.linkedin.com/in/vikas-salgude-91992a289/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-on-surface-variant hover:text-[#0077b5] transition-colors hover:shadow-[0_0_10px_rgba(0,119,181,0.15)] p-1 rounded"
              title="LinkedIn Profile"
            >
              <LinkedinIcon className="w-4.5 h-4.5" />
            </a>
            <a 
              href="https://x.com/VIKAS796088" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-on-surface-variant hover:text-primary transition-colors hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] p-1 rounded"
              title="X Profile"
            >
              <TwitterIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}