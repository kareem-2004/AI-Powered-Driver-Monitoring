import axios from 'axios';
import FormData from 'form-data';

const AI_URL = process.env.AI_SERVER_URL || 'http://localhost:8000';

// ── IMU prediction ────────────────────────────────────────────
export const predictIMU = async (acceleration, gyroscope) => {
  try {
    const features = [
      acceleration.x, acceleration.y, acceleration.z,
      gyroscope.x, gyroscope.y, gyroscope.z
    ];
    const { data } = await axios.post(`${AI_URL}/imu/predict`, { features }, { timeout: 5000 });
    return data.success ? data : { event: 'Normal', probabilities: {}, source: 'fallback' };
  } catch {
    // Rule-based fallback
    const { x, y } = acceleration;
    const gz = gyroscope.z;
    let event = 'Normal';
    if (x < -2.5 || y < -2.5) event = 'Harsh Brake';
    else if (x > 2.5 || y > 2.5) event = 'Harsh Acceleration';
    else if (Math.abs(gz) > 1.5) event = 'Sharp Turn';
    return { event, probabilities: {}, source: 'rule_based' };
  }
};

// ── YOLO detection ────────────────────────────────────────────
export const detectYOLO = async (imageBase64) => {
  try {
    const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const form = new FormData();
    form.append('file', buffer, { filename: 'frame.jpg', contentType: 'image/jpeg' });
    const { data } = await axios.post(`${AI_URL}/yolo/detect`, form, {
      headers: form.getHeaders(), timeout: 10000
    });
    return data.success ? data : { driverState: 'SafeDriving', confidence: 0 };
  } catch {
    return { driverState: 'SafeDriving', confidence: 0, source: 'fallback' };
  }
};

// ── Driving Style prediction ──────────────────────────────────
export const predictDrivingStyle = async (obdFeatures) => {
  try {
    const { data } = await axios.post(`${AI_URL}/driving/style`, { features: obdFeatures }, { timeout: 5000 });
    return data.success ? data : { style: 'Normal', confidence: null };
  } catch {
    return { style: 'Normal', confidence: null, source: 'fallback' };
  }
};

// ── Fuel estimation ───────────────────────────────────────────
export const estimateFuel = async (obdFeatures) => {
  try {
    const { data } = await axios.post(`${AI_URL}/driving/fuel`, { features: obdFeatures }, { timeout: 5000 });
    return data.success ? data : { fuel_estimate: null };
  } catch {
    return { fuel_estimate: null, source: 'fallback' };
  }
};
