import React from 'react';
import { Check, Copy } from 'lucide-react';

export default function Markdown({ content }) {
  if (!content) return null;

  // Split by code blocks: ```lang\ncode```
  const parts = content.split(/(```[a-zA-Z]*\n[\s\S]*?```)/g);

  return (
    <div className="space-y-3 font-body-base leading-relaxed text-sm">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const lines = part.split('\n');
          const firstLine = lines[0];
          const language = firstLine.replace('```', '').trim() || 'code';
          const code = lines.slice(1, lines.length - 1).join('\n');

          return <CodeBlock key={index} language={language} code={code} />;
        } else {
          return <TextBlock key={index} text={part} />;
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

function TextBlock({ text }) {
  if (!text.trim()) return null;

  const paragraphs = text.split('\n\n');

  return (
    <>
      {paragraphs.map((para, pIdx) => {
        if (!para.trim()) return null;

        const lines = para.split('\n');
        const isList = lines.every(line => line.trim().startsWith('- ') || line.trim().startsWith('* '));

        if (isList) {
          return (
            <ul key={pIdx} className="list-disc pl-5 space-y-1.5 my-2">
              {lines.map((line, lIdx) => {
                const cleanLine = line.trim().replace(/^[-*]\s+/, '');
                return (
                  <li key={lIdx} className="text-on-surface-variant">
                    {parseInline(cleanLine)}
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={pIdx} className="text-on-surface-variant leading-relaxed text-[13px]">
            {parseInline(para)}
          </p>
        );
      })}
    </>
  );
}

function parseInline(text) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-primary">
          {part.slice(2, part.length - 2)}
        </strong>
      );
    } else if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="bg-surface-container-high border border-outline-variant/50 px-1.5 py-0.5 rounded font-code-base text-xs text-on-surface font-mono"
        >
          {part.slice(1, part.length - 1)}
        </code>
      );
    }
    return part;
  });
}
