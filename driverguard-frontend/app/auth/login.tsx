import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Animated, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Zap } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLang } from '../../src/contexts/LangContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors } = useTheme();
  const { t, isRTL } = useLang();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus]   = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { Alert.alert('Error', 'Please fill in all fields.'); return; }
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.success) router.replace('/(app)/home');
    else Alert.alert('Login Failed', result.error || 'Invalid credentials.');
  };

  const s = styles(colors, isRTL);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Animated.View style={[s.logoArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={s.logoBadge}><Zap size={28} color={colors.accent} fill={colors.accent} /></View>
        <Text style={s.brand}>DRIVERGUARD</Text>
        <Text style={s.tagline}>AI Driving & Coaching Platform</Text>
      </Animated.View>

      <Animated.View style={[s.form, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={s.title}>{t('welcome')}</Text>

        <View style={[s.inputBox, emailFocus && s.inputBoxFocused]}>
          <Text style={s.inputLabel}>{t('email')}</Text>
          <TextInput style={s.input} placeholder="driver@example.com" placeholderTextColor={colors.textSecondary}
            value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
            onFocus={() => setEmailFocus(true)} onBlur={() => setEmailFocus(false)} />
        </View>

        <View style={[s.inputBox, passFocus && s.inputBoxFocused]}>
          <Text style={s.inputLabel}>{t('password')}</Text>
          <View style={s.row}>
            <TextInput style={[s.input, { flex: 1 }]} placeholder="••••••••" placeholderTextColor={colors.textSecondary}
              value={password} onChangeText={setPassword} secureTextEntry={!showPass}
              onFocus={() => setPassFocus(true)} onBlur={() => setPassFocus(false)} />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={s.forgotBtn}><Text style={s.forgotText}>{t('forgotPassword')}</Text></TouchableOpacity>

        <TouchableOpacity style={[s.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={s.primaryBtnText}>{t('signIn')}</Text>}
        </TouchableOpacity>

        <View style={s.switchRow}>
          <Text style={s.switchText}>{t('noAccount')} </Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}><Text style={s.switchLink}>{t('register')}</Text></TouchableOpacity>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = (c: any, rtl: boolean) => StyleSheet.create({
  container:        { flex: 1, backgroundColor: c.background },
  content:          { padding: 24, paddingTop: 70, paddingBottom: 40 },
  logoArea:         { alignItems: 'center', marginBottom: 40 },
  logoBadge:        { width: 64, height: 64, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.accent + '33', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  brand:            { fontSize: 22, fontWeight: '800', color: c.text, letterSpacing: 6 },
  tagline:          { fontSize: 11, color: c.textSecondary, letterSpacing: 2, marginTop: 4 },
  form:             { gap: 14 },
  title:            { fontSize: 26, fontWeight: '700', color: c.text, textAlign: rtl ? 'right' : 'left' },
  inputBox:         { backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 14 },
  inputBoxFocused:  { borderColor: c.accent },
  inputLabel:       { fontSize: 10, color: c.accent, fontWeight: '700', letterSpacing: 2, marginBottom: 6, textAlign: rtl ? 'right' : 'left' },
  input:            { fontSize: 16, color: c.text, padding: 0, textAlign: rtl ? 'right' : 'left' },
  row:              { flexDirection: 'row', alignItems: 'center' },
  forgotBtn:        { alignSelf: rtl ? 'flex-start' : 'flex-end' },
  forgotText:       { color: c.accent, fontSize: 13 },
  primaryBtn:       { backgroundColor: c.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  primaryBtnText:   { color: '#000', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  switchRow:        { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  switchText:       { color: c.textSecondary, fontSize: 14 },
  switchLink:       { color: c.accent, fontSize: 14, fontWeight: '700' },
});
