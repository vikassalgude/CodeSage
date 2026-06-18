import React from 'react';
import { FileCode, ArrowUpRight } from 'lucide-react';

export default function CitationCard({ citation, onSelectCitation, index }) {
  const { filePath, startLine, endLine } = citation;
  const fileName = filePath.split('/').pop();

  return (
    <div 
      onClick={() => onSelectCitation(filePath, startLine, endLine)}
      style={{
        padding: '0.75rem',
        borderRadius: '8px',
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        position: 'relative',
        hover: {
          borderColor: 'var(--border-focus)',
          transform: 'translateY(-1px)'
        }
      }}
      className="citation-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
          <FileCode size={14} style={{ color: 'var(--accent-secondary)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{fileName}</span>
        </div>
        <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}>
          <span style={{ fontSize: '0.75rem' }}>[{index + 1}]</span>
          <ArrowUpRight size={12} />
        </div>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
        {filePath}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Lines {startLine + 1} - {endLine + 1}
      </div>
    </div>
  );
}
