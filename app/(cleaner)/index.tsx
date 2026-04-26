import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { fetchMyRecentSessions, getOpenSession } from '@/lib/sessions';
import { theme } from '@/theme';
import type { CleaningHistoryRow, CleaningSession } from '@/types';

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export default function CleanerHome() {
  const { name, signOut } = useAuth();
  const [open, setOpen] = useState<CleaningSession | null>(null);
  const [history, setHistory] = useState<CleaningHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [openSession, recent] = await Promise.all([
      getOpenSession().catch(() => null),
      fetchMyRecentSessions().catch(() => []),
    ]);
    setOpen(openSession);
    setHistory(recent);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Text style={styles.hi}>Hola{name ? `, ${name.split(' ')[0]}` : ''} 👋</Text>
        <Text style={styles.muted}>Escaneá el QR de la habitación al entrar y al salir.</Text>
      </View>

      {open ? (
        <View style={[styles.card, styles.openCard]}>
          <Text style={styles.cardTitle}>En curso</Text>
          <Text style={styles.cardBody}>Iniciaste a las {fmt(open.check_in_at)}</Text>
          <Link href="/(cleaner)/scan" asChild>
            <Button title="Escanear QR para terminar" />
          </Link>
        </View>
      ) : (
        <Link href="/(cleaner)/scan" asChild>
          <Button title="Escanear QR para empezar" />
        </Link>
      )}

      <Text style={styles.section}>Mis últimas limpiezas</Text>
      <FlatList
        data={history}
        keyExtractor={(it) => it.session_id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<Text style={styles.muted}>Todavía no registraste limpiezas.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>
              {item.building_name} · Piso {item.floor_name} · {item.room_name}
            </Text>
            <Text style={styles.muted}>
              {fmt(item.check_in_at)} → {fmt(item.check_out_at)}
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <Button title="Cerrar sesión" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  hi: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  muted: { color: theme.colors.textMuted },
  section: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginTop: 4 },
  card: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  openCard: { borderColor: theme.colors.accent },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.accent },
  cardBody: { fontSize: 15, color: theme.colors.text },
  row: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowTitle: { fontWeight: '600', color: theme.colors.text },
});
