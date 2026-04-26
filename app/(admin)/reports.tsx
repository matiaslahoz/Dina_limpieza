import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { fetchRecentSessions } from '@/lib/admin';
import { theme } from '@/theme';
import type { CleaningHistoryRow } from '@/types';

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 'En curso';

export default function Reports() {
  const [rows, setRows] = useState<CleaningHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchRecentSessions()
        .then(setRows)
        .finally(() => setLoading(false));
    }, []),
  );

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Últimas limpiezas</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.session_id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={<Text style={styles.muted}>No hay sesiones registradas todavía.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.where}>
              {item.building_name} · Piso {item.floor_name} · {item.room_name}
            </Text>
            <Text style={styles.who}>{item.cleaner_name ?? item.cleaner_email ?? 'Empleado'}</Text>
            <Text style={styles.muted}>
              {fmt(item.check_in_at)} → {fmt(item.check_out_at)}
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  muted: { color: theme.colors.textMuted },
  row: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  where: { fontWeight: '600', color: theme.colors.text },
  who: { color: theme.colors.primary },
});
