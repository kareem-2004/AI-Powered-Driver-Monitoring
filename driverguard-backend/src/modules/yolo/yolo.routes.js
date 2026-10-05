import { Router } from 'express';
import { recordYOLO, getSessionYOLO } from './yolo.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = Router();
router.post('/',           protect, recordYOLO);
router.get('/:sessionId',  protect, getSessionYOLO);
export default router;
