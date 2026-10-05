import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Activity, TrendingUp, AlertTriangle, CheckCircle, Zap, Bluetooth } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSession } from '../../src/contexts/SessionContext';
import { BACKEND_URL } from '../../src/constants/config';

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user }   = useAuth();
  const { sessionId, sessionState, obdConnected } = useSession();

  const [stats, setStats]         = useState({ total: 0, safe: 0, score: 0, lastEvent: '--' });
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      // Get latest session IMU data
      if (sessionId) {
        const res  = await fetch(`${BACKEND_URL}/imu/${sessionId}`, {
          headers: { Authorization: `Bearer ${user?.token}` }
        });
        const data = await res.json();
        if (data.success && data.records?.length > 0) {
          const records = data.records;
          const total   = records.length;
          const safe    = records.filter((r: any) => r.event === 'Normal').length;
          const score   = total > 0 ? Math.round((safe / total) * 100) : 100;
          const last    = records[0]?.event || 'Normal';
          setStats({ total, safe, score, lastEvent: last });
        }
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [sessionId, user]);

  useEffect(() => { fetchStats(); }, [sessionId]);

  const scoreColor = (s: number) => s >= 80 ? colors.accent : s >= 60 ? colors.warning : colors.danger;
  const isActive   = sessionState === 'active';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
        <View style={[styles.statusBadge, { backgroundColor: isActive ? colors.accent + '18' : colors.card, borderColor: isActive ? colors.accent + '44' : colors.border }]}>
          <View style={[styles.dot, { backgroundColor: isActive ? colors.accent : colors.border }]} />
          <Text style={[styles.statusText, { color: isActive ? colors.accent : colors.textSecondary }]}>{isActive ? 'LIVE' : 'IDLE'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={colors.accent} />}>

        {/* Score Card */}
        <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: scoreColor(stats.score) + '44' }]}>
          <View style={styles.scoreLeft}>
            <Text style={[styles.scoreNum, { color: scoreColor(stats.score) }]}>{stats.total > 0 ? stats.score : '--'}</Text>
            <Text style={[styles.scoreUnit, { color: colors.textSecondary }]}>/ 100</Text>
          </View>
          <View style={styles.scoreRight}>
            <Text style={[styles.scoreTitle, { color: colors.text }]}>Driving Score</Text>
            <View style={styles.scoreStats}>
              <View style={styles.scoreStat}>
                <Text style={[styles.scoreStatNum, { color: colors.text }]}>{stats.total}</Text>
                <Text style={[styles.scoreStatLabel, { color: colors.textSecondary }]}>Events</Text>
              </View>
              <View style={styles.scoreStat}>
                <Text style={[styles.scoreStatNum, { color: colors.accent }]}>{stats.safe}</Text>
                <Text style={[styles.scoreStatLabel, { color: colors.textSecondary }]}>Safe</Text>
              </View>
              <View style={styles.scoreStat}>
                <Text style={[styles.scoreStatNum, { color: colors.danger }]}>{stats.total - stats.safe}</Text>
                <Text style={[styles.scoreStatLabel, { color: colors.textSecondary }]}>Incidents</Text>
              </View>
            </View>
            <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${stats.score}%` as any, backgroundColor: scoreColor(stats.score) }]} />
            </View>
          </View>
        </View>

        {/* Last Event */}
        <View style={[styles.eventCard, { backgroundColor: colors.card, borderColor: stats.lastEvent !== 'Normal' && stats.lastEvent !== '--' ? colors.danger + '44' : colors.border }]}>
          <View style={styles.eventLeft}>
            {stats.lastEvent === 'Normal' || stats.lastEvent === '--'
              ? <CheckCircle size={20} color={stats.lastEvent === '--' ? colors.border : colors.accent} />
              : <AlertTriangle size={20} color={colors.danger} />
            }
            <View>
              <Text style={[styles.eventLabel, { color: colors.textSecondary }]}>LAST IMU EVENT</Text>
              <Text style={[styles.eventValue, { color: stats.lastEvent === 'Normal' ? colors.accent : stats.lastEvent === '--' ? colors.border : colors.danger }]}>{stats.lastEvent}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/(app)/report' as any)}>
            <Text style={[styles.viewMore, { color: colors.accent }]}>Report →</Text>
          </TouchableOpacity>
        </View>

        {/* OBD Status */}
        <View style={[styles.obdCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Bluetooth size={18} color={obdConnected ? colors.accent : colors.textSecondary} />
          <View style={styles.obdInfo}>
            <Text style={[styles.obdTitle, { color: colors.text }]}>OBD-II Status</Text>
            <Text style={[styles.obdSub, { color: obdConnected ? colors.accent : colors.textSecondary }]}>{obdConnected ? 'Connected — receiving vehicle data' : 'Not connected — tap to connect'}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(app)/bluetooth' as any)}>
            <Text style={[styles.viewMore, { color: colors.accent }]}>{obdConnected ? '✓' : 'Connect →'}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>QUICK ACTIONS</Text>
        <View style={styles.actionsGrid}>
          {[
            { label: 'HUD',      icon: Activity,   route: '/(app)/hud',      color: colors.accent },
            { label: 'Report',   icon: TrendingUp,  route: '/(app)/report',   color: colors.info },
            { label: 'Sessions', icon: Zap,         route: '/(app)/sessions', color: '#B388FF' },
            { label: 'Live Data',icon: Activity,    route: '/(app)/livedata', color: '#FF8800' },
          ].map(a => (
            <TouchableOpacity key={a.label} style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(a.route as any)}>
              <a.icon size={22} color={a.color} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, paddingTop: 56 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16, gap: 12 },
  backBtn:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title:         { fontSize: 20, fontWeight: '700', flex: 1 },
  statusBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  dot:           { width: 6, height: 6, borderRadius: 3 },
  statusText:    { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  content:       { padding: 20, gap: 14, paddingBottom: 40 },
  scoreCard:     { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1 },
  scoreLeft:     { alignItems: 'center', minWidth: 70 },
  scoreNum:      { fontSize: 52, fontWeight: '800' },
  scoreUnit:     { fontSize: 13, marginTop: -8 },
  scoreRight:    { flex: 1, gap: 8 },
  scoreTitle:    { fontSize: 14, fontWeight: '700' },
  scoreStats:    { flexDirection: 'row', gap: 16 },
  scoreStat:     { alignItems: 'center' },
  scoreStatNum:  { fontSize: 20, fontWeight: '800' },
  scoreStatLabel:{ fontSize: 11 },
  progressBg:    { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: 6, borderRadius: 3 },
  eventCard:     { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
  eventLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eventLabel:    { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  eventValue:    { fontSize: 18, fontWeight: '700', marginTop: 2 },
  viewMore:      { fontSize: 13, fontWeight: '700' },
  obdCard:       { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  obdInfo:       { flex: 1 },
  obdTitle:      { fontSize: 14, fontWeight: '600' },
  obdSub:        { fontSize: 12, marginTop: 2 },
  sectionLabel:  { fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  actionsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard:    { width: '47%', borderRadius: 14, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1 },
  actionLabel:   { fontSize: 13, fontWeight: '600' },
});
