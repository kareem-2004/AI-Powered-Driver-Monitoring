import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, minlength: 2 },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  language: { type: String, enum: ['en', 'ar'], default: 'en' },
  theme:    { type: String, enum: ['dark', 'light'], default: 'dark' },
}, { timestamps: true, versionKey: false });
export default mongoose.model('User', userSchema);
