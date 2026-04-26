import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import type { UserRole } from '@/types';
import { useAuth } from './AuthProvider';

export const RoleGuard = ({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) => {
  const { loading, signedIn, role: currentRole } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!signedIn) return <Redirect href="/login" />;
  if (currentRole !== role) return <Redirect href="/" />;
  return <>{children}</>;
};
