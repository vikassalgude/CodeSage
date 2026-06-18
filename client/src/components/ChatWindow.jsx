import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Bot, FileText, ChevronRight } from 'lucide-react';
import Markdown from './Markdown';

export default function ChatWindow({ 
  repoId, 
  activeRepoName,
  initialConversationId,
  onSubmitQuery, 
  rewrittenQuery, 
  tokens, 
  citations, 
  loading, 
  error, 
  onSelectCitation 
}) {
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(initialConversationId || null);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Ask me anything about this indexed repository codebase.' }
  ]);
  const viewportRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => { 
    viewportRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, tokens]);

  // Sync initial conversation ID if provided
  useEffect(() => {
    if (initialConversationId) {
      setConversationId(initialConversationId);
    }
  }, [initialConversationId]);

  // Load past messages if conversationId is set
  useEffect(() => {
    if (conversationId) {
      async function loadMessages() {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`/api/query/conversations/${conversationId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.conversation) {
            setMessages(data.conversation.messages.map(m => ({
              role: m.role,
              content: m.content,
              citations: m.citations
            })));
          }
        } catch (err) {
          console.error('Failed to load past messages:', err);
        }
      }
      loadMessages();
    } else {
      setMessages([
        { role: 'assistant', content: 'Ask me anything about this indexed repository codebase.' }
      ]);
    }
  }, [conversationId]);

  // Stream incoming tokens
  useEffect(() => {
    if (tokens) {
      setMessages(prev => {
        const list = [...prev];
        const last = list[list.length - 1];
        if (last && last.role === 'assistant' && last.isStreaming) {
          list[list.length - 1] = { ...last, content: tokens, citations };
          return list;
        }
        return [...list, { role: 'assistant', content: tokens, citations, isStreaming: true }];
      });
    }
  }, [tokens, citations]);

  // Stop streaming state when loading finishes
  useEffect(() => {
    if (!loading) {
      setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m));
    }
  }, [loading]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const q = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setInput('');

    try {
      const nextId = await onSubmitQuery({ 
        question: q, 
        conversationId: conversationId || undefined 
      });
      if (nextId) setConversationId(nextId);
    } catch (err) {
      console.error('Submit query failed:', err);
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-background select-none">
      {/* Copilot Header */}
      <div className="h-14 border-b border-outline-variant flex items-center px-4 justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#202022] border border-outline-variant flex items-center justify-center text-primary">
            <Bot size={13} />
          </div>
          <span className="font-headline-sm text-[13px] font-bold text-primary tracking-wide">CodeSage Copilot</span>
        </div>
        {conversationId && (
          <span className="text-[9px] font-mono text-outline-variant uppercase bg-[#202022] px-2 py-0.5 rounded border border-outline-variant/50">
            ID: {conversationId.slice(0, 8)}...
          </span>
        )}
      </div>

      {/* Query Optimization Indicator */}
      {loading && rewrittenQuery && (
        <div className="px-4 py-2 bg-[#8b5cf6]/5 border-b border-[#8b5cf6]/20 text-[11px] text-[#a78bfa] flex items-center gap-2 font-code-base">
          <Sparkles size={12} className="animate-pulse" />
          <span>Searching: "{rewrittenQuery}"</span>
        </div>
      )}

      {/* Messages viewport */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-6 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`
              ${m.role === 'user' 
                ? 'bg-surface-container-high border border-outline-variant text-on-surface rounded-xl rounded-tr-none max-w-[85%]' 
                : 'bg-surface-container-low border border-outline-variant/30 text-on-surface rounded-xl rounded-tl-none max-w-[95%]'
              } px-4 py-3 text-[13px] leading-relaxed select-text
            `}>
              {m.role === 'user' ? (
                <p className="whitespace-pre-wrap">{m.content}</p>
              ) : (
                <Markdown content={m.content} onSelectCitation={onSelectCitation} />
              )}
            </div>

            {/* Citations block */}
            {m.role === 'assistant' && m.citations && m.citations.length > 0 && !m.isStreaming && (
              <div className="mt-3 w-full flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[10px] text-outline select-none font-semibold uppercase tracking-wider pl-1">
                  <span className="material-symbols-outlined text-[12px]">bookmark</span>
                  <span>Citations</span>
                </div>
                <div className="flex flex-wrap gap-2 pl-1">
                  {m.citations.map((c, idx) => {
                    const filename = c.filePath.split('/').pop();
                    return (
                      <button 
                        key={idx} 
                        onClick={() => onSelectCitation(c.filePath, c.startLine, c.endLine)} 
                        className="flex items-center gap-1.5 bg-surface-container-low hover:bg-surface-container border border-outline-variant hover:border-outline text-[11px] text-on-surface-variant hover:text-primary px-2.5 py-1 rounded transition-colors cursor-pointer"
                      >
                        <FileText size={11} className="text-outline" /> 
                        <span className="font-mono">{filename}:L{c.startLine + 1}</span>
                        <ChevronRight size={10} className="text-outline-variant" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
        {error && (
          <div className="self-center flex items-center gap-2 bg-red-950/20 border border-red-500/20 text-red-400 text-xs px-4 py-2.5 rounded-lg select-text">
            <span>Error: {error}</span>
          </div>
        )}
        <div ref={viewportRef} />
      </div>

      {/* Input panel */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-outline-variant bg-background shrink-0 select-none">
        <div className="relative">
          <input 
            type="text" 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            disabled={loading} 
            placeholder={loading ? "Generating response..." : "Ask CodeSage about this repo..."} 
            className="w-full bg-[#0e0e0e] border border-outline-variant rounded-lg py-3 pl-4 pr-12 text-on-surface placeholder:text-outline-variant text-[13px] focus:outline-none focus:border-[#8b5cf6] transition-colors font-body-base"
          />
          <button 
            type="submit" 
            disabled={loading || !input.trim()}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md bg-[#202022] hover:bg-[#8b5cf6] hover:text-white border border-outline-variant hover:border-[#8b5cf6] flex items-center justify-center text-outline-variant transition-colors disabled:opacity-40 disabled:hover:bg-[#202022] disabled:hover:text-outline-variant disabled:hover:border-outline-variant cursor-pointer"
          >
            <Send size={12} />
          </button>
        </div>
      </form>
    </div>
  );
}