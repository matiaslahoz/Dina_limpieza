import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import {
  fetchFloorsForBuilding,
  fetchSessionsReport,
  listAllBuildings,
  type ReportFilters,
} from '@/lib/admin';
import { shareCsv, toCsv } from '@/lib/csv';
import { theme } from '@/theme';
import type { CleaningHistoryRow } from '@/types';

interface BuildingOpt {
  id: string;
  name: string;
}

interface FloorOpt {
  id: string;
  name: string;
  ordinal: number;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 'En curso';

const isoOrNull = (s: string): string | null => {
  if (!s) return null;
  // Acepta YYYY-MM-DD; convierte a inicio del día local en UTC.
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export default function Reports() {
  const [buildings, setBuildings] = useState<BuildingOpt[]>([]);
  const [floors, setFloors] = useState<FloorOpt[]>([]);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [floorId, setFloorId] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<CleaningHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const filters: ReportFilters = useMemo(
    () => ({
      buildingId,
      floorId,
      from: isoOrNull(from),
      to: isoOrNull(to ? `${to}T23:59:59` : ''),
    }),
    [buildingId, floorId, from, to],
  );

  const load = useCallback(() => {
    setLoading(true);
    fetchSessionsReport(filters)
      .then(setRows)
      .catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    listAllBuildings().then((d) => setBuildings(d as BuildingOpt[]));
  }, []);

  useEffect(() => {
    if (!buildingId) {
      setFloors([]);
      setFloorId(null);
      return;
    }
    fetchFloorsForBuilding(buildingId).then((d) => setFloors(d as FloorOpt[]));
    setFloorId(null);
  }, [buildingId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const data = await fetchSessionsReport({ ...filters, limit: 10_000 });
      const csv = toCsv(
        data.map((r) => ({
          edificio: r.building_name,
          piso: r.floor_name,
          habitacion: r.room_name,
          tipo: r.room_kind,
          empleado: r.cleaner_name ?? r.cleaner_email ?? '',
          check_in: r.check_in_at,
          check_out: r.check_out_at ?? '',
          notas: r.notes ?? '',
        })),
        ['edificio', 'piso', 'habitacion', 'tipo', 'empleado', 'check_in', 'check_out', 'notas'],
      );
      await shareCsv(`limpieza-${Date.now()}.csv`, csv);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={{ gap: 8 }}>
        <Text style={styles.label}>Edificio</Text>
        <View style={styles.chips}>
          <Chip active={!buildingId} label="Todos" onPress={() => setBuildingId(null)} />
          {buildings.map((b) => (
            <Chip
              key={b.id}
              active={buildingId === b.id}
              label={b.name}
              onPress={() => setBuildingId(b.id)}
            />
          ))}
        </View>

        {floors.length > 0 ? (
          <>
            <Text style={styles.label}>Piso</Text>
            <View style={styles.chips}>
              <Chip active={!floorId} label="Todos" onPress={() => setFloorId(null)} />
              {floors.map((f) => (
                <Chip
                  key={f.id}
                  active={floorId === f.id}
                  label={`Piso ${f.name}`}
                  onPress={() => setFloorId(f.id)}
                />
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Desde (YYYY-MM-DD)</Text>
            <TextInput
              placeholder="2026-04-01"
              value={from}
              onChangeText={setFrom}
              style={styles.input}
              autoCapitalize="none"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Hasta (YYYY-MM-DD)</Text>
            <TextInput
              placeholder="2026-04-30"
              value={to}
              onChangeText={setTo}
              style={styles.input}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <Button title="Aplicar filtros" onPress={load} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Exportar CSV"
              variant="secondary"
              onPress={exportCsv}
              loading={exporting}
            />
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.session_id}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={<Text style={styles.muted}>Sin resultados.</Text>}
          ListHeaderComponent={
            <Text style={styles.count}>{rows.length} sesiones</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.where}>
                {item.building_name} · Piso {item.floor_name} · {item.room_name}
              </Text>
              <Text style={styles.who}>{item.cleaner_name ?? item.cleaner_email ?? 'Empleado'}</Text>
              <Text style={styles.muted}>
                {fmt(item.check_in_at)} → {fmt(item.check_out_at)}
              </Text>
              {item.notes ? <Text style={styles.notes}>“{item.notes}”</Text> : null}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </Screen>
  );
}

const Chip = ({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  label: { color: theme.colors.text, fontWeight: '600' },
  muted: { color: theme.colors.textMuted },
  count: { color: theme.colors.textMuted, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 10,
    backgroundColor: '#fff',
    marginTop: 4,
  },
  dateRow: { flexDirection: 'row', gap: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.text, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
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
  notes: { fontStyle: 'italic', color: theme.colors.text },
});
