import Session from '../../models/Session.js';
import IMURecord from '../../models/IMURecord.js';
import YOLORecord from '../../models/YOLORecord.js';
import OBDRecord from '../../models/OBDRecord.js';
import Report from '../../models/Report.js';

export const startSession = async (req, res) => {
  try {
    const { vehicleId, obdConnected } = req.body;
    await Session.updateMany({ userId: req.user.id, status: 'active' }, { status: 'completed', endTime: new Date() });
    const session = await Session.create({ userId: req.user.id, vehicleId, obdConnected: obdConnected || false });
    res.status(201).json({ success: true, message: 'Session started.', session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const gpsStats      = req.body?.gpsStats || {};

    const session = await Session.findOne({ _id: sessionId, userId: req.user.id });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    const endTime  = new Date();
    const duration = Math.round((endTime - session.startTime) / 1000);

    const [imuRecords, yoloRecords, obdRecords] = await Promise.all([
      IMURecord.find({ sessionId }),
      YOLORecord.find({ sessionId }),
      OBDRecord.find({ sessionId }),
    ]);

    // MUST define all variables BEFORE using them in score
    const harshBraking    = imuRecords.filter(r => r.event === 'sudden_brake').length;
    const harshAccel      = imuRecords.filter(r => r.event === 'harsh_acceleration').length;
    const sharpTurns      = imuRecords.filter(r => ['sharp_turn_left','sharp_turn_right'].includes(r.event)).length;
    const laneChanges     = imuRecords.filter(r => ['lane_change_left','lane_change_right'].includes(r.event)).length;
    const distractedCount = yoloRecords.filter(r => r.driverState === 'Distracted').length;
    const sleepyCount     = yoloRecords.filter(r => r.driverState === 'SleepyDriving').length;
    const dangerousCount  = yoloRecords.filter(r => r.driverState === 'DangerousDriving').length;
    const aggressiveEvents = obdRecords.filter(r => r.isAggressive).length;
    const overspeedCount  = gpsStats.overspeedCount  || 0;
    const harshBrakeGPS   = gpsStats.harshBrakeCount || 0;

    console.log('[SCORE DEBUG]', {
      harshBraking, harshAccel, sharpTurns, laneChanges,
      distractedCount, sleepyCount, dangerousCount,
      aggressiveEvents, overspeedCount, harshBrakeGPS,
      imuCount: imuRecords.length,
      yoloCount: yoloRecords.length,
      obdCount: obdRecords.length,
    });

    // Cap each category to avoid one sensor dominating the score
    const cappedDangerous    = Math.min(dangerousCount, 3);   // max -15
    const cappedDistracted   = Math.min(distractedCount, 5);  // max -15
    const cappedAggressive   = Math.min(aggressiveEvents, 10);// max -20
    const cappedHarshBrake   = Math.min(harshBrakeGPS, 5);    // max -25
    const cappedHarshAccel   = Math.min(harshAccel, 5);       // max -15
    const cappedSharpTurns   = Math.min(sharpTurns, 5);       // max -20
    const cappedLaneChanges  = Math.min(laneChanges, 5);      // max -10

    let drivingScore = 100;
    drivingScore -= cappedHarshBrake  * 5;
    drivingScore -= overspeedCount    * 5;
    drivingScore -= cappedHarshAccel  * 3;
    drivingScore -= cappedSharpTurns  * 4;
    drivingScore -= cappedLaneChanges * 2;
    drivingScore -= cappedDistracted  * 3;
    drivingScore -= sleepyCount       * 5;
    drivingScore -= cappedDangerous   * 5;
    drivingScore -= cappedAggressive  * 2;
    drivingScore = Math.max(0, Math.min(100, Math.round(drivingScore)));

    const overallGrade = drivingScore >= 90 ? 'A' : drivingScore >= 80 ? 'B' : drivingScore >= 70 ? 'C' : drivingScore >= 60 ? 'D' : 'F';

    const avgSpeed = obdRecords.length > 0
      ? Math.round(obdRecords.reduce((s, r) => s + (r.speed || 0), 0) / obdRecords.length) : 0;
    const maxSpeed = obdRecords.length > 0
      ? Math.max(...obdRecords.map(r => r.speed || 0)) : 0;
    const fuelRecords = obdRecords.filter(r => r.fuelEstimate > 0);
    const avgFuel = fuelRecords.length > 0
      ? fuelRecords.reduce((s, r) => s + r.fuelEstimate, 0) / fuelRecords.length : 0;

    const styleCounts = {};
    obdRecords.forEach(r => {
      if (r.drivingStyle) styleCounts[r.drivingStyle] = (styleCounts[r.drivingStyle] || 0) + 1;
    });
    const drivingStyle = Object.keys(styleCounts).sort((a, b) => styleCounts[b] - styleCounts[a])[0] || 'Normal';

    const recommendations = generateRecommendations({
      drivingScore, harshBraking: harshBrakeGPS, harshAccel, sharpTurns,
      laneChanges, distractedCount, sleepyCount, aggressiveEvents, overspeedCount,
    });

    await session.updateOne({
      status: 'completed', endTime, duration, drivingScore,
      totalEvents: imuRecords.length,
      yoloAlerts: yoloRecords.filter(r => r.driverState !== 'SafeDriving').length,
      avgSpeed, drivingStyle, fuelScore: avgFuel,
    });

    const report = await Report.create({
      sessionId, userId: req.user.id,
      drivingScore, overallGrade,
      totalEvents: imuRecords.length,
      harshBraking: harshBrakeGPS,
      harshAccel, sharpTurns, laneChanges,
      distractedCount, sleepyCount, dangerousCount,
      aggressiveEvents, drivingStyle,
      fuelScore: Math.round(avgFuel * 100) / 100,
      avgSpeed, maxSpeed, recommendations,
      totalDistance:   gpsStats.totalDistance   || 0,
      maxDeceleration: gpsStats.maxDeceleration || 0,
      overspeedCount:  overspeedCount,
    });

    console.log(`[SESSION] Ended. Score=${drivingScore} Grade=${overallGrade}`);

    res.json({
      success: true, message: 'Session ended.',
      session: { ...session.toObject(), status: 'completed', endTime, duration, drivingScore },
      report,
    });
  } catch (err) {
    console.error('[SESSION] Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSessionById = async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.sessionId, userId: req.user.id });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

function generateRecommendations({ drivingScore, harshBraking, harshAccel, sharpTurns, laneChanges, distractedCount, sleepyCount, aggressiveEvents, overspeedCount = 0 }) {
  const recs = [];

  // Harsh braking — brake pad damage warning
  if (harshBraking >= 5) {
    recs.push('⚠️ Frequent harsh braking detected. This wears out your brake pads much faster and could lead to costly repairs. Maintain a safe following distance to brake gradually.');
  } else if (harshBraking >= 2) {
    recs.push('Harsh braking shortens brake pad life. Try to anticipate stops earlier and coast to slow down before applying brakes.');
  }

  // Overspeeding
  if (overspeedCount >= 3) {
    recs.push('\u26A0\uFE0F Repeated overspeeding detected. Driving above 120 km/h significantly increases accident risk and fuel consumption. Stay within speed limits.');
  } else if (overspeedCount >= 1) {
    recs.push('Overspeeding was detected during this drive. Keep your speed within legal limits for your safety and others.');
  }

  // Harsh acceleration — fuel and engine wear
  if (harshAccel >= 5) {
    recs.push('⚠️ Repeated harsh acceleration puts stress on your engine and transmission, and significantly increases fuel consumption. Accelerate smoothly and gradually.');
  } else if (harshAccel >= 2) {
    recs.push('Gradual acceleration improves fuel efficiency and reduces engine wear. Try to build speed steadily.');
  }

  // Sharp turns — tyre and suspension wear
  if (sharpTurns >= 3) {
    recs.push('Frequent sharp turns cause premature tyre and suspension wear. Slow down before turns and steer smoothly.');
  }

  // Lane changes
  if (laneChanges >= 4) {
    recs.push('Frequent lane changes increase accident risk. Always signal, check mirrors and blind spots before changing lanes.');
  }

  // Distraction
  if (distractedCount >= 5) {
    recs.push('⚠️ You were distracted multiple times during this drive. Keep your eyes on the road — distracted driving is a leading cause of accidents.');
  } else if (distractedCount >= 2) {
    recs.push('Stay focused on the road at all times. Avoid using your phone or other distractions while driving.');
  }

  // Drowsiness
  if (sleepyCount >= 3) {
    recs.push('⚠️ Drowsiness detected during your drive. Fatigue severely impairs reaction time. Pull over and rest if you feel tired.');
  } else if (sleepyCount >= 1) {
    recs.push('Signs of drowsiness were detected. On long drives, take a break every 2 hours to stay alert.');
  }

  // Aggressive driving style
  if (aggressiveEvents >= 5) {
    recs.push('⚠️ Aggressive driving detected throughout this session. This increases fuel consumption by up to 40% and puts extra stress on your brakes, tyres, and engine.');
  } else if (aggressiveEvents >= 2) {
    recs.push('Calmer driving saves fuel, reduces vehicle wear, and is safer for everyone on the road.');
  }

  // Positive feedback
  if (recs.length === 0) {
    if (drivingScore >= 90) {
      recs.push('Excellent drive! Your smooth and attentive driving protects your vehicle and saves fuel. Keep it up!');
    } else if (drivingScore >= 75) {
      recs.push('Good drive overall. Small improvements in braking and acceleration smoothness will help extend your vehicle life.');
    } else {
      recs.push('Keep working on smoother driving habits — your vehicle, wallet, and other road users will all benefit.');
    }
  }

  return recs;
}
