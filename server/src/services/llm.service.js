import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PRIMARY_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_MODEL = 'qwen/qwen3.8-27b';

export async function rewriteQuery(userQuery) {
  try {
    const response = await groq.chat.completions.create({
      model: PRIMARY_MODEL,
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
  } catch (err) {
    console.warn(`[llm] Primary model ${PRIMARY_MODEL} failed query rewrite (${err.message}). Retrying with fallback model ${FALLBACK_MODEL}...`);
    const fallbackResponse = await groq.chat.completions.create({
      model: FALLBACK_MODEL,
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
    return fallbackResponse.choices[0].message.content.trim();
  }
}

export async function streamAnswer(userQuery, contexts, history = []) {
  const contextBlock = contexts.map((ctx, i) =>
    `--- Snippet ${i + 1}: ${ctx.filePath} (lines ${ctx.startLine}-${ctx.endLine}) ---
${ctx.content}`
  ).join('\n\n');

  const systemPrompt = `You are CodeSage, an expert code assistant.
Answer using ONLY the code snippets below. Cite sources as [filePath:startLine-endLine].
If snippets lack info, say so honestly. Use markdown for code blocks.

DIAGRAM GENERATION:
If the user asks for a diagram, schema, database structure, or project/data flow (e.g. "show me the database structure" or "show me how data flows"), you MUST generate an inline Mermaid diagram.
- Use a code block with language 'mermaid'.
- For database schemas/structures, write an 'erDiagram' showing the tables, their fields, and their relationships (foreign keys, relations) based on the Prisma schema or models found in the snippets.
- For project flows or data flows, write a 'flowchart TD' or 'graph TD' showing how requests/data move through routing, controllers, services, and workers based on the routes and controllers in the snippets.
- Do NOT output a markdown table or text explanation when a diagram is requested; generate the Mermaid block first.

CODE CONTEXT:\n${contextBlock}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => ({ role: msg.role?.toLowerCase() === 'assistant' ? 'assistant' : 'user', content: msg.content })),
    { role: 'user', content: userQuery }
  ];

  try {
    const stream = await groq.chat.completions.create({
      model: PRIMARY_MODEL,
      temperature: 0.1,
      max_tokens: 2048,
      stream: true,
      messages
    });
    return stream;
  } catch (err) {
    console.warn(`[llm] Primary model ${PRIMARY_MODEL} failed streaming (${err.message}). Retrying with fallback model ${FALLBACK_MODEL}...`);
    const fallbackStream = await groq.chat.completions.create({
      model: FALLBACK_MODEL,
      temperature: 0.1,
      max_tokens: 2048,
      stream: true,
      messages
    });
    return fallbackStream;
  }
}
