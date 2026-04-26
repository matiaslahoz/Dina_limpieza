import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { fetchBuildingTree, updateBuilding } from '@/lib/admin';
import { theme } from '@/theme';
import type { Building } from '@/types';

const num = (s: string) => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isNaN(n) ? null : n;
};
const int = (s: string) => {
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
};

interface BuildingFull extends Building {
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number | null;
  stale_threshold_hours: number | null;
}

export default function BuildingEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [b, setB] = useState<BuildingFull | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('');
  const [stale, setStale] = useState('');
  const [geofenceOn, setGeofenceOn] = useState(false);
  const [staleOn, setStaleOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchBuildingTree(id).then(({ building }) => {
      const full = building as BuildingFull | null;
      if (!full) return;
      setB(full);
      setName(full.name);
      setAddress(full.address ?? '');
      setLat(full.latitude?.toString() ?? '');
      setLng(full.longitude?.toString() ?? '');
      setRadius(full.geofence_radius_m?.toString() ?? '');
      setStale(full.stale_threshold_hours?.toString() ?? '');
      setGeofenceOn(!!full.geofence_radius_m);
      setStaleOn(full.stale_threshold_hours != null);
    });
  }, [id]);

  const useCurrent = async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLat(pos.coords.latitude.toString());
    setLng(pos.coords.longitude.toString());
  };

  const save = async () => {
    if (!id) return;
    if (!name.trim()) {
      Alert.alert('Faltan datos', 'El nombre es obligatorio.');
      return;
    }
    setBusy(true);
    try {
      await updateBuilding(id, {
        name: name.trim(),
        address: address.trim() || null,
        latitude: geofenceOn ? num(lat) : null,
        longitude: geofenceOn ? num(lng) : null,
        geofence_radius_m: geofenceOn ? int(radius) : null,
        stale_threshold_hours: staleOn ? int(stale) : null,
      });
      router.back();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  if (!b) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.section}>Datos básicos</Text>
      <Text style={styles.label}>Nombre</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      <Text style={styles.label}>Dirección</Text>
      <TextInput value={address} onChangeText={setAddress} style={styles.input} />

      <View style={styles.toggleRow}>
        <Text style={styles.section}>Geofence</Text>
        <Switch value={geofenceOn} onValueChange={setGeofenceOn} />
      </View>
      <Text style={styles.muted}>
        Si está activo, el cleaner debe estar dentro del radio para hacer check-in.
      </Text>
      {geofenceOn ? (
        <>
          <View style={styles.coordsRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Latitud</Text>
              <TextInput value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Longitud</Text>
              <TextInput value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" style={styles.input} />
            </View>
          </View>
          <Button title="Usar mi ubicación actual" variant="secondary" onPress={useCurrent} />
          <Text style={styles.label}>Radio (metros)</Text>
          <TextInput value={radius} onChangeText={setRadius} keyboardType="number-pad" style={styles.input} />
        </>
      ) : null}

      <View style={styles.toggleRow}>
        <Text style={styles.section}>Notificaciones de habitación sin limpiar</Text>
        <Switch value={staleOn} onValueChange={setStaleOn} />
      </View>
      <Text style={styles.muted}>
        Si está activo, los admins reciben push cuando una habitación de este edificio
        lleva más horas sin limpieza que el límite indicado.
      </Text>
      {staleOn ? (
        <>
          <Text style={styles.label}>Umbral (horas)</Text>
          <TextInput value={stale} onChangeText={setStale} keyboardType="number-pad" style={styles.input} />
        </>
      ) : null}

      <Button title="Guardar" onPress={save} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginTop: 8 },
  label: { color: theme.colors.text, fontWeight: '600', marginTop: 4 },
  muted: { color: theme.colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 12,
    backgroundColor: '#fff',
  },
  coordsRow: { flexDirection: 'row', gap: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
