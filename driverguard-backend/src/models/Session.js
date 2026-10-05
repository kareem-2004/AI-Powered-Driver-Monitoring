import mongoose from 'mongoose';
const sessionSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  startTime:     { type: Date, default: Date.now },
  endTime:       { type: Date },
  duration:      { type: Number },
  obdConnected:  { type: Boolean, default: false },
  status:        { type: String, enum: ['active', 'completed'], default: 'active' },
  drivingScore:  { type: Number },
  totalEvents:   { type: Number, default: 0 },
  harshEvents:   { type: Number, default: 0 },
  avgSpeed:      { type: Number },
  drivingStyle:  { type: String },
  fuelScore:     { type: Number },
  yoloAlerts:    { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });
export default mongoose.model('Session', sessionSchema);
