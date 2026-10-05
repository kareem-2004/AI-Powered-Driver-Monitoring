import { Router } from 'express';
import { getSessionReport, getUserReports } from './report.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = Router();
router.get('/',            protect, getUserReports);
router.get('/:sessionId',  protect, getSessionReport);
export default router;
