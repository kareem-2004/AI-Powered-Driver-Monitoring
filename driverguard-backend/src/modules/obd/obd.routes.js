import { Router } from 'express';
import { recordOBD, getSessionOBD } from './obd.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = Router();
router.post('/',           protect, recordOBD);
router.get('/:sessionId',  protect, getSessionOBD);
export default router;
