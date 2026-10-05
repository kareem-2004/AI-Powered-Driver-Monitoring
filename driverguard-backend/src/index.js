import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import authRoutes from './modules/auth/auth.routes.js';
import sessionRoutes from './modules/sessions/session.routes.js';
import imuRoutes from './modules/imu/imu.routes.js';
import yoloRoutes from './modules/yolo/yolo.routes.js';
import obdRoutes from './modules/obd/obd.routes.js';
import reportRoutes from './modules/report/report.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── Database ────────────────────────────────────────────────
connectDB();

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/imu',      imuRoutes);
app.use('/api/yolo',     yoloRoutes);
app.use('/api/obd',      obdRoutes);
app.use('/api/report',   reportRoutes);

// ── Health Check ────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'DriverGuard API v2.0 ✌️',
    endpoints: ['/api/auth', '/api/sessions', '/api/imu', '/api/yolo', '/api/obd', '/api/report'],
    ai_server: process.env.AI_SERVER_URL
  });
});

// ── 404 ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DriverGuard API running on port ${PORT}`);
});
