import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSession } from '../../src/contexts/SessionContext';
import { useAuth } from '../../src/contexts/AuthContext';
import BackgroundCamera from '../../src/components/BackgroundCamera';
import AlertOverlay from '../../src/components/AlertOverlay';

const ALERT_STATES = ['Distracted', 'DangerousDriving', 'SleepyDriving', 'aggressive'];

function SessionMonitor() {
  const { sessionId, sessionState } = useSession();
  const { user } = useAuth();
  const [driverState, setDriverState]   = useState('SafeDriving');
  const [confidence, setConfidence]     = useState(0);
  const [showAlert, setShowAlert]       = useState(false);

  if (sessionState !== 'active' || !sessionId || !user?.token) return null;

  const handleResult = (state: string, conf: number) => {
    setDriverState(state);
    setConfidence(conf);
    if (ALERT_STATES.includes(state)) {
      setShowAlert(true);
      // Auto-hide after 3.5s
      setTimeout(() => setShowAlert(false), 3500);
    }
  };

  return (
    <>
      <BackgroundCamera
        sessionId={sessionId}
        token={user.token}
        onResult={handleResult}
      />
      <AlertOverlay
        driverState={driverState}
        confidence={confidence}
        visible={showAlert}
      />
    </>
  );
}

export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <SessionMonitor />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="home" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="hud" />
        <Stack.Screen name="livedata" />
        <Stack.Screen name="sessions" />
        <Stack.Screen name="report" />
        <Stack.Screen name="history" />
        <Stack.Screen name="bluetooth" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="notifications" />
      </Stack>
    </View>
  );
}
