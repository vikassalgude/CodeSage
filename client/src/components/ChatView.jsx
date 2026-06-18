import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import FileTree from './FileTree';
import CodeViewer from './CodeViewer';
import ChatWindow from './ChatWindow';
import { useStreamingQuery } from '../hooks/useSSE';

export default function ChatView({ user, repo, repos, conversationId, onBack, onLogout }) {
  const [files, setFiles] = useState([]);
  const [activeFilePath, setActiveFilePath] = useState('');
  const [activeLanguage, setActiveLanguage] = useState('');
  const [highlightRange, setHighlightRange] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // RAG SSE streaming hook
  const { rewrittenQuery, tokens, citations, loading, error, sendQuery } = useStreamingQuery();

  useEffect(() => {
    if (repo && repo.status === 'ready') {
      fetchRepoFiles(repo.id);
    }
  }, [repo]);

  async function fetchRepoFiles(repoId) {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/repos/${repoId}/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setFiles(data.files || []);
      
      // Auto-select first file if available
      if (data.files && data.files.length > 0) {
        setActiveFilePath(data.files[0].path);
        setActiveLanguage(data.files[0].language);
      }
    } catch (err) {
      console.error('Error fetching file list:', err);
    }
  }

  function handleSelectFile(path, language) {
    setActiveFilePath(path);
    setActiveLanguage(language);
    setHighlightRange(null); // Clear lines highlights when selecting manually
  }

  function handleSelectCitation(filePath, startLine, endLine) {
    setActiveFilePath(filePath);
    const matchingFile = files.find(f => f.path === filePath);
    setActiveLanguage(matchingFile ? matchingFile.language : 'plaintext');
    setHighlightRange({ startLine, endLine });
  }

  async function handleSubmitQuery({ question, conversationId }) {
    return await sendQuery({
      question,
      repoId: repo.id,
      conversationId
    });
  }

  // Filter files based on user search query
  const filteredFiles = files.filter(f => 
    f.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-background text-on-background antialiased flex flex-col overflow-hidden h-screen w-screen font-body-base">
      {/* Top Navigation Bar */}
      <header className="flex justify-between items-center h-16 px-gutter w-full border-b border-outline-variant bg-background z-20 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary font-bold">terminal</span>
            <span className="font-headline-md text-headline-md font-bold text-primary">CodeSage</span>
          </div>
          <div className="h-6 w-[1px] bg-outline-variant mx-2"></div>
          
          <div className="flex items-center gap-3 px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg">
            <span className="material-symbols-outlined text-body-sm text-outline">account_tree</span>
            <span className="font-label-caps text-label-caps text-on-surface font-semibold text-xs">{repo.name}</span>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-highest/30 border border-outline-variant/50 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-label-caps text-emerald-500 uppercase tracking-wider font-semibold">
              {repo.chunkCount?.toLocaleString() || 0} Chunks · Ready
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant hover:bg-surface-container-high transition-all text-on-surface rounded-lg select-none active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span className="font-label-caps text-label-caps font-semibold text-xs">Dashboard</span>
          </button>
          
          <div className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center text-xs font-bold text-primary select-none bg-surface-container-high">
            {user?.email ? user.email.slice(0, 2).toUpperCase() : 'DV'}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 flex overflow-hidden w-full">
        {/* Sidebar: File Tree Explorer */}
        <aside className="w-sidebar-width border-r border-outline-variant flex flex-col bg-surface-container-lowest shrink-0 h-full overflow-hidden">
          <div className="p-4 select-none">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
              <input 
                className="w-full bg-surface-container-low border border-outline-variant rounded-md py-2 pl-10 pr-3 font-code-base text-code-base focus:outline-none focus:border-primary transition-colors placeholder:text-outline-variant text-sm text-on-surface" 
                placeholder="Search files..." 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-0.5">
            <div className="px-2 py-1 text-label-caps text-outline-variant font-bold uppercase text-[10px] tracking-widest mb-1 select-none">Files</div>
            <FileTree 
              files={filteredFiles} 
              onSelectFile={handleSelectFile} 
              activeFilePath={activeFilePath} 
            />
          </div>
        </aside>

        {/* Middle Pane: Chat Conversation Window */}
        <section className="flex-1 min-w-[400px] border-r border-outline-variant flex flex-col bg-background relative h-full overflow-hidden">
          <ChatWindow 
            repoId={repo.id}
            activeRepoName={repo.name}
            initialConversationId={conversationId}
            onSelectCitation={handleSelectCitation}
            rewrittenQuery={rewrittenQuery}
            tokens={tokens}
            citations={citations}
            loading={loading}
            error={error}
            onSubmitQuery={handleSubmitQuery}
          />
        </section>

        {/* Right Pane: Code Presentation View */}
        <section className="flex-1 flex flex-col bg-surface-container-lowest h-full overflow-hidden">
          <CodeViewer 
            repoId={repo.id}
            filePath={activeFilePath}
            language={activeLanguage}
            highlightRange={highlightRange}
          />
        </section>
      </main>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333333; border-radius: 10px; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
      `}</style>
    </div>
  );
}