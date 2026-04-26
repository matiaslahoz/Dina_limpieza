import { Stack } from 'expo-router';
import { RoleGuard } from '@/auth/RoleGuard';

export default function AdminLayout() {
  return (
    <RoleGuard role="admin">
      <Stack screenOptions={{ headerShown: true, headerTitle: 'Dina · Admin' }}>
        <Stack.Screen name="index" options={{ title: 'Panel' }} />
        <Stack.Screen name="buildings/index" options={{ title: 'Edificios' }} />
        <Stack.Screen name="buildings/new" options={{ title: 'Nuevo edificio' }} />
        <Stack.Screen name="buildings/[id]" options={{ title: 'Detalle' }} />
        <Stack.Screen name="rooms/[id]" options={{ title: 'Habitación' }} />
        <Stack.Screen name="reports" options={{ title: 'Reportes' }} />
      </Stack>
    </RoleGuard>
  );
}
