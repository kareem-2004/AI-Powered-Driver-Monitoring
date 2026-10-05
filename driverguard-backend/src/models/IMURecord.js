import mongoose from 'mongoose';
const imuRecordSchema = new mongoose.Schema({
  sessionId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  acceleration:  { x: Number, y: Number, z: Number },
  gyroscope:     { x: Number, y: Number, z: Number },
  event:         { type: String, default: 'Normal' },
  probabilities: { type: Map, of: Number },
  aiSource:      { type: String, default: 'imu_model' },
}, { timestamps: true, versionKey: false });
export default mongoose.model('IMURecord', imuRecordSchema);
