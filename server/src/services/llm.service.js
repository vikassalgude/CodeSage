import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function rewriteQuery(userQuery) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0,
    max_tokens: 200,
    messages: [
      {
        role: 'system',
        content: `You are a search query optimizer for a code search engine.
Rewrite the user's question into a concise, keyword-rich search query.
Focus on technical terms, function names, class names, and API patterns.
Return ONLY the rewritten query, nothing else.`
      },
      { role: 'user', content: userQuery }
    ]
  });
  return response.choices[0].message.content.trim();
}

export async function streamAnswer(userQuery, contexts, history = []) {
  const contextBlock = contexts.map((ctx, i) =>
    `--- Snippet ${i + 1}: ${ctx.filePath} (lines ${ctx.startLine}-${ctx.endLine}) ---\n${ctx.content}`
  ).join('\n\n');

  const systemPrompt = `You are CodeSage, an expert code assistant.
Answer using ONLY the code snippets below. Cite sources as [filePath:startLine-endLine].
If snippets lack info, say so honestly. Use markdown for code blocks.
CODE CONTEXT:\n${contextBlock}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => ({ role: msg.role?.toLowerCase() === 'assistant' ? 'assistant' : 'user', content: msg.content })),
    { role: 'user', content: userQuery }
  ];

  const stream = await groq.chat.completions.create({
    // Changed back to a production model compatible with chat.completions
    model: 'llama-3.3-70b-versatile', 
    temperature: 0.1,
    max_tokens: 2048,
    stream: true,
    messages
  });

  return stream;
}