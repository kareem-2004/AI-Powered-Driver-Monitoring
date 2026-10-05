import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Eye, EyeOff, Zap } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLang } from '../../src/contexts/LangContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { colors } = useTheme();
  const { t, isRTL } = useLang();

  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) { Alert.alert('Error', 'Please fill in all fields.'); return; }
    if (password !== confirm) { Alert.alert('Error', 'Passwords do not match.'); return; }
    if (password.length < 6)  { Alert.alert('Error', 'Password must be at least 6 characters.'); return; }
    setLoading(true);
    const result = await register(name.trim(), email.trim(), password);
    setLoading(false);
    if (result.success) router.replace('/(app)/home');
    else Alert.alert('Registration Failed', result.error || 'Please try again.');
  };

  const s = styles(colors, isRTL);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <ChevronLeft size={24} color={colors.text} />
      </TouchableOpacity>

      <View style={s.logoRow}>
        <View style={s.logoBadge}><Zap size={20} color={colors.accent} fill={colors.accent} /></View>
        <Text style={s.brand}>DRIVERGUARD</Text>
      </View>

      <Text style={s.title}>{t('signUp')}</Text>
      <Text style={s.subtitle}>Join the smarter way to drive</Text>

      <View style={s.form}>
        {[
          { label: t('name'),     value: name,     setter: setName,     secure: false, keyboard: 'default' as any },
          { label: t('email'),    value: email,    setter: setEmail,    secure: false, keyboard: 'email-address' as any },
        ].map(f => (
          <View key={f.label} style={s.inputBox}>
            <Text style={s.inputLabel}>{f.label}</Text>
            <TextInput style={s.input} value={f.value} onChangeText={f.setter}
              keyboardType={f.keyboard} autoCapitalize="none"
              placeholderTextColor={colors.textSecondary} />
          </View>
        ))}

        <View style={s.inputBox}>
          <Text style={s.inputLabel}>{t('password')}</Text>
          <View style={s.row}>
            <TextInput style={[s.input, { flex: 1 }]} value={password} onChangeText={setPassword}
              secureTextEntry={!showPass} placeholderTextColor={colors.textSecondary} />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.inputBox}>
          <Text style={s.inputLabel}>{t('confirmPass')}</Text>
          <TextInput style={s.input} value={confirm} onChangeText={setConfirm}
            secureTextEntry={!showPass} placeholderTextColor={colors.textSecondary} />
        </View>

        <TouchableOpacity style={[s.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={s.primaryBtnText}>{t('signUp')}</Text>}
        </TouchableOpacity>

        <View style={s.switchRow}>
          <Text style={s.switchText}>{t('hasAccount')} </Text>
          <TouchableOpacity onPress={() => router.replace('/auth/login')}><Text style={s.switchLink}>{t('login')}</Text></TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = (c: any, rtl: boolean) => StyleSheet.create({
  container:      { flex: 1, backgroundColor: c.background },
  content:        { padding: 24, paddingTop: 56, paddingBottom: 40 },
  backBtn:        { marginBottom: 20 },
  logoRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoBadge:      { width: 40, height: 40, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.accent + '33', alignItems: 'center', justifyContent: 'center' },
  brand:          { fontSize: 16, fontWeight: '800', color: c.text, letterSpacing: 4 },
  title:          { fontSize: 26, fontWeight: '700', color: c.text },
  subtitle:       { fontSize: 14, color: c.textSecondary, marginBottom: 24, marginTop: 4 },
  form:           { gap: 14 },
  inputBox:       { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 14 },
  inputLabel:     { fontSize: 10, color: c.accent, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  input:          { fontSize: 16, color: c.text, padding: 0 },
  row:            { flexDirection: 'row', alignItems: 'center' },
  primaryBtn:     { backgroundColor: c.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#000', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  switchRow:      { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  switchText:     { color: c.textSecondary, fontSize: 14 },
  switchLink:     { color: c.accent, fontSize: 14, fontWeight: '700' },
});
