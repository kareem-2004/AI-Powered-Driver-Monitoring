import mongoose from 'mongoose';
const yoloRecordSchema = new mongoose.Schema({
  sessionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverState: { type: String, enum: ['SafeDriving', 'Distracted', 'DangerousDriving', 'SleepyDriving'], default: 'SafeDriving' },
  confidence:  { type: Number },
  alertSent:   { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
export default mongoose.model('YOLORecord', yoloRecordSchema);
