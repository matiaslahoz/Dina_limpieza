import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';

export default function Index() {
  const { loading, signedIn, role } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!signedIn) return <Redirect href="/login" />;
  if (role === 'admin') return <Redirect href="/(admin)" />;
  if (role === 'cleaner') return <Redirect href="/(cleaner)" />;
  if (role === 'client') return <Redirect href="/(client)" />;
  return <Redirect href="/no-role" />;
}
