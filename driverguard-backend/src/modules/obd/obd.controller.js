import OBDRecord from '../../models/OBDRecord.js';
import { predictDrivingStyle, estimateFuel } from '../../utils/ai.service.js';

export const recordOBD = async (req, res) => {
  try {
    const {
      sessionId, speed, rpm, coolantTemp, throttle,
      engineLoad, fuelLevel, intakeTemp, runtime,
      styleFeatures,
      fuelFeatures,
    } = req.body;

    if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId required.' });

    // Run both models in parallel
    const [styleResult, fuelResult] = await Promise.all([
      predictDrivingStyle(styleFeatures),
      estimateFuel(fuelFeatures),
    ]);

    const drivingStyle = styleResult?.style || 'Normal';
    const isAggressive = drivingStyle?.toLowerCase() === 'aggressive';
    const fuelEstimate = fuelResult?.fuel_estimate ?? null;

    // Debug log
    console.log(`[OBD] style=${drivingStyle} fuel=${fuelEstimate} speed=${speed}`);

    const record = await OBDRecord.create({
      sessionId, userId: req.user.id,
      speed, rpm, coolantTemp, throttle, engineLoad,
      fuelLevel, intakeTemp, runtime,
      drivingStyle,
      styleConfidence: styleResult?.confidence,
      fuelEstimate,
      isAggressive,
    });

    res.status(201).json({
      success: true,
      record,
      drivingStyle,
      isAggressive,
      fuelEstimate,
      shouldAlert: isAggressive,
    });
  } catch (err) {
    console.error('[OBD] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSessionOBD = async (req, res) => {
  try {
    const records = await OBDRecord.find({
      sessionId: req.params.sessionId,
      userId: req.user.id,
    }).sort({ createdAt: -1 });
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
