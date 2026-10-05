import IMURecord from '../../models/IMURecord.js';
import { predictIMU } from '../../utils/ai.service.js';

export const recordIMU = async (req, res) => {
  try {
    const { sessionId, acceleration, gyroscope } = req.body;
    if (!sessionId || !acceleration || !gyroscope)
      return res.status(400).json({ success: false, message: 'sessionId, acceleration, gyroscope required.' });

    const aiResult = await predictIMU(acceleration, gyroscope);
    const record = await IMURecord.create({
      sessionId, userId: req.user.id, acceleration, gyroscope,
      event: aiResult.event || 'Normal',
      probabilities: aiResult.probabilities || {},
      aiSource: aiResult.source || 'imu_model',
    });

    res.status(201).json({ success: true, record, aiResult });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSessionIMU = async (req, res) => {
  try {
    const records = await IMURecord.find({ sessionId: req.params.sessionId, userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
