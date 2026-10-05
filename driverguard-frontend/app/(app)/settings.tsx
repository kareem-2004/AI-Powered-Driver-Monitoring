import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Moon, Globe, User, Lock, Bell, Bluetooth } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLang } from '../../src/contexts/LangContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, lang, setLang }            = useLang();

  const items = [
    { icon: User,      label: t('profile'),   route: '/(app)/profile',       color: colors.info },
    { icon: Bell,      label: 'Notifications',route: '/(app)/notifications',  color: colors.accent },
    { icon: Bluetooth, label: t('bluetooth'), route: '/(app)/bluetooth',      color: '#00B4D8' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('settings')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Dark Mode */}
        <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.itemIcon, { backgroundColor: '#B388FF18' }]}><Moon size={18} color="#B388FF" /></View>
          <Text style={[styles.itemLabel, { color: colors.text }]}>{t('darkMode')}</Text>
          <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: colors.border, true: colors.accent + '88' }} thumbColor={isDark ? colors.accent : '#888'} />
        </View>

        {/* Language */}
        <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.itemIcon, { backgroundColor: '#FF880018' }]}><Globe size={18} color="#FF8800" /></View>
          <Text style={[styles.itemLabel, { color: colors.text }]}>{t('language')}</Text>
          <View style={styles.langToggle}>
            {(['en', 'ar'] as const).map(l => (
              <TouchableOpacity key={l} style={[styles.langBtn, { backgroundColor: lang === l ? colors.accent : colors.border }]} onPress={() => setLang(l)}>
                <Text style={[styles.langBtnText, { color: lang === l ? '#000' : colors.textSecondary }]}>{l.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('account')}</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {items.map((item, i) => (
            <TouchableOpacity key={item.label} style={[styles.menuItem, i < items.length - 1 && { borderBottomWidth: 1, borderColor: colors.border }]}
              onPress={() => router.push(item.route as any)}>
              <View style={[styles.itemIcon, { backgroundColor: item.color + '18' }]}><item.icon size={18} color={item.color} /></View>
              <Text style={[styles.itemLabel, { color: colors.text, flex: 1 }]}>{item.label}</Text>
              <ChevronRight size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, paddingTop: 56 },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, gap: 12 },
  backBtn:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title:       { fontSize: 20, fontWeight: '700' },
  content:     { padding: 20, gap: 14, paddingBottom: 40 },
  toggleRow:   { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  itemIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemLabel:   { fontSize: 15, fontWeight: '500' },
  langToggle:  { flexDirection: 'row', gap: 6 },
  langBtn:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  langBtnText: { fontSize: 12, fontWeight: '700' },
  sectionLabel:{ fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  menuCard:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  menuItem:    { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
});
