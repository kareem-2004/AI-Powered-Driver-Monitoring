import mongoose from 'mongoose';
const vehicleSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  make:         { type: String, required: true },
  model:        { type: String, required: true },
  year:         { type: Number, required: true },
  licensePlate: { type: String },
  color:        { type: String },
}, { timestamps: true, versionKey: false });
export default mongoose.model('Vehicle', vehicleSchema);
