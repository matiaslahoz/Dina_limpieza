import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { createFloor, createRoom, fetchBuildingTree } from '@/lib/admin';
import { theme } from '@/theme';
import type { Building, Floor, Room, RoomKind } from '@/types';

const ROOM_KINDS: { value: RoomKind; label: string }[] = [
  { value: 'bathroom', label: 'Baño' },
  { value: 'kitchen', label: 'Cocina' },
  { value: 'dining', label: 'Comedor' },
  { value: 'living', label: 'Sala' },
  { value: 'bedroom', label: 'Dormitorio' },
  { value: 'office', label: 'Oficina' },
  { value: 'hall', label: 'Hall' },
  { value: 'other', label: 'Otro' },
];

export default function BuildingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [building, setBuilding] = useState<Building | null>(null);
  const [floors, setFloors] = useState<(Floor & { rooms: Room[] })[]>([]);
  const [loading, setLoading] = useState(true);

  // floor form
  const [floorName, setFloorName] = useState('');
  const [floorOrd, setFloorOrd] = useState('');

  // room form
  const [activeFloor, setActiveFloor] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomKind, setRoomKind] = useState<RoomKind>('other');

  const reload = useCallback(async () => {
    if (!id) return;
    const t = await fetchBuildingTree(id);
    setBuilding(t.building);
    setFloors(t.floors);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const addFloor = async () => {
    const ordinal = parseInt(floorOrd, 10);
    if (!floorName.trim() || Number.isNaN(ordinal)) {
      Alert.alert('Faltan datos', 'Nombre y orden numérico son obligatorios.');
      return;
    }
    if (!id) return;
    try {
      await createFloor({ building_id: id, name: floorName.trim(), ordinal });
      setFloorName('');
      setFloorOrd('');
      reload();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No pudimos crear el piso');
    }
  };

  const addRoom = async () => {
    if (!activeFloor || !roomName.trim()) {
      Alert.alert('Faltan datos', 'Elegí un piso y poné un nombre.');
      return;
    }
    try {
      await createRoom({ floor_id: activeFloor, name: roomName.trim(), kind: roomKind });
      setRoomName('');
      setRoomKind('other');
      reload();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No pudimos crear la habitación');
    }
  };

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>{building?.name ?? 'Edificio'}</Text>
      {building?.address ? <Text style={styles.muted}>{building.address}</Text> : null}

      <Button
        title="Editar edificio (geofence / notificaciones)"
        variant="secondary"
        onPress={() =>
          id && router.push({ pathname: '/(admin)/buildings/edit/[id]', params: { id } })
        }
      />

      <Text style={styles.section}>Pisos</Text>
      <View style={styles.formRow}>
        <TextInput
          placeholder="Nombre (ej. PB, 1, 2)"
          value={floorName}
          onChangeText={setFloorName}
          style={[styles.input, { flex: 2 }]}
        />
        <TextInput
          placeholder="Orden"
          value={floorOrd}
          onChangeText={setFloorOrd}
          keyboardType="number-pad"
          style={[styles.input, { flex: 1 }]}
        />
        <Button title="Agregar" onPress={addFloor} />
      </View>

      {floors.map((f) => (
        <View key={f.id} style={styles.card}>
          <Text style={styles.cardTitle}>Piso {f.name}</Text>
          {f.rooms.length === 0 ? (
            <Text style={styles.muted}>Sin habitaciones</Text>
          ) : (
            f.rooms.map((r) => (
              <Pressable
                key={r.id}
                onPress={() =>
                  router.push({ pathname: '/(admin)/rooms/[id]', params: { id: r.id } })
                }
                style={({ pressed }) => [styles.room, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={styles.roomName}>{r.name}</Text>
                <Text style={styles.muted}>
                  {ROOM_KINDS.find((k) => k.value === r.kind)?.label ?? r.kind}
                  {!r.active ? ' · inactiva' : ''}
                </Text>
              </Pressable>
            ))
          )}

          <View style={styles.divider} />
          <Text style={styles.muted}>Agregar habitación a este piso</Text>
          <Pressable onPress={() => setActiveFloor(activeFloor === f.id ? null : f.id)}>
            <Text style={styles.toggle}>
              {activeFloor === f.id ? 'Cerrar' : 'Abrir formulario'}
            </Text>
          </Pressable>
          {activeFloor === f.id ? (
            <View style={{ gap: 8 }}>
              <TextInput
                placeholder="Nombre (ej. Baño 101)"
                value={roomName}
                onChangeText={setRoomName}
                style={styles.input}
              />
              <View style={styles.chips}>
                {ROOM_KINDS.map((k) => (
                  <Pressable
                    key={k.value}
                    onPress={() => setRoomKind(k.value)}
                    style={[styles.chip, roomKind === k.value && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipText, roomKind === k.value && styles.chipTextActive]}
                    >
                      {k.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Button title="Crear habitación" onPress={addRoom} />
            </View>
          ) : null}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  muted: { color: theme.colors.textMuted },
  section: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginTop: 8 },
  formRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 12,
    backgroundColor: '#fff',
  },
  card: {
    padding: 12,
    borderRadius: theme.radius,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  room: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.bg,
  },
  roomName: { fontWeight: '600', color: theme.colors.text },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  toggle: { color: theme.colors.primary, fontWeight: '600' },
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
});
