import YOLORecord from '../../models/YOLORecord.js';
import { detectYOLO } from '../../utils/ai.service.js';

const ALERT_STATES = ['Distracted', 'DangerousDriving', 'SleepyDriving'];

export const recordYOLO = async (req, res) => {
  try {
    const { sessionId, imageBase64, driverState: preDetected, confidence: preConf, alertSent: preAlert } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: 'sessionId required.' });

    let driverState = preDetected || 'SafeDriving';
    let confidence  = preConf    || 0;

    // Only run AI if image provided AND no pre-detected result
    if (imageBase64 && !preDetected) {
      const result = await detectYOLO(imageBase64);
      driverState  = result.driverState || 'SafeDriving';
      confidence   = result.confidence  || 0;
    }

    const shouldAlert = preAlert ?? ALERT_STATES.includes(driverState);

    const record = await YOLORecord.create({
      sessionId, userId: req.user.id,
      driverState, confidence, alertSent: shouldAlert,
    });

    res.status(201).json({ success: true, record, driverState, confidence, shouldAlert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSessionYOLO = async (req, res) => {
  try {
    const records = await YOLORecord.find({ sessionId: req.params.sessionId, userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
