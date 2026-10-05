import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  sessionId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Driving score & grade
  drivingScore:     { type: Number },
  overallGrade:     { type: String },

  // GPS stats
  totalDistance:    { type: Number, default: 0 },  // km
  avgSpeed:         { type: Number, default: 0 },  // km/h
  maxSpeed:         { type: Number, default: 0 },  // km/h
  maxDeceleration:  { type: Number, default: 0 },  // km/h/s

  // Event counts
  totalEvents:      { type: Number, default: 0 },
  harshBraking:     { type: Number, default: 0 },  // from GPS
  harshAccel:       { type: Number, default: 0 },  // from IMU
  sharpTurns:       { type: Number, default: 0 },  // from IMU
  laneChanges:      { type: Number, default: 0 },  // from IMU
  distractedCount:  { type: Number, default: 0 },  // from YOLO
  sleepyCount:      { type: Number, default: 0 },  // from YOLO
  dangerousCount:   { type: Number, default: 0 },  // from YOLO
  aggressiveEvents: { type: Number, default: 0 },  // from OBD

  // OBD stats
  drivingStyle:     { type: String },
  fuelScore:        { type: Number },

  // Recommendations
  recommendations:  [{ type: String }],

}, { timestamps: true, versionKey: false });

export default mongoose.model('Report', reportSchema);
