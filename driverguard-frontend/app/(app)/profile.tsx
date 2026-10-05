import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, User, Mail, LogOut, Zap } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const handleLogout = () => { setShowModal(false); logout(); router.replace('/auth/login'); };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent + '18', borderColor: colors.accent + '44' }]}>
            <Text style={[styles.avatarText, { color: colors.accent }]}>{(user?.name || 'D').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.name}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          <View style={[styles.badge, { backgroundColor: colors.accent + '18', borderColor: colors.accent + '33' }]}>
            <Zap size={12} color={colors.accent} />
            <Text style={[styles.badgeText, { color: colors.accent }]}>Active Driver</Text>
          </View>
        </View>

        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.menuItem, { borderBottomWidth: 1, borderColor: colors.border }]}>
            <View style={[styles.menuIcon, { backgroundColor: colors.accent + '18' }]}><User size={16} color={colors.accent} /></View>
            <View style={styles.menuText}>
              <Text style={[styles.menuLabel, { color: colors.textSecondary }]}>Name</Text>
              <Text style={[styles.menuValue, { color: colors.text }]}>{user?.name}</Text>
            </View>
          </View>
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: colors.info + '18' }]}><Mail size={16} color={colors.info} /></View>
            <View style={styles.menuText}>
              <Text style={[styles.menuLabel, { color: colors.textSecondary }]}>Email</Text>
              <Text style={[styles.menuValue, { color: colors.text }]}>{user?.email}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.danger + '44' }]} onPress={() => setShowModal(true)}>
          <LogOut size={18} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LogOut size={28} color={colors.danger} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Sign Out</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Are you sure you want to sign out?</Text>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.danger }]} onPress={handleLogout}>
              <Text style={styles.modalBtnText}>Yes, Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: colors.border }]} onPress={() => setShowModal(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, paddingTop: 56 },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, gap: 12 },
  backBtn:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title:        { fontSize: 20, fontWeight: '700' },
  content:      { padding: 20, gap: 16, paddingBottom: 40 },
  avatarCard:   { borderRadius: 20, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1 },
  avatar:       { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginBottom: 4 },
  avatarText:   { fontSize: 32, fontWeight: '800' },
  userName:     { fontSize: 22, fontWeight: '700' },
  userEmail:    { fontSize: 13 },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  badgeText:    { fontSize: 12, fontWeight: '600' },
  menuCard:     { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  menuItem:     { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuIcon:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuText:     { flex: 1 },
  menuLabel:    { fontSize: 11, fontWeight: '600' },
  menuValue:    { fontSize: 15, marginTop: 2 },
  logoutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 16, borderWidth: 1 },
  logoutText:   { fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' },
  modalContent: { width: '80%', borderRadius: 24, padding: 28, alignItems: 'center', gap: 12, borderWidth: 1 },
  modalTitle:   { fontSize: 20, fontWeight: '700' },
  modalSub:     { fontSize: 14, textAlign: 'center' },
  modalBtn:     { borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  modalCancelBtn:   { borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center' },
  modalCancelText:  { fontWeight: '600', fontSize: 15 },
});
