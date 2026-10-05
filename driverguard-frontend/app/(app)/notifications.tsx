import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, AlertTriangle, CheckCircle, Trash2, Zap } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';

type Notif = { id: string; title: string; body: string; time: string; type: 'alert' | 'success' | 'info'; };

const SAMPLE: Notif[] = [
  { id: '1', title: 'Harsh Braking', body: 'Sudden brake detected', time: '2m ago', type: 'alert' },
  { id: '2', title: 'Session Saved', body: 'Your session has been saved', time: '1h ago', type: 'success' },
  { id: '3', title: 'Score Updated', body: 'Your driving score is 84', time: '3h ago', type: 'info' },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [notifs, setNotifs] = useState<Notif[]>(SAMPLE);
  const getColor = (t: string) => t === 'alert' ? colors.danger : t === 'success' ? colors.accent : colors.info;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        {notifs.length > 0 && <TouchableOpacity onPress={() => setNotifs([])}><Text style={{ color: colors.danger, fontSize: 13 }}>Clear</Text></TouchableOpacity>}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {notifs.length === 0 ? (
          <View style={styles.empty}>
            <Bell size={40} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notifications</Text>
          </View>
        ) : notifs.map(n => (
          <View key={n.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: getColor(n.type) }]}>
            <View style={[styles.icon, { backgroundColor: getColor(n.type) + '18' }]}>
              {n.type === 'alert' ? <AlertTriangle size={16} color={getColor(n.type)} /> : n.type === 'success' ? <CheckCircle size={16} color={getColor(n.type)} /> : <Zap size={16} color={getColor(n.type)} />}
            </View>
            <View style={styles.body}>
              <Text style={[styles.notifTitle, { color: colors.text }]}>{n.title}</Text>
              <Text style={[styles.notifBody, { color: colors.textSecondary }]}>{n.body}</Text>
              <Text style={[styles.notifTime, { color: colors.textSecondary }]}>{n.time}</Text>
            </View>
            <TouchableOpacity onPress={() => setNotifs(notifs.filter(x => x.id !== n.id))}><Trash2 size={16} color={colors.textSecondary} /></TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, paddingTop: 56 },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, gap: 12 },
  backBtn:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title:      { fontSize: 20, fontWeight: '700', flex: 1 },
  content:    { padding: 20, gap: 10, paddingBottom: 40 },
  empty:      { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:  { fontSize: 16 },
  card:       { borderRadius: 14, padding: 14, flexDirection: 'row', gap: 12, borderWidth: 1, borderLeftWidth: 3 },
  icon:       { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body:       { flex: 1, gap: 3 },
  notifTitle: { fontSize: 14, fontWeight: '700' },
  notifBody:  { fontSize: 12 },
  notifTime:  { fontSize: 11 },
});
