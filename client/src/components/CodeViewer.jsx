import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { FileCode, Loader2 } from 'lucide-react';

export default function CodeViewer({ repoId, filePath, language, highlightRange }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationIdsRef = useRef([]);

  useEffect(() => {
    if (!repoId || !filePath) { 
      setContent(''); 
      return; 
    }
    async function fetchFile() {
      setLoading(true); 
      setContent('');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/repos/${repoId}/file?path=${encodeURIComponent(filePath)}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        const data = await res.json();
        setContent(data.content || '');
      } catch (err) { 
        console.error(err); 
      } finally { 
        setLoading(false); 
      }
    }
    fetchFile();
  }, [repoId, filePath]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current; 
    const monaco = monacoRef.current;
    
    decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, []);
    
    if (!highlightRange) return;
    
    const start = highlightRange.startLine + 1; 
    const end = highlightRange.endLine + 1;
    
    decorationIdsRef.current = editor.deltaDecorations([], [{
      range: new monaco.Range(start, 1, end, 1),
      options: { 
        isWholeLine: true, 
        className: 'monaco-line-highlight' 
      }
    }]);
    
    setTimeout(() => {
      editor.revealRangeInCenter(new monaco.Range(start, 1, end, 1), 1);
    }, 100);
  }, [highlightRange, content]);

  if (!filePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-outline-variant select-none gap-3">
        <FileCode size={38} className="opacity-40" />
        <span className="text-[12px] font-medium tracking-wide">Select a file from the repository tree to inspect.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="h-14 border-b border-outline-variant flex items-center px-4 text-[12px] text-on-surface-variant font-mono truncate select-none">
        📄 {filePath}
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-background/55 backdrop-blur-[1px] flex items-center justify-center z-10 select-none">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      )}
      
      <div className="flex-1 w-full bg-[#1e1e1e]">
        <Editor 
          height="100%" 
          language={language || 'plaintext'} 
          theme="vs-dark" 
          value={content} 
          onMount={(ed, mon) => { 
            editorRef.current = ed; 
            monacoRef.current = mon; 
          }} 
          options={{ 
            readOnly: true, 
            minimap: { enabled: true }, 
            automaticLayout: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            lineHeight: 18,
          }} 
        />
      </div>
      
      <style>{`
        .monaco-line-highlight { 
          background-color: rgba(139, 92, 246, 0.15) !important; 
          border-left: 3px solid #8b5cf6 !important; 
        }
      `}</style>
    </div>
  );
}