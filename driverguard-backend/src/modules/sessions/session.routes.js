import { Router } from 'express';
import { startSession, endSession, getSessionById, getUserSessions } from './session.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = Router();
router.post('/start',         protect, startSession);
router.put('/:sessionId/end', protect, endSession);
router.get('/',               protect, getUserSessions);
router.get('/:sessionId',     protect, getSessionById);
export default router;
