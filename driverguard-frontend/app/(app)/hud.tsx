import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import {
  ChevronLeft, CameraOff, ShieldCheck, AlertTriangle,
  Eye, Activity, TrendingDown, TrendingUp,
  RotateCcw, RotateCw, ArrowLeftRight,
  Fuel, Gauge, Car, Navigation, MapPin,
} from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSession } from '../../src/contexts/SessionContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { subscribeEvent, getLastEvent } from '../../src/services/imuService';
import { getCurrentOBD, isOBDConnected, getLastStyle, getLastFuel } from '../../src/services/obdService';
import { getCurrentSpeed, getGPSStats, isGPSTracking } from '../../src/services/gpsService';
import { triggerAlert } from '../../src/services/alertService';
import { AI_URL, BACKEND_URL } from '../../src/constants/config';

const DRIVER_STATES: Record<string, { label: string; desc: string; color: string; Icon: any }> = {
  SafeDriving:      { label: 'Safe Driving',   desc: 'You are focused on the road',     color: '#00FF88', Icon: ShieldCheck },
  Distracted:       { label: 'Distracted!',    desc: 'Eyes off the road detected',      color: '#FF8800', Icon: Eye },
  DangerousDriving: { label: 'Dangerous!',     desc: 'Dangerous behaviour detected',    color: '#FF4444', Icon: AlertTriangle },
  SleepyDriving:    { label: 'Drowsy!',        desc: 'Signs of drowsiness detected',    color: '#FFB800', Icon: Eye },
};

const IMU_EVENTS: Record<string, { label: string; color: string; Icon: any }> = {
  'normal':             { label: 'Smooth Driving',     color: '#00FF88', Icon: ShieldCheck },
  'normal_driving':     { label: 'Smooth Driving',     color: '#00FF88', Icon: ShieldCheck },
  'harsh_acceleration': { label: 'Harsh Acceleration', color: '#FF8800', Icon: TrendingUp },
  'sudden_brake':       { label: 'Sudden Braking',     color: '#FF4444', Icon: TrendingDown },
  'lane_change_left':   { label: 'Lane Change Left',   color: '#FFB800', Icon: RotateCcw },
  'lane_change_right':  { label: 'Lane Change Right',  color: '#FFB800', Icon: RotateCw },
  'sharp_turn_left':    { label: 'Sharp Turn Left',    color: '#FF4444', Icon: RotateCcw },
  'sharp_turn_right':   { label: 'Sharp Turn Right',   color: '#FF4444', Icon: RotateCw },
};

const STYLE_CONFIG: Record<string, { color: string; Icon: any }> = {
  aggressive: { color: '#FF4444', Icon: AlertTriangle },
  Aggressive: { color: '#FF4444', Icon: AlertTriangle },
  normal:     { color: '#FF8800', Icon: Activity },
  Normal:     { color: '#FF8800', Icon: Activity },
  eco:        { color: '#00FF88', Icon: ShieldCheck },
  Eco:        { color: '#00FF88', Icon: ShieldCheck },
  '--':       { color: '#888888', Icon: Activity },
};

export default function HUDScreen() {
  const router = useRouter();
  const { colors }  = useTheme();
  const { user }    = useAuth();
  const { sessionId, sessionState, obdConnected } = useSession();
  const isActive = sessionState === 'active';

  const [permission, requestPermission] = useCameraPermissions();
  const [driverState, setDriverState] = useState('SafeDriving');
  const [confidence, setConfidence]   = useState(0);
  const [imuEvent, setImuEvent]       = useState('normal');
  const [frameCount, setFrameCount]   = useState(0);
  const [lastUpdate, setLastUpdate]   = useState('--');

  // OBD
  const [drivingStyle, setDrivingStyle] = useState('--');
  const [fuelEstimate, setFuelEstimate] = useState<number | null>(null);
  const [obdSpeed, setObdSpeed]         = useState(0);
  const [obdRpm, setObdRpm]             = useState(0);

  // GPS
  const [gpsSpeed, setGpsSpeed]               = useState(0);
  const [harshBrakeCount, setHarshBrakeCount] = useState(0);
  const [overspeedCount, setOverspeedCount]   = useState(0);

  const cameraRef   = useRef<any>(null);
  const alertAnim   = useRef(new Animated.Value(0)).current;
  const isCapturing = useRef(false);
  const intervals   = useRef<ReturnType<typeof setInterval>[]>([]);

  const clearAllIntervals = () => {
    intervals.current.forEach(clearInterval);
    intervals.current = [];
  };

  const flashAlert = () => {
    Animated.sequence([
      Animated.timing(alertAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(alertAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  };

  const captureAndDetect = async () => {
    if (isCapturing.current || !cameraRef.current || !sessionId || !user?.token) return;
    isCapturing.current = true;
    // Safety timeout — always release lock after 5 seconds no matter what
    const safetyTimeout = setTimeout(() => { isCapturing.current = false; }, 5000);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true, quality: 0.3, skipProcessing: true, exif: false,
        shutterSound: false, mute: true,
      });
      if (!photo?.base64) return;
      // 4 second timeout on AI fetch — don't let it hang forever
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(`${AI_URL}/yolo/detect_base64`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: photo.base64 }),
          signal: controller.signal,
        });
        clearTimeout(fetchTimeout);
        const data = await res.json();
        if (data.success) {
          setDriverState(data.driverState || 'SafeDriving');
          setConfidence(data.confidence || 0);
          setFrameCount(c => c + 1);
          setLastUpdate(new Date().toLocaleTimeString());
          if (data.shouldAlert) { flashAlert(); await triggerAlert(data.driverState); }
          fetch(`${BACKEND_URL}/yolo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
            body: JSON.stringify({ sessionId, driverState: data.driverState, confidence: data.confidence, alertSent: data.shouldAlert }),
          }).catch(() => {});
        }
      } catch (fetchErr) {
        clearTimeout(fetchTimeout);
        // Fetch failed or timed out — just continue
      }
    } catch {}
    finally {
      clearTimeout(safetyTimeout);
      isCapturing.current = false;
    }
  };

  // ── Session data: IMU + OBD + GPS — only depends on session being active ────
  useEffect(() => {
    if (!isActive || !sessionId) return;

    const last = getLastEvent();
    if (last) setImuEvent(last);
    const unsubIMU = subscribeEvent(setImuEvent);

    const obdPoll = setInterval(() => {
      if (isOBDConnected()) {
        const obd = getCurrentOBD();
        setObdSpeed(Math.round(obd.speed));
        setObdRpm(Math.round(obd.rpm));
        const s = getLastStyle();
        const f = getLastFuel();
        if (s && s !== '--') setDrivingStyle(s);
        if (f !== null) setFuelEstimate(f);
      }
      // Always read GPS stats — even if speed is 0, brake/overspeed counts matter
      setGpsSpeed(Math.round(getCurrentSpeed()));
      const stats = getGPSStats();
      setHarshBrakeCount(stats.harshBrakeCount);
      setOverspeedCount(stats.overspeedCount);
    }, 1500);

    return () => {
      clearInterval(obdPoll);
      unsubIMU();
    };
  }, [isActive, sessionId]);

  // ── YOLO — only starts when camera permission granted ────────────────────
  useEffect(() => {
    if (!isActive || !sessionId || !permission?.granted) return;

    // Slight delay so camera has time to initialize
    const startDelay = setTimeout(() => {
      captureAndDetect();
      const yoloPoll = setInterval(captureAndDetect, 2000); // 2s — less heat
      intervals.current.push(yoloPoll);
    }, 1000);

    return () => {
      clearTimeout(startDelay);
      clearAllIntervals();
    };
  }, [isActive, sessionId, permission?.granted]);

  const stateInfo = DRIVER_STATES[driverState] || DRIVER_STATES.SafeDriving;
  const imuInfo   = IMU_EVENTS[imuEvent]       || IMU_EVENTS['normal'];
  const styleInfo = STYLE_CONFIG[drivingStyle] || STYLE_CONFIG['--'];
  const alertBg   = alertAnim.interpolate({ inputRange: [0,1], outputRange: ['rgba(255,68,68,0)','rgba(255,68,68,0.15)'] });

  return (
    <Animated.View style={[{ flex: 1 }, { backgroundColor: alertBg as any }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
            <ChevronLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Live Monitor</Text>
          <View style={[styles.badge, { backgroundColor: isActive ? colors.accent+'18' : colors.card, borderColor: isActive ? colors.accent+'44' : colors.border }]}>
            <View style={[styles.dot, { backgroundColor: isActive ? colors.accent : colors.border }]} />
            <Text style={[styles.badgeText, { color: isActive ? colors.accent : colors.textSecondary }]}>
              {isActive ? 'LIVE' : 'IDLE'}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Camera */}
          {permission?.granted ? (
            <View style={styles.cameraWrapper}>
              <CameraView ref={cameraRef} style={styles.camera} facing="front" />
              <View style={[styles.cameraOverlay, { backgroundColor: stateInfo.color+'22', borderColor: stateInfo.color+'88' }]}>
                <stateInfo.Icon size={22} color={stateInfo.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stateLabel, { color: stateInfo.color }]}>{stateInfo.label}</Text>
                  <Text style={[styles.stateDesc, { color: stateInfo.color+'BB' }]}>{stateInfo.desc}</Text>
                </View>
                <Text style={[styles.stateConf, { color: stateInfo.color }]}>
                  {confidence > 0 ? `${Math.round(confidence * 100)}%` : ''}
                </Text>
              </View>
              <View style={styles.frameBox}>
                <Activity size={10} color="#FFF" />
                <Text style={styles.frameText}>{frameCount} frames</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={[styles.noCam, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={requestPermission}>
              <CameraOff size={32} color={colors.textSecondary} />
              <Text style={[styles.noCamTitle, { color: colors.text }]}>Camera Access Required</Text>
              <Text style={[styles.noCamText, { color: colors.textSecondary }]}>Tap to grant camera permission</Text>
            </TouchableOpacity>
          )}

          {/* Camera Detection */}
          <View style={[styles.detectionCard, { backgroundColor: colors.card, borderColor: stateInfo.color+'44' }]}>
            <View style={[styles.detectionIcon, { backgroundColor: stateInfo.color+'18' }]}>
              <stateInfo.Icon size={28} color={stateInfo.color} />
            </View>
            <View style={styles.detectionInfo}>
              <Text style={[styles.detectionLabel, { color: colors.textSecondary }]}>CAMERA DETECTION</Text>
              <Text style={[styles.detectionTitle, { color: stateInfo.color }]}>{stateInfo.label}</Text>
              <Text style={[styles.detectionDesc, { color: colors.textSecondary }]}>{stateInfo.desc}</Text>
              {confidence > 0 && (
                <View style={[styles.confBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.confFill, { width: `${Math.round(confidence*100)}%` as any, backgroundColor: stateInfo.color }]} />
                </View>
              )}
            </View>
          </View>

          {/* Motion Detection */}
          <View style={[styles.detectionCard, { backgroundColor: colors.card, borderColor: imuInfo.color+'44' }]}>
            <View style={[styles.detectionIcon, { backgroundColor: imuInfo.color+'18' }]}>
              <imuInfo.Icon size={28} color={imuInfo.color} />
            </View>
            <View style={styles.detectionInfo}>
              <Text style={[styles.detectionLabel, { color: colors.textSecondary }]}>MOTION DETECTION</Text>
              <Text style={[styles.detectionTitle, { color: imuInfo.color }]}>{imuInfo.label}</Text>
            </View>
          </View>

          {/* OBD Card */}
          {obdConnected && (
            <View style={[styles.obdCard, { backgroundColor: colors.card, borderColor: styleInfo.color+'44' }]}>
              <View style={styles.obdHeader}>
                <Car size={16} color={styleInfo.color} />
                <Text style={[styles.detectionLabel, { color: colors.textSecondary }]}>VEHICLE DATA</Text>
              </View>
              <View style={styles.obdRow}>
                <View style={[styles.detectionIcon, { backgroundColor: styleInfo.color+'18', width: 44, height: 44, borderRadius: 12 }]}>
                  <styleInfo.Icon size={22} color={styleInfo.color} />
                </View>
                <View style={styles.detectionInfo}>
                  <Text style={[styles.detectionLabel, { color: colors.textSecondary }]}>DRIVING STYLE</Text>
                  <Text style={[styles.detectionTitle, { color: styleInfo.color }]}>
                    {drivingStyle === '--' ? 'Waiting...' : drivingStyle.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.obdStats}>
                <View style={[styles.obdStat, { backgroundColor: colors.background, borderRadius: 10 }]}>
                  <Gauge size={14} color={colors.accent} />
                  <Text style={[styles.obdStatVal, { color: colors.text }]}>{obdSpeed}</Text>
                  <Text style={[styles.obdStatUnit, { color: colors.textSecondary }]}>km/h</Text>
                </View>
                <View style={[styles.obdStat, { backgroundColor: colors.background, borderRadius: 10 }]}>
                  <Activity size={14} color={colors.accent} />
                  <Text style={[styles.obdStatVal, { color: colors.text }]}>{obdRpm}</Text>
                  <Text style={[styles.obdStatUnit, { color: colors.textSecondary }]}>rpm</Text>
                </View>
                <View style={[styles.obdStat, { backgroundColor: colors.background, borderRadius: 10 }]}>
                  <Fuel size={14} color={colors.accent} />
                  <Text style={[styles.obdStatVal, { color: colors.text }]}>
                    {fuelEstimate !== null ? fuelEstimate.toFixed(1) : '--'}
                  </Text>
                  <Text style={[styles.obdStatUnit, { color: colors.textSecondary }]}>L/h</Text>
                </View>
              </View>
            </View>
          )}

          {/* GPS Card */}
          {isActive && (
            <View style={[styles.gpsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.obdHeader}>
                <Navigation size={16} color={colors.accent} />
                <Text style={[styles.detectionLabel, { color: colors.textSecondary }]}>GPS LIVE DATA</Text>
              </View>
              <View style={styles.obdStats}>
                <View style={[styles.obdStat, { backgroundColor: colors.background, borderRadius: 10 }]}>
                  <MapPin size={14} color={colors.accent} />
                  <Text style={[styles.obdStatVal, { color: colors.text }]}>{gpsSpeed}</Text>
                  <Text style={[styles.obdStatUnit, { color: colors.textSecondary }]}>km/h</Text>
                  <Text style={[styles.obdStatLabel, { color: colors.textSecondary }]}>GPS Speed</Text>
                </View>
                <View style={[styles.obdStat, { backgroundColor: colors.background, borderRadius: 10, borderWidth: harshBrakeCount > 0 ? 1 : 0, borderColor: colors.danger+'44' }]}>
                  <TrendingDown size={14} color={harshBrakeCount > 0 ? colors.danger : colors.textSecondary} />
                  <Text style={[styles.obdStatVal, { color: harshBrakeCount > 0 ? colors.danger : colors.text }]}>{harshBrakeCount}</Text>
                  <Text style={[styles.obdStatUnit, { color: colors.textSecondary }]}>times</Text>
                  <Text style={[styles.obdStatLabel, { color: colors.textSecondary }]}>Harsh Brakes</Text>
                </View>
                <View style={[styles.obdStat, { backgroundColor: colors.background, borderRadius: 10, borderWidth: overspeedCount > 0 ? 1 : 0, borderColor: colors.danger+'44' }]}>
                  <Gauge size={14} color={overspeedCount > 0 ? colors.danger : colors.textSecondary} />
                  <Text style={[styles.obdStatVal, { color: overspeedCount > 0 ? colors.danger : colors.text }]}>{overspeedCount}</Text>
                  <Text style={[styles.obdStatUnit, { color: colors.textSecondary }]}>times</Text>
                  <Text style={[styles.obdStatLabel, { color: colors.textSecondary }]}>Overspeed</Text>
                </View>
              </View>
            </View>
          )}

          <Text style={[styles.lastUpdate, { color: colors.textSecondary }]}>Last updated: {lastUpdate}</Text>

          {!isActive && (
            <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Activity size={20} color={colors.textSecondary} />
              <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                Start a session from the Home screen to activate live AI monitoring
              </Text>
            </View>
          )}

        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, paddingTop: 56 },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16, gap: 12 },
  backBtn:        { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title:          { fontSize: 20, fontWeight: '700', flex: 1 },
  badge:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  dot:            { width: 6, height: 6, borderRadius: 3 },
  badgeText:      { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  content:        { padding: 20, gap: 14, paddingBottom: 40 },
  cameraWrapper:  { borderRadius: 16, overflow: 'hidden', height: 240, position: 'relative' },
  camera:         { flex: 1 },
  cameraOverlay:  { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1 },
  stateLabel:     { fontSize: 16, fontWeight: '800' },
  stateDesc:      { fontSize: 11, marginTop: 2 },
  stateConf:      { fontSize: 18, fontWeight: '800' },
  frameBox:       { position: 'absolute', top: 8, right: 8, backgroundColor: '#00000077', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  frameText:      { color: '#FFF', fontSize: 11 },
  noCam:          { height: 200, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, gap: 8 },
  noCamTitle:     { fontSize: 16, fontWeight: '700' },
  noCamText:      { fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  detectionCard:  { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1 },
  detectionIcon:  { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  detectionInfo:  { flex: 1, gap: 4 },
  detectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  detectionTitle: { fontSize: 20, fontWeight: '800' },
  detectionDesc:  { fontSize: 13 },
  confBar:        { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  confFill:       { height: 4, borderRadius: 2 },
  obdCard:        { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  gpsCard:        { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  obdHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  obdRow:         { flexDirection: 'row', alignItems: 'center', gap: 14 },
  obdStats:       { flexDirection: 'row', gap: 8 },
  obdStat:        { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 },
  obdStatVal:     { fontSize: 18, fontWeight: '800' },
  obdStatUnit:    { fontSize: 10 },
  obdStatLabel:   { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  lastUpdate:     { textAlign: 'center', fontSize: 12 },
  notice:         { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  noticeText:     { flex: 1, fontSize: 13, lineHeight: 20 },
});
