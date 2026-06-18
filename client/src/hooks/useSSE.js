import { useState } from 'react';

export function useStreamingQuery() {
  const [rewrittenQuery, setRewrittenQuery] = useState('');
  const [tokens, setTokens] = useState('');
  const [citations, setCitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function sendQuery({ question, repoId, conversationId }) {
    setLoading(true); setTokens(''); setRewrittenQuery(''); setCitations([]); setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, repoId, conversationId })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Request failed with status ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';

        for (const message of messages) {
          if (!message.trim()) continue;
          const lines = message.split('\n');
          let eventType = 'message';
          let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event:')) eventType = line.slice(6).trim();
            else if (line.startsWith('data:')) dataStr = line.slice(5).trim();
          }
          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);
              if (eventType === 'rewrite') setRewrittenQuery(data.rewritten);
              else if (eventType === 'citations') setCitations(data.citations);
              else if (eventType === 'token') setTokens(prev => prev + data.token);
              else if (eventType === 'done') { setLoading(false); return data.conversationId; }
              else if (eventType === 'error') { setError(data.message); setLoading(false); }
            } catch (err) { console.error('SSE JSON Error:', err); }
          }
        }
      }
    } catch (err) { setError(err.message); setLoading(false); }
  }
  return { rewrittenQuery, tokens, citations, loading, error, sendQuery };
}