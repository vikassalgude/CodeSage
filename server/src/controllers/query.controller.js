// import { prisma } from '../config/db.js';
// import { rewriteQuery, streamAnswer } from '../services/llm.service.js';
// import { searchCodebase } from '../services/qdrant.service.js';
// import { trimToTokenBudget } from '../utils/tokenCounter.js';
// import { logger } from '../utils/logger.js';
// import { withTrace } from '../utils/langfuse.js';

// /**
//  * POST /api/query
//  * Full RAG query pipeline with SSE streaming response.
//  * 
//  * Request body: { repoId, question, conversationId? }
//  * Response: Server-Sent Events stream with tokens and citations.
//  */
// export async function queryController(req, res, next) {
//   const { repoId, question, conversationId } = req.body;

//   if (!repoId || !question) {
//     return res.status(400).json({ error: { message: 'repoId and question are required' } });
//   }

//   // Verify the repo exists and belongs to this user
//   const repo = await prisma.repo.findFirst({
//     where: { id: repoId, userId: req.user.id }
//   });
//   if (!repo) {
//     return res.status(404).json({ error: { message: 'Repository not found' } });
//   }
//   if (repo.status !== 'ready') {
//     return res.status(400).json({ error: { message: `Repository is not ready for queries. Current status: ${repo.status}` } });
//   }

//   // Setup SSE headers
//   res.writeHead(200, {
//     'Content-Type': 'text/event-stream',
//     'Cache-Control': 'no-cache',
//     'Connection': 'keep-alive',
//     'X-Accel-Buffering': 'no' // Disable Nginx buffering if behind a proxy
//   });

//   try {
//     await withTrace({
//       name: 'query-pipeline',
//       input: { question, repoId },
//       userId: req.user.id
//     }, async (trace) => {
//       // Step 1: Rewrite the query for better retrieval
//       logger.info(`🔍 Query Pipeline [${repoId}]: Rewriting query...`);
//       const rewriteSpan = trace.span({ name: 'query-rewrite', input: { question } });
//       const rewritten = await rewriteQuery(question);
//       rewriteSpan.end({ output: { rewritten } });
//       logger.info(`🔍 Query Pipeline [${repoId}]: Rewritten → "${rewritten}"`);

//       // Send the rewritten query to the client
//       res.write(`event: rewrite\ndata: ${JSON.stringify({ rewritten })}\n\n`);

//       // Step 2: Search the vector DB using the rewritten query
//       logger.info(`🔍 Query Pipeline [${repoId}]: Searching codebase...`);
//       const retrieveSpan = trace.span({ name: 'retrieval', input: { rewritten } });
//       const contexts = await searchCodebase(repoId, rewritten, 8);
//       retrieveSpan.end({ output: { chunkCount: contexts.length } });
//       logger.info(`🔍 Query Pipeline [${repoId}]: Found ${contexts.length} relevant chunks.`);

//       // Step 3: Trim contexts to fit within GPT-4o's token budget
//       const trimmedContexts = trimToTokenBudget(contexts, 12000);

//       // Send citation metadata to the client before the answer
//       const citations = trimmedContexts.map(ctx => ({
//         filePath: ctx.filePath,
//         startLine: ctx.startLine,
//         endLine: ctx.endLine,
//         language: ctx.language
//       }));
//       res.write(`event: citations\ndata: ${JSON.stringify({ citations })}\n\n`);

//       // Step 4: Load conversation history (if continuing an existing conversation)
//       let history = [];
//       let conversation;

//       if (conversationId) {
//         conversation = await prisma.conversation.findFirst({
//           where: { id: conversationId, userId: req.user.id, repoId },
//           include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } }
//         });
//         if (conversation) {
//           history = conversation.messages.map(m => ({
//             role: m.role,
//             content: m.content
//           }));
//         }
//       }

//       // Create a new conversation if none exists
//       if (!conversation) {
//         conversation = await prisma.conversation.create({
//           data: { userId: req.user.id, repoId }
//         });
//       }

//       // Save the user's message
//       await prisma.message.create({
//         data: {
//           conversationId: conversation.id,
//           role: 'user',
//           content: question
//         }
//       });

//       // Step 5: Stream the GPT-4o answer token by token
//       logger.info(`🔍 Query Pipeline [${repoId}]: Streaming GPT-4o response...`);
//       const generation = trace.generation({
//         name: 'llm-generation',
//         model: 'gpt-4o',
//         input: { question, contexts: trimmedContexts, history }
//       });

//       const stream = await streamAnswer(question, trimmedContexts, history);

//       let fullAnswer = '';

//       for await (const chunk of stream) {
//         const token = chunk.choices[0]?.delta?.content;
//         if (token) {
//           fullAnswer += token;
//           res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
//         }
//       }

//       generation.end({ output: fullAnswer });

//       // Step 6: Save the assistant's response with citations to the database
//       await prisma.message.create({
//         data: {
//           conversationId: conversation.id,
//           role: 'assistant',
//           content: fullAnswer,
//           citations
//         }
//       });

//       // Send completion event
//       res.write(`event: done\ndata: ${JSON.stringify({ conversationId: conversation.id })}\n\n`);
//       res.end();

//       logger.info(`[query] Pipeline [${repoId}]: Streaming complete. ${fullAnswer.length} chars sent.`);
//       return fullAnswer;
//     });
//   } catch (err) {
//     logger.error(`[query] Pipeline [${repoId}]: Error:`, err);
    
//     // Try to send error via SSE if headers were already sent
//     try {
//       res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
//       res.end();
//     } catch (_) {
//       next(err);
//     }
//   }
// }
import { prisma } from '../config/db.js';
import { rewriteQuery, streamAnswer } from '../services/llm.service.js';
import { searchCodebase } from '../services/qdrant.service.js';
import { trimToTokenBudget } from '../utils/tokenCounter.js';
import { logger } from '../utils/logger.js';
import { withTrace } from '../utils/langfuse.js';
import { mapRoleToEnum } from '../utils/enumNormalizer.js';

/**
 * POST /api/query
 * Full RAG query pipeline with SSE streaming response.
 * * Request body: { repoId, question, conversationId? }
 * Response: Server-Sent Events stream with tokens and citations.
 */
export async function queryController(req, res, next) {
  const { repoId, question, conversationId } = req.body;

  if (!repoId || !question) {
    return res.status(400).json({ error: { message: 'repoId and question are required' } });
  }

  // Verify the repo exists and belongs to this user
  const repo = await prisma.repo.findFirst({
    where: { id: repoId, userId: req.user.id }
  });
  if (!repo) {
    return res.status(404).json({ error: { message: 'Repository not found' } });
  }
  if (repo.status.toUpperCase() !== 'READY' && repo.status.toUpperCase() !== 'PARTIALLY_READY') {
    return res.status(400).json({ error: { message: `Repository is not ready for queries. Current status: ${repo.status.toLowerCase()}` } });
  }

  // Setup SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable Nginx buffering if behind a proxy
  });

  try {
    await withTrace({
      name: 'query-pipeline',
      input: { question, repoId },
      userId: req.user.id
    }, async (trace) => {
      // Step 1: Rewrite the query for better retrieval
      logger.info(`Query Pipeline [${repoId}]: Rewriting query...`);
      const rewriteSpan = trace.span({ name: 'query-rewrite', input: { question } });
      const rewritten = await rewriteQuery(question);
      rewriteSpan.end({ output: { rewritten } });
      logger.info(`Query Pipeline [${repoId}]: Rewritten → "${rewritten}"`);

      // Send the rewritten query to the client
      res.write(`event: rewrite\ndata: ${JSON.stringify({ rewritten })}\n\n`);

      // Step 2: Search the vector DB using the rewritten query
      logger.info(`Query Pipeline [${repoId}]: Searching codebase...`);
      const retrieveSpan = trace.span({ name: 'retrieval', input: { rewritten } });
      const contexts = await searchCodebase(repoId, rewritten, 8);
      retrieveSpan.end({ output: { chunkCount: contexts.length } });
      logger.info(`Query Pipeline [${repoId}]: Found ${contexts.length} relevant chunks.`);

      // Step 3: Trim contexts to fit within Groq's token budget (8k-128k context windows)
      const trimmedContexts = trimToTokenBudget(contexts, 12000);

      // Send citation metadata to the client before the answer
      const citations = trimmedContexts.map(ctx => ({
        filePath: ctx.filePath,
        startLine: ctx.startLine,
        endLine: ctx.endLine,
        language: ctx.language,
        sourceType: ctx.sourceType
      }));
      res.write(`event: citations\ndata: ${JSON.stringify({ citations })}\n\n`);

      // Step 4: Load conversation history (if continuing an existing conversation)
      let history = [];
      let conversation;

      if (conversationId) {
        conversation = await prisma.conversation.findFirst({
          where: { id: conversationId, userId: req.user.id, repoId },
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } }
        });
        if (conversation) {
          history = conversation.messages.map(m => ({
            role: m.role,
            content: m.content
          }));
        }
      }

      // Create a new conversation if none exists
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { userId: req.user.id, repoId }
        });
      }

      // Save the user's message
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'USER',
          content: question
        }
      });

      // Step 5: Stream the Groq answer token by token
      // Minimal Change: Updated logging and Langfuse trace model name to reflect Groq
      logger.info(`Query Pipeline [${repoId}]: Streaming Groq response...`);
      const generation = trace.generation({
        name: 'llm-generation',
        model: 'llama-3.3-70b-versatile', 
        input: { question, contexts: trimmedContexts, history }
      });

      const stream = await streamAnswer(question, trimmedContexts, history);

      let fullAnswer = '';

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content;
        if (token) {
          fullAnswer += token;
          res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
        }
      }

      generation.end({ output: fullAnswer });

      // Step 6: Save the assistant's response with citations to the database
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: fullAnswer,
          citations
        }
      });

      // Send completion event
      res.write(`event: done\ndata: ${JSON.stringify({ conversationId: conversation.id })}\n\n`);
      res.end();

      logger.info(`Query Pipeline [${repoId}]: Streaming complete. ${fullAnswer.length} chars sent.`);
      return fullAnswer;
    });
  } catch (err) {
    logger.error(`Query Pipeline [${repoId}]: Error:`, err);
    
    // Try to send error via SSE if headers were already sent
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
      res.end();
    } catch (_) {
      next(err);
    }
  }
}

/**
 * Fetch all conversations for the authenticated user.
 */
export async function getConversations(req, res, next) {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.user.id },
      include: {
        repo: {
          select: { name: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    const mapped = conversations.map(c => ({
      ...c,
      messages: c.messages.map(m => ({
        ...m,
        role: m.role.toLowerCase()
      }))
    }));
    return res.status(200).json({ conversations: mapped });
  } catch (error) {
    next(error);
  }
}

/**
 * Fetch conversation details (all chronological messages and citations).
 */
export async function getConversationDetails(req, res, next) {
  try {
    const { id } = req.params;
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: req.user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        repo: true
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: { message: 'Conversation not found' } });
    }

    conversation.messages = conversation.messages.map(m => ({
      ...m,
      role: m.role.toLowerCase()
    }));
    if (conversation.repo) {
      conversation.repo = {
        ...conversation.repo,
        status: conversation.repo.status.toLowerCase(),
        language: conversation.repo.language ? conversation.repo.language.toLowerCase() : null
      };
    }

    return res.status(200).json({ conversation });
  } catch (error) {
    next(error);
  }
}