import React from 'react';
import { Check, Copy } from 'lucide-react';

export default function Markdown({ content, onSelectCitation }) {
  if (!content) return null;

  // Split by code blocks: ```lang\ncode```
  const parts = content.split(/(```[a-zA-Z]*\n[\s\S]*?```)/g);

  return (
    <div className="space-y-3 font-body-base leading-relaxed text-[13px] text-on-surface-variant">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const lines = part.split('\n');
          const firstLine = lines[0];
          const language = firstLine.replace('```', '').trim() || 'code';
          const code = lines.slice(1, lines.length - 1).join('\n');

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
    <div className="relative border border-outline-variant rounded-lg overflow-hidden bg-surface-container-lowest my-3 group font-code-base">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-container border-b border-outline-variant text-[11px] text-on-surface-variant font-semibold select-none">
        <span className="uppercase tracking-wider">{language}</span>
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
          <code>{code}</code>
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
    if (currentBlock && (currentBlock.type === 'ul' || currentBlock.type === 'ol')) {
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

  // Match bold (**bold**), code (`code`), and citations ([filepath:startLine-endLine] or [filepath:line])
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
