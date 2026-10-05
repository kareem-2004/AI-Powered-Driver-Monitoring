import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Clock, CheckCircle, AlertTriangle, Play } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLang } from '../../src/contexts/LangContext';
import { BACKEND_URL } from '../../src/constants/config';

type Session = { _id: string; startTime: string; endTime: string; duration: number; drivingScore: number; status: string; obdConnected: boolean; totalEvents: number; };

export default function SessionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user }   = useAuth();
  const { t }      = useLang();
  const [sessions, setSessions]   = useState<Session[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res  = await fetch(`${BACKEND_URL}/sessions`, { headers: { Authorization: `Bearer ${user?.token}` } });
      const data = await res.json();
      if (data.success) setSessions(data.sessions);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { fetchSessions(); }, []);

  const scoreColor = (s: number) => s >= 80 ? colors.accent : s >= 60 ? colors.warning : colors.danger;
  const formatDur  = (s: number) => { const m = Math.floor(s / 60); return `${m}m ${s % 60}s`; };
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('sessions')}</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.countText, { color: colors.accent }]}>{sessions.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : sessions.length === 0 ? (
        <View style={styles.empty}>
          <Play size={40} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noSessions')}</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{t('startFirst')}</Text>
        </View>
      ) : (
        <FlatList data={sessions} keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSessions(); }} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/(app)/report', params: { sessionId: item._id } } as any)}>
              <View style={styles.cardTop}>
                <View style={[styles.scoreBadge, { backgroundColor: scoreColor(item.drivingScore || 0) + '22' }]}>
                  <Text style={[styles.scoreText, { color: scoreColor(item.drivingScore || 0) }]}>{item.drivingScore || '--'}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardDate, { color: colors.text }]}>{formatDate(item.startTime)}</Text>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                    {item.duration ? formatDur(item.duration) : 'In progress'} • {item.totalEvents || 0} events
                  </Text>
                </View>
                {item.obdConnected && <View style={[styles.obdDot, { backgroundColor: colors.info }]} />}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, paddingTop: 56 },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, gap: 12 },
  backBtn:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title:      { fontSize: 20, fontWeight: '700', flex: 1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  countText:  { fontSize: 13, fontWeight: '700' },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub:   { fontSize: 14, textAlign: 'center' },
  list:       { padding: 20, gap: 10 },
  card:       { borderRadius: 14, padding: 16, borderWidth: 1 },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoreBadge: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scoreText:  { fontSize: 20, fontWeight: '800' },
  cardInfo:   { flex: 1 },
  cardDate:   { fontSize: 15, fontWeight: '600' },
  cardMeta:   { fontSize: 12, marginTop: 2 },
  obdDot:     { width: 8, height: 8, borderRadius: 4 },
});
