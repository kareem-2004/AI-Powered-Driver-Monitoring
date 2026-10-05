import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Wifi, WifiOff, Bluetooth } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSession } from '../../src/contexts/SessionContext';
import { getRawReadings } from '../../src/services/imuService';
import { getCurrentOBD } from '../../src/services/obdService';

export default function LiveDataScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { sessionState, obdConnected } = useSession();
  const isActive = sessionState === 'active';

  const [sensorData, setSensorData] = useState({ acceleration: { x: 0, y: 0, z: 0 }, gyroscope: { x: 0, y: 0, z: 0 } });
  const [obdData, setObdData]       = useState({ speed: 0, rpm: 0, coolantTemp: 0, throttle: 0, engineLoad: 0, fuelLevel: 0, intakeTemp: 0, runtime: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      if (isActive) {
        setSensorData(getRawReadings());
        if (obdConnected) setObdData(getCurrentOBD());
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isActive, obdConnected]);

  const val = (v: number, active: boolean) => active ? v.toFixed(3) : '--';
  const getColor = (active: boolean) => active ? colors.accent : colors.textSecondary;

  const sensorPoints = [
    { label: 'Accel X', value: val(sensorData.acceleration.x, isActive), unit: 'm/s²' },
    { label: 'Accel Y', value: val(sensorData.acceleration.y, isActive), unit: 'm/s²' },
    { label: 'Accel Z', value: val(sensorData.acceleration.z, isActive), unit: 'm/s²' },
    { label: 'Gyro X',  value: val(sensorData.gyroscope.x, isActive),    unit: 'rad/s' },
    { label: 'Gyro Y',  value: val(sensorData.gyroscope.y, isActive),    unit: 'rad/s' },
    { label: 'Gyro Z',  value: val(sensorData.gyroscope.z, isActive),    unit: 'rad/s' },
  ];

  const obdPoints = [
    { label: 'Speed',       value: obdConnected ? obdData.speed.toString()       : '--', unit: 'km/h' },
    { label: 'RPM',         value: obdConnected ? obdData.rpm.toString()          : '--', unit: 'rpm' },
    { label: 'Coolant',     value: obdConnected ? obdData.coolantTemp.toString()  : '--', unit: '°C' },
    { label: 'Throttle',    value: obdConnected ? obdData.throttle.toString()     : '--', unit: '%' },
    { label: 'Engine Load', value: obdConnected ? obdData.engineLoad.toString()   : '--', unit: '%' },
    { label: 'Fuel',        value: obdConnected ? obdData.fuelLevel.toString()    : '--', unit: '%' },
    { label: 'Intake Temp', value: obdConnected ? obdData.intakeTemp.toString()   : '--', unit: '°C' },
    { label: 'Runtime',     value: obdConnected ? obdData.runtime.toString()      : '--', unit: 's' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Live Data</Text>
        <View style={[styles.badge, { backgroundColor: colors.card, borderColor: isActive ? colors.accent + '44' : colors.border }]}>
          {isActive ? <Wifi size={12} color={colors.accent} /> : <WifiOff size={12} color={colors.textSecondary} />}
          <Text style={[styles.badgeText, { color: isActive ? colors.accent : colors.textSecondary }]}>{isActive ? 'LIVE' : 'IDLE'}</Text>
        </View>
      </View>

      {!isActive && (
        <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 20 }]}>
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>Start a session from Home to see live data</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Phone Sensors */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>📱 PHONE SENSORS (IMU)</Text>
        <View style={styles.grid}>
          {sensorPoints.map(p => (
            <View key={p.label} style={[styles.dataCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>{p.label}</Text>
              <Text style={[styles.dataValue, { color: getColor(isActive) }]}>{p.value}</Text>
              <Text style={[styles.dataUnit, { color: colors.textSecondary }]}>{p.unit}</Text>
            </View>
          ))}
        </View>

        {/* OBD Data */}
        <View style={styles.obdHeader}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>🔌 OBD-II (ELM327)</Text>
          {!obdConnected && (
            <TouchableOpacity style={[styles.connectBtn, { backgroundColor: colors.accent + '18', borderColor: colors.accent + '33' }]}
              onPress={() => router.push('/(app)/bluetooth' as any)}>
              <Bluetooth size={12} color={colors.accent} />
              <Text style={[styles.connectBtnText, { color: colors.accent }]}>Connect</Text>
            </TouchableOpacity>
          )}
        </View>

        {!obdConnected && (
          <TouchableOpacity style={[styles.obdNotice, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/(app)/bluetooth' as any)}>
            <Bluetooth size={20} color={colors.textSecondary} />
            <Text style={[styles.obdNoticeText, { color: colors.textSecondary }]}>Tap to connect ELM327 OBD-II adapter</Text>
            <Text style={[styles.obdNoticeLink, { color: colors.accent }]}>Connect →</Text>
          </TouchableOpacity>
        )}

        <View style={styles.grid}>
          {obdPoints.map(p => (
            <View key={p.label} style={[styles.dataCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>{p.label}</Text>
              <Text style={[styles.dataValue, { color: getColor(obdConnected) }]}>{p.value}</Text>
              <Text style={[styles.dataUnit, { color: colors.textSecondary }]}>{p.unit}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, paddingTop: 56 },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, gap: 12 },
  backBtn:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title:        { fontSize: 20, fontWeight: '700', flex: 1 },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  badgeText:    { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  notice:       { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12, alignItems: 'center' },
  noticeText:   { fontSize: 13 },
  content:      { padding: 20, gap: 12, paddingBottom: 40 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dataCard:     { width: '30%', borderRadius: 12, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1 },
  dataLabel:    { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  dataValue:    { fontSize: 16, fontWeight: '800' },
  dataUnit:     { fontSize: 9 },
  obdHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  connectBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  connectBtnText: { fontSize: 11, fontWeight: '600' },
  obdNotice:    { padding: 16, borderRadius: 14, alignItems: 'center', gap: 8, borderWidth: 1 },
  obdNoticeText:{ fontSize: 13, textAlign: 'center' },
  obdNoticeLink:{ fontSize: 13, fontWeight: '700' },
});
