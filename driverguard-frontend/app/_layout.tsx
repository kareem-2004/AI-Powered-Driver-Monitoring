import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { LangProvider } from '../src/contexts/LangContext';
import { SessionProvider } from '../src/contexts/SessionContext';
import { requestNotificationPermission } from '../src/services/alertService';

// Required by Expo Router
export { ErrorBoundary } from 'expo-router';
export const unstable_settings = { initialRouteName: 'index' };

function RootLayoutNav() {
  const { isLoading } = useAuth();
  useEffect(() => { requestNotificationPermission(); }, []);
  if (isLoading) return null;
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/register" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LangProvider>
          <SessionProvider>
            <RootLayoutNav />
            <StatusBar style="light" />
          </SessionProvider>
        </LangProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
