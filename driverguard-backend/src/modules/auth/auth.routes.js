import { Router } from 'express';
import { register, login, getMe, updatePreferences } from './auth.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/preferences', protect, updatePreferences);
export default router;
