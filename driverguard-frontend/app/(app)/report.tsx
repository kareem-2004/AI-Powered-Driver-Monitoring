import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft, AlertTriangle, Zap, TrendingUp, TrendingDown,
  ShieldCheck, Eye, Navigation, Gauge, Fuel, RotateCcw,
  ArrowLeftRight, Activity, Car, Info,
} from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { BACKEND_URL } from '../../src/constants/config';

type Report = {
  drivingScore:    number;
  overallGrade:    string;
  totalEvents:     number;
  totalDistance:   number;
  avgSpeed:        number;
  maxSpeed:        number;
  maxDeceleration: number;
  harshBraking:    number;
  harshAccel:      number;
  sharpTurns:      number;
  laneChanges:     number;
  distractedCount: number;
  sleepyCount:     number;
  dangerousCount:  number;
  drivingStyle:    string;
  fuelScore:       number;
  aggressiveEvents:number;
  overspeedCount:  number;
  recommendations: string[];
};

export default function ReportScreen() {
  const router     = useRouter();
  const { colors } = useTheme();
  const { user }   = useAuth();
  const params     = useLocalSearchParams();
  const [report, setReport]   = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.report) {
      setReport(JSON.parse(params.report as string));
      setLoading(false);
      return;
    }
    if (params.sessionId) {
      fetch(`${BACKEND_URL}/report/${params.sessionId}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      })
        .then(r => r.json())
        .then(d => { if (d.success) setReport(d.report); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  const scoreColor = (s: number) =>
    s >= 80 ? colors.accent : s >= 60 ? colors.warning : colors.danger;

  const gradeColor = (g: string) =>
    g === 'A' ? colors.accent :
    g === 'B' ? colors.info :
    g === 'C' ? colors.warning : colors.danger;

  const styleColor = (s: string) =>
    s?.toLowerCase() === 'aggressive' ? colors.danger :
    s?.toLowerCase() === 'eco'        ? colors.accent : colors.info;

  const styleDesc = (s: string) =>
    s?.toLowerCase() === 'aggressive'
      ? 'High fuel consumption, increased vehicle wear'
      : s?.toLowerCase() === 'eco'
      ? 'Excellent fuel efficiency, low vehicle wear'
      : 'Balanced driving, normal fuel consumption';

  if (loading) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );

  if (!report) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={[styles.noData, { color: colors.textSecondary }]}>
        No report available. End a session first.
      </Text>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ color: colors.accent, marginTop: 12 }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const sc = scoreColor(report.drivingScore ?? 0);
  const gc = gradeColor(report.overallGrade ?? 'F');
  const stc = styleColor(report.drivingStyle ?? '');

  const totalIncidents =
    (report.harshBraking    ?? 0) +
    (report.harshAccel      ?? 0) +
    (report.sharpTurns      ?? 0) +
    (report.laneChanges     ?? 0) +
    (report.distractedCount ?? 0) +
    (report.sleepyCount     ?? 0) +
    (report.dangerousCount  ?? 0);

  const isWarning = (text: string) => text.startsWith('⚠️');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Session Report</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Score Card */}
        <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: sc + '44' }]}>
          <View style={styles.scoreLeft}>
            <Text style={[styles.scoreNum, { color: sc }]}>{report.drivingScore ?? '--'}</Text>
            <Text style={[styles.scoreUnit, { color: colors.textSecondary }]}>/ 100</Text>
          </View>
          <View style={styles.scoreRight}>
            <View style={[styles.gradeBadge, { backgroundColor: gc + '22', borderColor: gc + '44' }]}>
              <Text style={[styles.gradeText, { color: gc }]}>{report.overallGrade ?? '--'}</Text>
            </View>
            <Text style={[styles.scoreLabel, { color: colors.text }]}>Driving Score</Text>
            <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${report.drivingScore ?? 0}%` as any, backgroundColor: sc }]} />
            </View>
            <Text style={[styles.incidentText, { color: colors.textSecondary }]}>
              {totalIncidents} total incidents detected
            </Text>
          </View>
        </View>

        {/* Driving Style + Fuel — Prominent Card */}
        {report.drivingStyle && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DRIVING STYLE & FUEL</Text>
            <View style={[styles.styleCard, { backgroundColor: colors.card, borderColor: stc + '55' }]}>
              {/* Style row */}
              <View style={styles.styleRow}>
                <View style={[styles.styleIconBox, { backgroundColor: stc + '18' }]}>
                  <Car size={24} color={stc} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.styleTitle, { color: stc }]}>
                    {(report.drivingStyle ?? '').toUpperCase()}
                  </Text>
                  <Text style={[styles.styleDesc, { color: colors.textSecondary }]}>
                    {styleDesc(report.drivingStyle)}
                  </Text>
                </View>
              </View>

              <View style={[styles.styleDivider, { backgroundColor: colors.border }]} />

              {/* Fuel row */}
              <View style={styles.styleRow}>
                <View style={[styles.styleIconBox, { backgroundColor: colors.accent + '18' }]}>
                  <Fuel size={24} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.styleTitle, { color: colors.accent }]}>
                    {(report.fuelScore ?? 0) > 0
                      ? `${(report.fuelScore ?? 0).toFixed(2)} L/h`
                      : 'No Data'}
                  </Text>
                  <Text style={[styles.styleDesc, { color: colors.textSecondary }]}>
                    Average fuel consumption this session
                  </Text>
                </View>
              </View>

              {/* Aggressive events */}
              {(report.aggressiveEvents ?? 0) > 0 && (
                <>
                  <View style={[styles.styleDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.styleRow}>
                    <View style={[styles.styleIconBox, { backgroundColor: colors.danger + '18' }]}>
                      <AlertTriangle size={24} color={colors.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.styleTitle, { color: colors.danger }]}>
                        {report.aggressiveEvents} Aggressive Events
                      </Text>
                      <Text style={[styles.styleDesc, { color: colors.textSecondary }]}>
                        Aggressive driving increases fuel use by up to 40%
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </>
        )}

        {/* GPS Stats */}
        {((report.totalDistance ?? 0) > 0 || (report.maxSpeed ?? 0) > 0) && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>GPS SUMMARY</Text>
            <View style={styles.gpsRow}>
              {[
                { label: 'Distance',  value: `${(report.totalDistance ?? 0).toFixed(1)}`, unit: 'km',   Icon: Navigation },
                { label: 'Avg Speed', value: `${Math.round(report.avgSpeed ?? 0)}`,        unit: 'km/h', Icon: Gauge },
                { label: 'Max Speed', value: `${Math.round(report.maxSpeed ?? 0)}`,        unit: 'km/h', Icon: TrendingUp },
              ].map(s => (
                <View key={s.label} style={[styles.gpsStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <s.Icon size={16} color={colors.accent} />
                  <Text style={[styles.gpsVal, { color: colors.text }]}>{s.value}</Text>
                  <Text style={[styles.gpsUnit, { color: colors.textSecondary }]}>{s.unit}</Text>
                  <Text style={[styles.gpsLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Braking & Motion */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>BRAKING & MOTION</Text>
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: 'Harsh Braking (GPS)',  value: report.harshBraking    ?? 0, Icon: TrendingDown,   color: colors.danger },
            { label: 'Overspeeding (>120)',   value: report.overspeedCount  ?? 0, Icon: Gauge,          color: colors.danger  },
            { label: 'Sharp Turns',          value: report.sharpTurns      ?? 0, Icon: RotateCcw,      color: colors.warning },
            { label: 'Lane Changes',         value: report.laneChanges     ?? 0, Icon: ArrowLeftRight, color: colors.info },
          ].map((item, i, arr) => (
            <View key={item.label} style={[styles.detailRow, i < arr.length - 1 && { borderBottomWidth: 1, borderColor: colors.border }]}>
              <View style={[styles.detailIconBox, { backgroundColor: item.color + '18' }]}>
                <item.Icon size={14} color={item.color} />
              </View>
              <Text style={[styles.detailLabel, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.detailValue, { color: item.value > 0 ? item.color : colors.accent }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Camera Events */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CAMERA EVENTS</Text>
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: 'Distracted', value: report.distractedCount ?? 0, Icon: Eye,           color: '#FF8800' },
            { label: 'Drowsy',     value: report.sleepyCount     ?? 0, Icon: Eye,           color: colors.warning },
            { label: 'Dangerous',  value: report.dangerousCount  ?? 0, Icon: AlertTriangle, color: colors.danger },
          ].map((item, i, arr) => (
            <View key={item.label} style={[styles.detailRow, i < arr.length - 1 && { borderBottomWidth: 1, borderColor: colors.border }]}>
              <View style={[styles.detailIconBox, { backgroundColor: item.color + '18' }]}>
                <item.Icon size={14} color={item.color} />
              </View>
              <Text style={[styles.detailLabel, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.detailValue, { color: item.value > 0 ? item.color : colors.accent }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Max Deceleration */}
        {(report.maxDeceleration ?? 0) > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>BRAKING INTENSITY</Text>
            <View style={[styles.decelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TrendingDown size={20} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.decelLabel, { color: colors.textSecondary }]}>MAX DECELERATION</Text>
                <Text style={[styles.decelVal, { color: colors.danger }]}>
                  {(report.maxDeceleration ?? 0).toFixed(1)} km/h/s
                </Text>
              </View>
              <Text style={[styles.decelHint, { color: colors.textSecondary }]}>
                {(report.maxDeceleration ?? 0) > 30 ? 'Very harsh' :
                 (report.maxDeceleration ?? 0) > 15 ? 'Harsh' : 'Moderate'}
              </Text>
            </View>
          </>
        )}

        {/* Recommendations */}
        {(report.recommendations?.length ?? 0) > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>RECOMMENDATIONS</Text>
            <View style={{ gap: 8 }}>
              {report.recommendations.map((r, i) => {
                const warn = isWarning(r);
                const text = r.replace('⚠️ ', '');
                const bgColor = warn ? colors.danger + '12' : colors.card;
                const borderColor = warn ? colors.danger + '44' : colors.border;
                const iconColor = warn ? colors.danger : colors.accent;
                const Icon = warn ? AlertTriangle : Info;
                return (
                  <View key={i} style={[styles.recCard, { backgroundColor: bgColor, borderColor }]}>
                    <View style={[styles.recIconBox, { backgroundColor: iconColor + '18' }]}>
                      <Icon size={16} color={iconColor} />
                    </View>
                    <Text style={[styles.recText, { color: colors.text }]}>{text}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, paddingTop: 56 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  noData:       { fontSize: 16, textAlign: 'center' },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16, gap: 12 },
  backBtn:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title:        { fontSize: 20, fontWeight: '700', flex: 1 },
  content:      { padding: 20, gap: 14, paddingBottom: 40 },
  scoreCard:    { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1 },
  scoreLeft:    { alignItems: 'center', minWidth: 80 },
  scoreNum:     { fontSize: 56, fontWeight: '800' },
  scoreUnit:    { fontSize: 14, marginTop: -8 },
  scoreRight:   { flex: 1, gap: 6 },
  gradeBadge:   { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  gradeText:    { fontSize: 18, fontWeight: '800' },
  scoreLabel:   { fontSize: 14, fontWeight: '600' },
  progressBg:   { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  incidentText: { fontSize: 11 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  styleCard:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden', padding: 16, gap: 14 },
  styleRow:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  styleIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  styleTitle:   { fontSize: 18, fontWeight: '800' },
  styleDesc:    { fontSize: 12, marginTop: 2, lineHeight: 16 },
  styleDivider: { height: 1 },
  gpsRow:       { flexDirection: 'row', gap: 10 },
  gpsStat:      { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 3, borderWidth: 1 },
  gpsVal:       { fontSize: 20, fontWeight: '800' },
  gpsUnit:      { fontSize: 11 },
  gpsLabel:     { fontSize: 10, textAlign: 'center' },
  detailCard:   { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  detailRow:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  detailIconBox:{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  detailLabel:  { flex: 1, fontSize: 14 },
  detailValue:  { fontSize: 16, fontWeight: '700' },
  decelCard:    { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  decelLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  decelVal:     { fontSize: 22, fontWeight: '800' },
  decelHint:    { fontSize: 12, fontWeight: '600' },
  recCard:      { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  recIconBox:   { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  recText:      { flex: 1, fontSize: 13, lineHeight: 20 },
});
