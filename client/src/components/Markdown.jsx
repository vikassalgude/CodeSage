import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

// Dynamic load mermaid helper
let mermaidInstance = null;
async function getMermaid() {
  if (mermaidInstance) return mermaidInstance;
  const module = await import('https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs');
  mermaidInstance = module.default;
  mermaidInstance.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    themeVariables: {
      background: '#0d0d0f',
      primaryColor: '#8b5cf6',
      primaryTextColor: '#fff',
      lineColor: '#5c5c6d',
    }
  });
  return mermaidInstance;
}

function MermaidDiagram({ code }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function renderDiagram() {
      try {
        const m = await getMermaid();
        // Generate a unique ID for the diagram
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        const { svg: renderedSvg } = await m.render(id, code);
        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setError(err.message || 'Failed to render diagram');
        }
      }
    }
    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [code]);

  if (error) {
    return (
      <div className="p-4 border border-red-500/20 bg-red-950/20 rounded-lg text-red-400 font-mono text-xs my-3 select-text">
        <div className="font-bold mb-1">Mermaid Render Error:</div>
        <pre className="whitespace-pre-wrap">{code}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center p-8 border border-outline-variant rounded-lg bg-surface-container my-3 select-none">
        <div className="animate-pulse text-xs text-outline-variant font-medium">Rendering visual diagram...</div>
      </div>
    );
  }

  return (
    <div 
      className="p-4 border border-outline-variant rounded-lg bg-[#0d0d0f] flex justify-center my-3 overflow-x-auto shadow-inner select-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function highlightCode(code, language) {
  if (!language) return code;
  const lang = language.toLowerCase();

  // Escaping HTML characters first to prevent HTML injection
  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (lang === 'javascript' || lang === 'typescript' || lang === 'js' || lang === 'ts' || lang === 'jsx' || lang === 'tsx') {
    // Keywords
    escaped = escaped.replace(
      /\b(const|let|var|function|return|import|export|from|default|class|extends|async|await|try|catch|finally|if|else|for|while|do|switch|case|break|continue|new|this|typeof|instanceof|throw|as|interface|type|public|private|protected|readonly|static|get|set)\b/g,
      '<span class="text-[#f472b6] font-semibold">$1</span>'
    );
    // Strings
    escaped = escaped.replace(/(['"`])(.*?)\1/g, '<span class="text-[#a7f3d0]">$1$2$1</span>');
    // Numbers
    escaped = escaped.replace(/\b(\d+)\b/g, '<span class="text-[#fbcfe8]">$1</span>');
    // Comments: // or /* */
    escaped = escaped.replace(/(\/\/.*$)/gm, '<span class="text-outline-variant italic">$1</span>');
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-outline-variant italic">$1</span>');
    // Function calls
    escaped = escaped.replace(/\b(\w+)(?=\()/g, '<span class="text-[#93c5fd] font-medium">$1</span>');
  } else if (lang === 'python' || lang === 'py') {
    // Keywords
    escaped = escaped.replace(
      /\b(def|class|return|import|from|as|if|elif|else|try|except|finally|for|while|in|is|not|and|or|lambda|pass|break|continue|with|yield|global|nonlocal|assert|raise)\b/g,
      '<span class="text-[#f472b6] font-semibold">$1</span>'
    );
    // Strings
    escaped = escaped.replace(/(['"])(.*?)\1/g, '<span class="text-[#a7f3d0]">$1$2$1</span>');
    // Numbers
    escaped = escaped.replace(/\b(\d+)\b/g, '<span class="text-[#fbcfe8]">$1</span>');
    // Comments
    escaped = escaped.replace(/(#.*$)/gm, '<span class="text-outline-variant italic">$1</span>');
    // Function calls
    escaped = escaped.replace(/\b(\w+)(?=\()/g, '<span class="text-[#93c5fd] font-medium">$1</span>');
  } else if (lang === 'html' || lang === 'xml') {
    // Tags
    escaped = escaped.replace(/(&lt;\/?)(\w+)(.*?)(&gt;)/g, (match, p1, p2, p3, p4) => {
      const highlightedP3 = p3.replace(/(\b\w+=)(['"].*?['"])/g, '<span class="text-[#93c5fd]">$1</span><span class="text-[#a7f3d0]">$2</span>');
      return `<span class="text-[#f472b6]">${p1}${p2}</span>${highlightedP3}<span class="text-[#f472b6]">${p4}</span>`;
    });
  } else if (lang === 'css') {
    // Selectors and rules
    escaped = escaped.replace(/([^{]+)(?=\s*\{)/g, '<span class="text-[#93c5fd]">$1</span>');
    escaped = escaped.replace(/(\b[\w-]+)(?=\s*:)/g, '<span class="text-[#f472b6]">$1</span>');
    escaped = escaped.replace(/(:\s*)([^;]+)/g, '$1<span class="text-[#a7f3d0]">$2</span>');
  } else if (lang === 'json') {
    // Keys
    escaped = escaped.replace(/(['"])(.*?)\1(\s*:)/g, '<span class="text-[#f472b6]">$1$2$1</span>$3');
    // Values
    escaped = escaped.replace(/(:\s*)(['"].*?['"])/g, '$1<span class="text-[#a7f3d0]">$2</span>');
    escaped = escaped.replace(/(:\s*)(\b\d+\b|true|false|null)/g, '$1<span class="text-[#fbcfe8]">$2</span>');
  }

  return <span dangerouslySetInnerHTML={{ __html: escaped }} />;
}

export default function Markdown({ content, onSelectCitation }) {
  if (!content) return null;

  // Split by code blocks: ```lang\ncode```
  const parts = content.split(/(```[a-zA-Z]*\n[\s\S]*?```)/g);

  return (
    <div className="space-y-3 font-body-base leading-relaxed text-[13px] text-on-surface-variant select-text">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const lines = part.split('\n');
          const firstLine = lines[0];
          const language = firstLine.replace('```', '').trim() || 'code';
          const code = lines.slice(1, lines.length - 1).join('\n');

          if (language.toLowerCase() === 'mermaid') {
            return <MermaidDiagram key={index} code={code} />;
          }

          return <CodeBlock key={index} language={language} code={code} />;
        } else {
          return <TextBlock key={index} text={part} onSelectCitation={onSelectCitation} />;
        }
      })}
    </div>
  );
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const lineCount = code.split('\n').length;

  return (
    <div className="relative border border-outline-variant rounded-lg overflow-hidden bg-[#0d0d0f] my-3 group font-code-base">
      <div className="flex items-center justify-between px-4 py-2 bg-[#161618] border-b border-outline-variant text-[11px] text-on-surface-variant font-semibold select-none">
        <span className="uppercase tracking-wider text-primary">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-500" />
              <span className="text-emerald-500 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="flex overflow-x-auto p-4 text-xs leading-normal">
        <div className="pr-4 text-outline-variant text-right select-none border-r border-outline-variant/30 font-mono">
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="pl-4 font-mono text-primary flex-1 whitespace-pre">
          <code>{highlightCode(code, language)}</code>
        </pre>
      </div>
    </div>
  );
}

function TextBlock({ text, onSelectCitation }) {
  if (!text) return null;

  const lines = text.split('\n');
  const blocks = [];
  let currentBlock = null;

  const closeCurrentBlock = () => {
    if (currentBlock) {
      blocks.push(currentBlock);
      currentBlock = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      closeCurrentBlock();
      continue;
    }

    // Check for tables
    const isTableLine = line.startsWith('|') && line.endsWith('|');
    if (isTableLine) {
      if (currentBlock && currentBlock.type !== 'table') {
        closeCurrentBlock();
      }
      if (!currentBlock) {
        currentBlock = { type: 'table', rows: [] };
      }
      currentBlock.rows.push(line);
      continue;
    }

    // Check for headings: #, ##, ###
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeCurrentBlock();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2]
      });
      continue;
    }

    // Check for unordered lists: - or * or +
    const ulMatch = line.match(/^([-*+])\s+(.*)$/);
    if (ulMatch) {
      if (currentBlock && currentBlock.type !== 'ul') {
        closeCurrentBlock();
      }
      if (!currentBlock) {
        currentBlock = { type: 'ul', items: [] };
      }
      currentBlock.items.push(ulMatch[2]);
      continue;
    }

    // Check for ordered lists: 1. or 2.
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (currentBlock && currentBlock.type !== 'ol') {
        closeCurrentBlock();
      }
      if (!currentBlock) {
        currentBlock = { type: 'ol', items: [] };
      }
      currentBlock.items.push(olMatch[2]);
      continue;
    }

    // Default: Paragraph text
    if (currentBlock && (currentBlock.type === 'ul' || currentBlock.type === 'ol' || currentBlock.type === 'table')) {
      closeCurrentBlock();
    }

    if (!currentBlock) {
      currentBlock = { type: 'p', lines: [] };
    }
    currentBlock.lines.push(line);
  }

  closeCurrentBlock();

  return (
    <div className="space-y-3">
      {blocks.map((block, bIdx) => {
        if (block.type === 'table') {
          const headers = block.rows[0].split('|').map(x => x.trim()).slice(1, -1);
          const dataRows = block.rows.slice(2).map(row => row.split('|').map(x => x.trim()).slice(1, -1));

          return (
            <div key={bIdx} className="overflow-x-auto my-4 border border-outline-variant rounded-lg select-none">
              <table className="min-w-full divide-y divide-outline-variant text-[12px] font-body-base">
                <thead className="bg-[#161618]">
                  <tr>
                    {headers.map((header, hIdx) => (
                      <th key={hIdx} className="px-4 py-3 text-left font-bold text-primary uppercase tracking-wider">
                        {parseInline(header, onSelectCitation)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-[#111112]">
                  {dataRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-white/5 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2.5 text-on-surface-variant font-medium select-text">
                          {parseInline(cell, onSelectCitation)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'heading') {
          const Tag = `h${Math.min(6, block.level + 1)}`;
          const classes = {
            h2: 'text-sm font-bold text-primary mt-4 mb-2',
            h3: 'text-[13px] font-semibold text-primary mt-3 mb-1.5',
            h4: 'text-[12px] font-semibold text-on-surface-variant mt-2 mb-1',
          }[Tag] || 'text-[12px] font-semibold text-on-surface-variant';

          return (
            <Tag key={bIdx} className={classes}>
              {parseInline(block.content, onSelectCitation)}
            </Tag>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul key={bIdx} className="list-disc pl-5 space-y-1.5 my-2">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="text-on-surface-variant text-[13px] leading-relaxed">
                  {parseInline(item, onSelectCitation)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol key={bIdx} className="list-decimal pl-5 space-y-1.5 my-2">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="text-on-surface-variant text-[13px] leading-relaxed">
                  {parseInline(item, onSelectCitation)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === 'p') {
          return (
            <p key={bIdx} className="text-on-surface-variant leading-relaxed text-[13px] whitespace-pre-line">
              {parseInline(block.lines.join('\n'), onSelectCitation)}
            </p>
          );
        }

        return null;
      })}
    </div>
  );
}

function parseInline(text, onSelectCitation) {
  if (!text) return '';

  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[[^\]\s]+:\d+(?:-\d+)?\])/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-primary">
          {part.slice(2, part.length - 2)}
        </strong>
      );
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="bg-surface-container-high border border-outline-variant/50 px-1.5 py-0.5 rounded font-code-base text-xs text-on-surface font-mono"
        >
          {part.slice(1, part.length - 1)}
        </code>
      );
    }

    if (part.startsWith('[') && part.endsWith(']')) {
      const match = part.slice(1, -1).match(/^([^:]+):(\d+)(?:-(\d+))?$/);
      if (match) {
        const filePath = match[1];
        const start = parseInt(match[2], 10);
        const end = match[3] ? parseInt(match[3], 10) : start;
        const filename = filePath.split('/').pop();

        if (onSelectCitation) {
          return (
            <button
              key={index}
              onClick={() => onSelectCitation(filePath, start, end)}
              className="inline-flex items-center gap-1 bg-[#202022] hover:bg-[#8b5cf6] border border-outline-variant hover:border-[#8b5cf6] text-[11px] text-primary hover:text-white px-2 py-0.5 rounded font-mono transition-all cursor-pointer my-0.5 mx-0.5 shadow-sm"
              title={`View ${filePath}:${start}-${end}`}
            >
              <span className="font-semibold">{filename}</span>
              <span className="opacity-60 text-[10px]">:{start}-{end}</span>
            </button>
          );
        } else {
          return (
            <span
              key={index}
              className="inline-block bg-surface-container-high border border-outline-variant/30 text-[11px] text-on-surface-variant px-1.5 py-0.5 rounded font-mono my-0.5 mx-0.5"
            >
              {filename}:{start}-{end}
            </span>
          );
        }
      }
    }

    return part;
  });
}
