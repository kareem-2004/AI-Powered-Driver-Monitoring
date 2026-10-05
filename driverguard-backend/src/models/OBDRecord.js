import mongoose from 'mongoose';
const obdRecordSchema = new mongoose.Schema({
  sessionId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  speed:           { type: Number },
  rpm:             { type: Number },
  coolantTemp:     { type: Number },
  throttle:        { type: Number },
  engineLoad:      { type: Number },
  fuelLevel:       { type: Number },
  intakeTemp:      { type: Number },
  runtime:         { type: Number },
  drivingStyle:    { type: String },
  styleConfidence: { type: Number },
  fuelEstimate:    { type: Number },
  isAggressive:    { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });
export default mongoose.model('OBDRecord', obdRecordSchema);
