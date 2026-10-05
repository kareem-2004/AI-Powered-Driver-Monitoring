import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Platform, PermissionsAndroid, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft, ChevronRight, Bluetooth, BluetoothOff,
  Zap, CheckCircle, RefreshCw, Car, AlertTriangle,
  Gauge, Thermometer, Fuel, Wind, Timer, Activity
} from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSession } from '../../src/contexts/SessionContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { scanForDevices, stopScan, connectToELM327, startOBDPolling, stopOBD, getCurrentOBD, isOBDConnected, getLastStyle, getLastFuel, DEFAULT_OBD, type OBDData } from '../../src/services/obdService';

type BTDevice = { id: string; name: string | null; rssi: number | null };

export default function BluetoothScreen() {
  const router  = useRouter();
  const { colors }  = useTheme();
  const { user }    = useAuth();
  const { sessionId, obdConnected, setObdConnected } = useSession();

  const [devices, setDevices]           = useState<BTDevice[]>([]);
  const [scanning, setScanning]         = useState(false);
  const [connecting, setConnecting]     = useState<string | null>(null);
  const [connDevice, setConnDevice]     = useState<BTDevice | null>(null);
  const [obdData, setObdData]           = useState<OBDData>(DEFAULT_OBD);
  const [drivingStyle, setDrivingStyle] = useState<string>('--');
  const [fuelEstimate, setFuelEstimate] = useState<number | null>(null);
  const [isAggressive, setIsAggressive] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(granted).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
    } catch { return false; }
  };

  const handleScan = async () => {
    const ok = await requestPermissions();
    if (!ok) { Alert.alert('Permission Required', 'Bluetooth and location permissions are required.'); return; }
    setDevices([]); setScanning(true);
    const found = new Map<string, BTDevice>();
    scanForDevices(
      (device) => {
        if (!found.has(device.id)) {
          found.set(device.id, device);
          setDevices([...found.values()]);
        }
      },
      (err) => { setScanning(false); Alert.alert('Scan Error', err); }
    );
    setTimeout(() => { stopScan(); setScanning(false); }, 15000);
  };

  // When OBD result comes in, update local UI state
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOBDConnected()) return;
      const obd = getCurrentOBD();
      setObdData(obd);
      const s = getLastStyle();
      const f = getLastFuel();
      if (s && s !== '--') setDrivingStyle(s);
      if (f !== null) setFuelEstimate(f);
      setIsAggressive(s?.toLowerCase() === 'aggressive');
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async (device: BTDevice) => {
    setConnecting(device.id);
    const success = await connectToELM327(device as any);
    setConnecting(null);
    if (success) {
      setConnDevice(device);
      setObdConnected(true);
      // Start polling if session active — home.tsx will also trigger this
      if (sessionId && user?.token) {
        startOBDPolling(
          sessionId, user.token,
          (data) => setObdData(data),
          (aggressive, style, fuel) => {
            setIsAggressive(aggressive);
            setDrivingStyle(style || '--');
            setFuelEstimate(fuel ?? null);
          }
        );
      }
    } else {
      Alert.alert('Connection Failed', 'Could not connect to ELM327.');
    }
  };

  const handleDisconnect = () => {
    stopOBD();
    setConnDevice(null);
    setObdConnected(false);
    setObdData(DEFAULT_OBD);
    setDrivingStyle('--');
    setFuelEstimate(null);
    setIsAggressive(false);
  };

  const styleColor = drivingStyle.toLowerCase() === 'aggressive' ? colors.danger
    : drivingStyle.toLowerCase() === 'eco' ? colors.accent : colors.info;

  const obdItems = [
    { label: 'Speed',       value: obdData.speed,       unit: 'km/h', Icon: Gauge },
    { label: 'Engine RPM',  value: obdData.rpm,         unit: 'rpm',  Icon: Activity },
    { label: 'Coolant',     value: obdData.coolantTemp, unit: '°C',   Icon: Thermometer },
    { label: 'Throttle',    value: obdData.throttle,    unit: '%',    Icon: Zap },
    { label: 'Engine Load', value: obdData.engineLoad,  unit: '%',    Icon: Activity },
    { label: 'Fuel Level',  value: obdData.fuelLevel,   unit: '%',    Icon: Fuel },
    { label: 'Intake Temp', value: obdData.intakeTemp,  unit: '°C',   Icon: Wind },
    { label: 'Runtime',     value: obdData.runtime,     unit: 's',    Icon: Timer },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>OBD-II Connect</Text>
        {obdConnected && (
          <View style={[styles.connBadge, { backgroundColor: colors.accent + '18', borderColor: colors.accent + '44' }]}>
            <View style={[styles.dot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.connBadgeText, { color: colors.accent }]}>CONNECTED</Text>
          </View>
        )}
      </View>

      {connDevice ? (
        <ScrollView contentContainerStyle={styles.connContent}>
          {/* Device Info */}
          <View style={[styles.devCard, { backgroundColor: colors.card, borderColor: colors.accent + '44' }]}>
            <View style={[styles.devIcon, { backgroundColor: colors.accent + '18' }]}>
              <Car size={28} color={colors.accent} />
            </View>
            <Text style={[styles.devName, { color: colors.text }]}>{connDevice.name || 'ELM327'}</Text>
            <View style={[styles.connTag, { backgroundColor: colors.accent + '18' }]}>
              <CheckCircle size={14} color={colors.accent} />
              <Text style={[styles.connTagText, { color: colors.accent }]}>ELM327 Active</Text>
            </View>
            {!sessionId && (
              <View style={[styles.noSessionRow, { backgroundColor: colors.warning + '18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }]}>
                <AlertTriangle size={12} color={colors.warning} />
                <Text style={[styles.noSessionText, { color: colors.warning }]}>Start a session to collect OBD data</Text>
              </View>
            )}
          </View>

          {/* Driving Style */}
          <View style={[styles.styleCard, { backgroundColor: colors.card, borderColor: styleColor + '44' }]}>
            <View style={styles.styleHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DRIVING STYLE</Text>
              {isAggressive && (
                <View style={[styles.aggressiveBadge, { backgroundColor: colors.danger + '18' }]}>
                  <AlertTriangle size={12} color={colors.danger} />
                  <Text style={[styles.aggressiveText, { color: colors.danger }]}>AGGRESSIVE</Text>
                </View>
              )}
            </View>
            <Text style={[styles.styleValue, { color: styleColor }]}>
              {drivingStyle === '--' ? '-- Waiting for data' : drivingStyle.toUpperCase()}
            </Text>
            {fuelEstimate !== null && (
              <View style={styles.fuelRow}>
                <Fuel size={13} color={colors.textSecondary} />
                <Text style={[styles.fuelText, { color: colors.textSecondary }]}>
                  Fuel estimate: {fuelEstimate.toFixed(2)} L/100km
                </Text>
              </View>
            )}
          </View>

          {/* Live OBD Data */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>LIVE VEHICLE DATA</Text>
          <View style={styles.obdGrid}>
            {obdItems.map(item => (
              <View key={item.label} style={[styles.obdCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <item.Icon size={18} color={colors.accent} />
                <Text style={[styles.obdLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.obdValue, { color: colors.accent }]}>{item.value}</Text>
                <Text style={[styles.obdUnit, { color: colors.textSecondary }]}>{item.unit}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={[styles.disconnectBtn, { backgroundColor: colors.card, borderColor: colors.danger + '44' }]} onPress={handleDisconnect}>
            <BluetoothOff size={18} color={colors.danger} />
            <Text style={[styles.disconnectText, { color: colors.danger }]}>Disconnect</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.scanContainer}>
          <View style={[styles.btIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Bluetooth size={48} color={scanning ? colors.accent : colors.textSecondary} />
          </View>
          <Text style={[styles.scanTitle, { color: colors.text }]}>
            {scanning ? 'Scanning...' : 'Connect OBD-II'}
          </Text>
          <Text style={[styles.scanSub, { color: colors.textSecondary }]}>
            Plug your ELM327 adapter into the car OBD port, then scan
          </Text>

          {!scanning ? (
            <TouchableOpacity style={[styles.scanBtn, { backgroundColor: colors.accent }]} onPress={handleScan}>
              <RefreshCw size={18} color="#000" />
              <Text style={styles.scanBtnText}>SCAN FOR DEVICES</Text>
            </TouchableOpacity>
          ) : (
            <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 20 }} />
          )}

          {devices.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, alignSelf: 'flex-start', marginTop: 24 }]}>
                FOUND DEVICES ({devices.length})
              </Text>
              <FlatList style={{ width: '100%' }} data={devices} keyExtractor={i => i.id}
                renderItem={({ item }) => {
                  const isELM = (item.name || '').toLowerCase().match(/obd|elm|scan|vlink|carista/);
                  return (
                    <TouchableOpacity
                      style={[styles.devRow, { backgroundColor: colors.card, borderColor: isELM ? colors.accent + '44' : colors.border }]}
                      onPress={() => handleConnect(item)}
                      disabled={!!connecting}
                    >
                      <View style={[styles.dot, { backgroundColor: isELM ? colors.accent : colors.textSecondary }]} />
                      <View style={styles.devInfo}>
                        <Text style={[styles.devRowName, { color: colors.text }]}>{item.name || 'Unknown Device'}</Text>
                        <Text style={[styles.devId, { color: colors.textSecondary }]}>{item.id}</Text>
                      </View>
                      {isELM && (
                        <View style={[styles.elmTag, { backgroundColor: colors.accent + '18' }]}>
                          <Zap size={10} color={colors.accent} />
                          <Text style={[styles.elmTagText, { color: colors.accent }]}>OBD</Text>
                        </View>
                      )}
                      {connecting === item.id
                        ? <ActivityIndicator size="small" color={colors.accent} />
                        : <ChevronRight size={16} color={colors.textSecondary} />
                      }
                    </TouchableOpacity>
                  );
                }}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, paddingTop: 56, paddingHorizontal: 20 },
  header:          { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  backBtn:         { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title:           { fontSize: 20, fontWeight: '700', flex: 1 },
  connBadge:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  dot:             { width: 8, height: 8, borderRadius: 4 },
  connBadgeText:   { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  connContent:     { paddingBottom: 40, gap: 16 },
  devCard:         { borderRadius: 20, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1 },
  devIcon:         { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  devName:         { fontSize: 18, fontWeight: '700' },
  connTag:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  connTagText:     { fontSize: 12, fontWeight: '600' },
  noSessionRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  noSessionText:   { fontSize: 12 },
  styleCard:       { borderRadius: 16, padding: 16, borderWidth: 1, gap: 8 },
  styleHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aggressiveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  aggressiveText:  { fontSize: 11, fontWeight: '700' },
  styleValue:      { fontSize: 28, fontWeight: '800' },
  fuelRow:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fuelText:        { fontSize: 13 },
  sectionLabel:    { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  obdGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  obdCard:         { width: '47%', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1 },
  obdLabel:        { fontSize: 11, textAlign: 'center' },
  obdValue:        { fontSize: 22, fontWeight: '800' },
  obdUnit:         { fontSize: 11 },
  disconnectBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, borderWidth: 1 },
  disconnectText:  { fontWeight: '700', fontSize: 15 },
  scanContainer:   { flex: 1, alignItems: 'center' },
  btIcon:          { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 20 },
  scanTitle:       { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  scanSub:         { fontSize: 13, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  scanBtn:         { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  scanBtnText:     { color: '#000', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  devRow:          { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, gap: 10, width: '100%' },
  devInfo:         { flex: 1 },
  devRowName:      { fontSize: 15, fontWeight: '600' },
  devId:           { fontSize: 11, marginTop: 2 },
  elmTag:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  elmTagText:      { fontSize: 10, fontWeight: '700' },
});
