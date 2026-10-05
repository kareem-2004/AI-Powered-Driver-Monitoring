import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Zap, Menu, Gauge, Activity, Radio, Layers, FileText, Bluetooth, LogOut, WifiOff } from 'lucide-react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLang } from '../../src/contexts/LangContext';
import { useSession } from '../../src/contexts/SessionContext';
import { startIMU, stopIMU } from '../../src/services/imuService';
import { stopOBD, startOBDPolling, isOBDConnected } from '../../src/services/obdService';
import { startGPS, stopGPS } from '../../src/services/gpsService';
import { triggerAlert } from '../../src/services/alertService';

const NAV = [
  { icon: Gauge,     label: 'dashboard', route: '/(app)/dashboard', color: '#4A9EFF' },
  { icon: Activity,  label: 'hud',       route: '/(app)/hud',       color: '#00FF88' },
  { icon: Radio,     label: 'liveData',  route: '/(app)/livedata',  color: '#FF8800' },
  { icon: Layers,    label: 'sessions',  route: '/(app)/sessions',  color: '#B388FF' },
  { icon: FileText,  label: 'report',    route: '/(app)/report',    color: '#FF6B6B' },
  { icon: Bluetooth, label: 'bluetooth', route: '/(app)/bluetooth', color: '#00B4D8' },
];

// ─── Shared IMU event state (readable from HUD) ───────────────────────────────
let _globalImuEvent  = 'normal_driving';
let _globalImuSource = '';
let _imuListeners: Array<(event: string, source: string) => void> = [];

export const subscribeIMUEvent = (cb: (event: string, source: string) => void) => {
  _imuListeners.push(cb);
  return () => { _imuListeners = _imuListeners.filter(l => l !== cb); };
};
export const getLastIMUEvent = () => ({ event: _globalImuEvent, source: _globalImuSource });

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout }    = useAuth();
  const { colors }          = useTheme();
  const { t }               = useLang();
  const { sessionId, sessionState, startSession, endSession, obdConnected } = useSession();

  const [sessionTime, setSessionTime] = useState(0);
  const [lastEvent, setLastEvent]     = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isActive  = sessionState === 'active';
  const isEnding  = sessionState === 'ending';

  // Session timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive) {
      interval = setInterval(() => setSessionTime(s => s + 1), 1000);
    } else {
      setSessionTime(0);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  // Pulse animation
  useEffect(() => {
    if (isActive) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isActive]);

  const handleStart = async () => {
    const result = await startSession(undefined, obdConnected);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to start session');
      return;
    }

    // Keep screen on during session
    await activateKeepAwakeAsync();

    // Start GPS
    startGPS();

    // Start OBD polling if already connected
    if (isOBDConnected() && result.sessionId && user?.token) {
      startOBDPolling(result.sessionId, user.token, () => {}, () => {});
    }

    // Start IMU after short delay
    setTimeout(() => {
      if (result.sessionId) {
        startIMU(result.sessionId, user!.token, async (event, probs, source) => {
          setLastEvent(event);
          _globalImuEvent  = event;
          _globalImuSource = source;
          _imuListeners.forEach(cb => cb(event, source));
          const alertEvents = ['harsh_acceleration', 'sudden_brake', 'sharp_turn_left', 'sharp_turn_right'];
          if (alertEvents.includes(event)) {
            await triggerAlert(event);
          }
        });
      }
    }, 500);
  };

  const handleEnd = async () => {
    deactivateKeepAwake();
    stopIMU();
    stopOBD();
    const gpsStats = stopGPS();
    const result   = await endSession(gpsStats);
    setLastEvent('');
    _globalImuEvent  = 'normal_driving';
    _globalImuSource = '';
    if (result.success && result.report) {
      router.push({ pathname: '/(app)/report', params: { report: JSON.stringify(result.report) } } as any);
    }
  };

  const handleLogout = () => {
    deactivateKeepAwake();
    stopIMU();
    stopOBD();
    stopGPS();
    logout();
    router.replace('/auth/login');
  };

  const formatTime = (s: number) => {
    const h   = Math.floor(s / 3600).toString().padStart(2, '0');
    const m   = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  const c = colors;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]} onPress={() => setMenuVisible(true)}>
            <Menu size={20} color={c.text} />
          </TouchableOpacity>
          <View style={styles.logoRow}>
            <Zap size={16} color={c.accent} fill={c.accent} />
            <Text style={[styles.brand, { color: c.text }]}>DRIVERGUARD</Text>
          </View>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]} onPress={handleLogout}>
            <LogOut size={18} color={c.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <Text style={[styles.greeting, { color: c.text }]}>Hello, {user?.name?.split(' ')[0]}</Text>
        <Text style={[styles.greetingSub, { color: c.textSecondary }]}>Ready to hit the road?</Text>

        {/* Session Card */}
        <View style={[styles.sessionCard, { backgroundColor: c.card, borderColor: isActive ? c.accent+'55' : c.border }]}>
          <View style={styles.sessionLeft}>
            <Animated.View style={[styles.dot, { backgroundColor: isActive ? c.accent : c.border, transform: [{ scale: pulseAnim }] }]} />
            <View>
              <Text style={[styles.sessionLabel, { color: c.textSecondary }]}>
                {isEnding ? 'ENDING...' : isActive ? 'SESSION ACTIVE' : 'NO SESSION'}
              </Text>
              {isActive && <Text style={[styles.timer, { color: c.accent }]}>{formatTime(sessionTime)}</Text>}
              {isActive && lastEvent !== '' && (
                <Text style={[styles.lastEvent, { color: lastEvent === 'normal' ? c.textSecondary : c.warning }]}>
                  {lastEvent}
                </Text>
              )}
            </View>
          </View>

          {isEnding ? (
            <View style={[styles.btn, { backgroundColor: c.border }]}>
              <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 12 }}>...</Text>
            </View>
          ) : isActive ? (
            <TouchableOpacity style={[styles.btn, { backgroundColor: c.danger }]} onPress={handleEnd}>
              <Text style={[styles.btnText, { color: '#FFF' }]}>END</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.btn, { backgroundColor: c.accent }]} onPress={handleStart}>
              <Text style={[styles.btnText, { color: '#000' }]}>START</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* OBD Row */}
        <TouchableOpacity style={[styles.obdRow, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => router.push('/(app)/bluetooth' as any)}>
          {obdConnected
            ? <><View style={[styles.dot, { backgroundColor: c.accent }]} /><Text style={{ color: c.accent, fontSize: 13, fontWeight: '600', flex: 1 }}>OBD-II Connected</Text><Text style={{ color: c.accent, fontSize: 12, fontWeight: '700' }}>Active</Text></>
            : <><WifiOff size={14} color={c.textSecondary} /><Text style={{ color: c.textSecondary, fontSize: 13, flex: 1 }}>OBD-II not connected</Text><Text style={{ color: c.accent, fontSize: 12, fontWeight: '700' }}>Connect</Text></>
          }
        </TouchableOpacity>

        {/* Active models info */}
        {isActive && (
          <View style={[styles.infoCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.infoTitle, { color: c.textSecondary }]}>ACTIVE MODELS</Text>
            <View style={styles.infoRow}>
              <View style={[styles.infoDot, { backgroundColor: c.accent }]} />
              <Text style={[styles.infoText, { color: c.text }]}>IMU — Phone sensors detecting driving events</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.infoDot, { backgroundColor: c.info }]} />
              <Text style={[styles.infoText, { color: c.text }]}>YOLO — Open HUD screen to activate camera</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.infoDot, { backgroundColor: '#00B4D8' }]} />
              <Text style={[styles.infoText, { color: c.text }]}>GPS — Tracking speed and harsh events</Text>
            </View>
            {obdConnected && (
              <View style={styles.infoRow}>
                <View style={[styles.infoDot, { backgroundColor: '#FF8800' }]} />
                <Text style={[styles.infoText, { color: c.text }]}>OBD — Driving style + fuel model active</Text>
              </View>
            )}
          </View>
        )}

        {/* Nav Grid */}
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>FEATURES</Text>
        <View style={styles.grid}>
          {NAV.map(item => (
            <TouchableOpacity key={item.label} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => router.push(item.route as any)}>
              <View style={[styles.cardIcon, { backgroundColor: item.color+'18' }]}>
                <item.icon size={24} color={item.color} />
              </View>
              <Text style={[styles.cardText, { color: c.text }]}>{t(item.label as any)}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* Menu */}
      <Modal visible={menuVisible} transparent animationType="slide" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} onPress={() => setMenuVisible(false)} activeOpacity={1}>
          <View style={[styles.menuPanel, { backgroundColor: c.card }]}>
            <Text style={[styles.menuTitle, { color: c.text }]}>Menu</Text>
            {[
              { label: 'Profile',  route: '/(app)/profile' },
              { label: 'Settings', route: '/(app)/settings' },
              { label: 'History',  route: '/(app)/history' },
            ].map(item => (
              <TouchableOpacity key={item.label} style={[styles.menuItem, { borderColor: c.border }]}
                onPress={() => { setMenuVisible(false); router.push(item.route as any); }}>
                <Text style={[styles.menuItemText, { color: c.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content:      { padding: 20, paddingTop: 56, paddingBottom: 40 },
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  iconBtn:      { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  logoRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand:        { fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  greeting:     { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  greetingSub:  { fontSize: 13, marginBottom: 16 },
  sessionCard:  { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, marginBottom: 10 },
  sessionLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  sessionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  timer:        { fontSize: 26, fontWeight: '800', marginTop: 2 },
  lastEvent:    { fontSize: 12, marginTop: 2 },
  btn:          { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  btnText:      { fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  obdRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  infoCard:     { borderRadius: 14, padding: 14, borderWidth: 1, gap: 8, marginBottom: 16 },
  infoTitle:    { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoDot:      { width: 8, height: 8, borderRadius: 4 },
  infoText:     { fontSize: 13, flex: 1 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card:         { width: '47%', borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  cardIcon:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardText:     { fontSize: 14, fontWeight: '600' },
  menuOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  menuPanel:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  menuTitle:    { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  menuItem:     { paddingVertical: 16, borderBottomWidth: 1 },
  menuItemText: { fontSize: 16 },
});
