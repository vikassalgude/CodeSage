import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { queryRateLimit } from '../middleware/rateLimit.middleware.js';
import { queryController, getConversations, getConversationDetails } from '../controllers/query.controller.js';

const router = Router();

// All query routes require a valid JWT
router.use(authenticate);

// Limit queries to 50 per day (for standard dev/free tiers)
router.post('/', queryRateLimit(50), queryController); // POST /api/query
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationDetails);

export default router;
