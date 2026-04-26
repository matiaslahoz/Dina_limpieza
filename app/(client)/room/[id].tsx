import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { fetchRoomHistory } from '@/lib/buildings';
import { theme } from '@/theme';
import type { CleaningHistoryRow } from '@/types';

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 'En curso';

const duration = (a: string, b: string | null) => {
  if (!b) return '—';
  const mins = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}min`;
};

export default function RoomHistory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rows, setRows] = useState<CleaningHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchRoomHistory(id)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  const head = rows[0];

  return (
    <Screen scroll={false}>
      {head ? (
        <View style={styles.head}>
          <Text style={styles.title}>{head.room_name}</Text>
          <Text style={styles.muted}>
            {head.building_name} · Piso {head.floor_name}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.session_id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <Text style={styles.muted}>Esta habitación todavía no fue limpiada.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.who}>{item.cleaner_name ?? item.cleaner_email ?? 'Empleado'}</Text>
            <Text style={styles.muted}>
              Entrada: {fmt(item.check_in_at)} · Salida: {fmt(item.check_out_at)}
            </Text>
            <Text style={styles.muted}>Duración: {duration(item.check_in_at, item.check_out_at)}</Text>
            {item.notes ? <Text style={styles.notes}>“{item.notes}”</Text> : null}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: 4 },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  muted: { color: theme.colors.textMuted },
  row: {
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  who: { fontWeight: '700', color: theme.colors.text },
  notes: { fontStyle: 'italic', color: theme.colors.text },
});
