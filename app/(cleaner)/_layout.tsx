import { Stack } from 'expo-router';
import { RoleGuard } from '@/auth/RoleGuard';

export default function CleanerLayout() {
  return (
    <RoleGuard role="cleaner">
      <Stack screenOptions={{ headerShown: true, headerTitle: 'Dina Limpieza' }}>
        <Stack.Screen name="index" options={{ title: 'Mi turno' }} />
        <Stack.Screen name="scan" options={{ title: 'Escanear QR' }} />
      </Stack>
    </RoleGuard>
  );
}
