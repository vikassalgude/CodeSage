import './workers/ingestion.worker.js';
import './workers/reindex.worker.js';
import { logger } from './utils/logger.js';

logger.info('CodeSage Ingestion & Reindex Worker Process Started');
