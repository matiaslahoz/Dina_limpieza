import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { theme } from '@/theme';

export default function AdminHome() {
  const { name, signOut } = useAuth();
  return (
    <Screen>
      <Text style={styles.hi}>Hola{name ? `, ${name.split(' ')[0]}` : ''} 👋</Text>
      <Text style={styles.muted}>
        Administrá edificios, pisos, habitaciones y revisá la actividad del personal de limpieza.
      </Text>

      <View style={styles.grid}>
        <Link href="/(admin)/buildings" asChild>
          <Tile title="Edificios" subtitle="Crear edificios, pisos y habitaciones" />
        </Link>
        <Link href="/(admin)/reports" asChild>
          <Tile title="Reportes" subtitle="Últimas limpiezas registradas" />
        </Link>
      </View>

      <Button title="Cerrar sesión" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

import { forwardRef } from 'react';
import { Pressable, type PressableProps } from 'react-native';
const Tile = forwardRef<View, PressableProps & { title: string; subtitle: string }>(
  ({ title, subtitle, ...rest }, ref) => (
    <Pressable
      ref={ref as never}
      {...rest}
      style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSub}>{subtitle}</Text>
    </Pressable>
  ),
);
Tile.displayName = 'Tile';

const styles = StyleSheet.create({
  hi: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  muted: { color: theme.colors.textMuted },
  grid: { gap: 12 },
  tile: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  tileTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.primary },
  tileSub: { color: theme.colors.textMuted },
});
