import Report from '../../models/Report.js';
import IMURecord from '../../models/IMURecord.js';
import YOLORecord from '../../models/YOLORecord.js';
import OBDRecord from '../../models/OBDRecord.js';

// Generate report when session ends
export const generateReport = async (sessionId, userId, gpsStats = {}) => {
  try {
    // ── Fetch all records ────────────────────────────────────────────────────
    const [imuRecords, yoloRecords, obdRecords] = await Promise.all([
      IMURecord.find({ sessionId, userId }),
      YOLORecord.find({ sessionId, userId }),
      OBDRecord.find({ sessionId, userId }),
    ]);

    // ── IMU stats ────────────────────────────────────────────────────────────
    const harshAccel  = imuRecords.filter(r => r.event === 'harsh_acceleration').length;
    const sharpLeft   = imuRecords.filter(r => r.event === 'sharp_turn_left').length;
    const sharpRight  = imuRecords.filter(r => r.event === 'sharp_turn_right').length;
    const laneLeft    = imuRecords.filter(r => r.event === 'lane_change_left').length;
    const laneRight   = imuRecords.filter(r => r.event === 'lane_change_right').length;
    const sharpTurns  = sharpLeft + sharpRight;
    const laneChanges = laneLeft + laneRight;

    // ── GPS harsh brakes ─────────────────────────────────────────────────────
    const harshBraking = gpsStats.harshBrakeCount || 0;

    // ── YOLO stats ───────────────────────────────────────────────────────────
    const distractedCount = yoloRecords.filter(r => r.driverState === 'Distracted').length;
    const sleepyCount     = yoloRecords.filter(r => r.driverState === 'SleepyDriving').length;
    const dangerousCount  = yoloRecords.filter(r => r.driverState === 'DangerousDriving').length;

    // ── OBD stats ────────────────────────────────────────────────────────────
    const aggressiveEvents = obdRecords.filter(r => r.isAggressive).length;
    const avgFuel = obdRecords.length > 0
      ? obdRecords.reduce((s, r) => s + (r.fuelEstimate || 0), 0) / obdRecords.length
      : 0;

    // Dominant driving style
    const styleCounts = {};
    obdRecords.forEach(r => {
      if (r.drivingStyle) styleCounts[r.drivingStyle] = (styleCounts[r.drivingStyle] || 0) + 1;
    });
    const drivingStyle = Object.keys(styleCounts).length > 0
      ? Object.entries(styleCounts).sort((a,b) => b[1]-a[1])[0][0]
      : 'Normal';

    // ── Score calculation ─────────────────────────────────────────────────────
    // Start at 100, deduct for bad events
    let score = 100;
    score -= harshBraking  * 5;   // GPS harsh brakes — most reliable
    score -= harshAccel    * 3;   // IMU harsh acceleration
    score -= sharpTurns    * 4;   // IMU sharp turns
    score -= laneChanges   * 2;   // IMU lane changes
    score -= distractedCount * 4; // YOLO distracted
    score -= sleepyCount   * 6;   // YOLO drowsy — most dangerous
    score -= dangerousCount * 8;  // YOLO dangerous
    score -= aggressiveEvents * 2; // OBD aggressive
    score = Math.max(0, Math.min(100, Math.round(score)));

    // ── Grade ─────────────────────────────────────────────────────────────────
    const overallGrade =
      score >= 90 ? 'A' :
      score >= 80 ? 'B' :
      score >= 70 ? 'C' :
      score >= 60 ? 'D' : 'F';

    // ── Recommendations ───────────────────────────────────────────────────────
    const recommendations = [];
    if (harshBraking > 3)
      recommendations.push(`You braked harshly ${harshBraking} times. Maintain more distance from vehicles ahead.`);
    if (harshAccel > 3)
      recommendations.push(`Rapid acceleration detected ${harshAccel} times. Accelerate gradually to save fuel.`);
    if (sharpTurns > 2)
      recommendations.push(`${sharpTurns} sharp turns detected. Slow down before turning.`);
    if (distractedCount > 5)
      recommendations.push(`You were distracted ${distractedCount} times. Keep your eyes on the road.`);
    if (sleepyCount > 3)
      recommendations.push(`Drowsiness detected ${sleepyCount} times. Consider taking a break.`);
    if (drivingStyle === 'Aggressive' || drivingStyle === 'aggressive')
      recommendations.push('Aggressive driving style detected. Smooth acceleration and braking saves fuel and is safer.');
    if (gpsStats.maxSpeed && gpsStats.maxSpeed > 120)
      recommendations.push(`Max speed of ${gpsStats.maxSpeed.toFixed(0)} km/h detected. Stay within speed limits.`);
    if (recommendations.length === 0)
      recommendations.push('Great drive! Keep up the safe driving habits.');

    // ── Total events ─────────────────────────────────────────────────────────
    const totalEvents = harshBraking + harshAccel + sharpTurns + laneChanges +
                        distractedCount + sleepyCount + dangerousCount + aggressiveEvents;

    // ── Save report ───────────────────────────────────────────────────────────
    const report = await Report.findOneAndUpdate(
      { sessionId, userId },
      {
        sessionId, userId,
        drivingScore:    score,
        overallGrade,
        // GPS
        totalDistance:   gpsStats.totalDistance   || 0,
        avgSpeed:        gpsStats.avgSpeed         || 0,
        maxSpeed:        gpsStats.maxSpeed         || 0,
        maxDeceleration: gpsStats.maxDeceleration  || 0,
        // Events
        totalEvents,
        harshBraking,
        harshAccel,
        sharpTurns,
        laneChanges,
        distractedCount,
        sleepyCount,
        dangerousCount,
        aggressiveEvents,
        // OBD
        drivingStyle,
        fuelScore: Math.round(avgFuel * 100) / 100,
        recommendations,
      },
      { upsert: true, new: true }
    );

    return report;
  } catch (err) {
    console.error('Report generation error:', err);
    throw err;
  }
};

export const getSessionReport = async (req, res) => {
  try {
    const report = await Report.findOne({ sessionId: req.params.sessionId, userId: req.user.id });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found. End the session first.' });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserReports = async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user.id })
      .populate('sessionId', 'startTime endTime duration obdConnected')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
