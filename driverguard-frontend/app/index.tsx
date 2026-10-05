import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';

export default function Index() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading) {
      if (user) router.replace('/(app)/home');
      else router.replace('/auth/login');
    }
  }, [user, isLoading]);
  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#00FF88" size="large" />
    </View>
  );
}
