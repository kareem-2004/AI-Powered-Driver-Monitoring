import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Clock, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLang } from '../../src/contexts/LangContext';
import { BACKEND_URL } from '../../src/constants/config';

export default function HistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user }   = useAuth();
  const { t }      = useLang();
  const [sessions, setSessions]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch_ = useCallback(async () => {
    try {
      const res  = await fetch(`${BACKEND_URL}/sessions`, { headers: { Authorization: `Bearer ${user?.token}` } });
      const data = await res.json();
      if (data.success) setSessions(data.sessions);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { fetch_(); }, []);

  const sc = (s: number) => s >= 80 ? colors.accent : s >= 60 ? colors.warning : colors.danger;
  const fd = (s: number) => { const m = Math.floor(s / 60); return `${m}m`; };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('history')}</Text>
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>
        : sessions.length === 0 ? (
          <View style={styles.center}>
            <Clock size={40} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('noSessions')}</Text>
          </View>
        ) : (
          <FlatList data={sessions} keyExtractor={i => i._id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch_(); }} tintColor={colors.accent} />}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push({ pathname: '/(app)/report', params: { sessionId: item._id } } as any)}>
                <View style={[styles.scoreDot, { backgroundColor: sc(item.drivingScore || 0) }]} />
                <View style={styles.info}>
                  <Text style={[styles.date, { color: colors.text }]}>{new Date(item.startTime).toLocaleDateString()}</Text>
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>Score: {item.drivingScore || '--'} • {item.duration ? fd(item.duration) : 'In progress'}</Text>
                </View>
                <Text style={[styles.arrow, { color: colors.accent }]}>→</Text>
              </TouchableOpacity>
            )}
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, gap: 12 },
  backBtn:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title:     { fontSize: 20, fontWeight: '700' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16 },
  list:      { padding: 20, gap: 10 },
  card:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  scoreDot:  { width: 12, height: 12, borderRadius: 6 },
  info:      { flex: 1 },
  date:      { fontSize: 15, fontWeight: '600' },
  meta:      { fontSize: 12, marginTop: 2 },
  arrow:     { fontSize: 18, fontWeight: '700' },
});
