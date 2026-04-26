import { Stack } from 'expo-router';
import { RoleGuard } from '@/auth/RoleGuard';

export default function ClientLayout() {
  return (
    <RoleGuard role="client">
      <Stack screenOptions={{ headerShown: true, headerTitle: 'Dina Limpieza' }}>
        <Stack.Screen name="index" options={{ title: 'Mis edificios' }} />
        <Stack.Screen name="scan" options={{ title: 'Escanear QR' }} />
        <Stack.Screen name="room/[id]" options={{ title: 'Historial de habitación' }} />
      </Stack>
    </RoleGuard>
  );
}
