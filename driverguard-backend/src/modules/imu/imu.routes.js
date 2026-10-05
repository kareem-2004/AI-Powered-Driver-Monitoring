import { Router } from 'express';
import { recordIMU, getSessionIMU } from './imu.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = Router();
router.post('/',               protect, recordIMU);
router.get('/:sessionId',      protect, getSessionIMU);
export default router;
