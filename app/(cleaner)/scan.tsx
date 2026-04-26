import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { QRScanner } from '@/components/QRScanner';
import { Screen } from '@/components/Screen';
import { checkIn, checkOut, fetchRoomByQr, getOpenSession } from '@/lib/sessions';
import { theme } from '@/theme';
import type { CleaningSession } from '@/types';

type Mode = 'in' | 'out';

interface BuildingCtx {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number | null;
}

interface RoomCtx {
  id: string;
  name: string;
  floor: { name: string; ordinal: number; building: BuildingCtx } | null;
}

const requireGeofence = (b?: BuildingCtx | null) =>
  !!(b && b.geofence_radius_m && b.geofence_radius_m > 0 && b.latitude != null && b.longitude != null);

export default function ScanScreen() {
  const router = useRouter();
  const [open, setOpen] = useState<CleaningSession | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>('in');
  const [room, setRoom] = useState<RoomCtx | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getOpenSession()
      .then((s) => {
        setOpen(s);
        setMode(s ? 'out' : 'in');
      })
      .catch(() => setOpen(null));
  }, []);

  const handleScan = async (qrToken: string) => {
    if (busy || token === qrToken) return;
    setBusy(true);
    try {
      const r = await fetchRoomByQr(qrToken);
      if (!r) {
        Alert.alert('QR no reconocido', 'Este código no corresponde a una habitación registrada.');
        return;
      }
      setToken(qrToken);
      setRoom(r as unknown as RoomCtx);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No pudimos leer el QR');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!token) return;
    setBusy(true);
    try {
      if (mode === 'in') {
        let coords: { lat: number; lng: number } | undefined;
        if (requireGeofence(room?.floor?.building)) {
          const perm = await Location.requestForegroundPermissionsAsync();
          if (!perm.granted) {
            Alert.alert(
              'Ubicación necesaria',
              'Este edificio requiere validar tu ubicación al hacer check-in.',
            );
            return;
          }
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
        await checkIn(token, coords);
        Alert.alert('Listo', 'Check-in registrado.');
      } else {
        await checkOut(token, notes || undefined);
        Alert.alert('Listo', 'Check-out registrado. ¡Buen trabajo!');
      }
      router.replace('/(cleaner)');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No pudimos registrar la sesión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll={false}>
      <Text style={styles.heading}>
        {mode === 'in' ? 'Escaneá el QR para empezar' : 'Escaneá el QR para terminar'}
      </Text>

      <View style={styles.scanner}>
        <QRScanner onScan={handleScan} hint={token ? 'QR detectado' : 'Apuntá al QR de la habitación'} />
      </View>

      {room ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {room.floor?.building.name ?? '—'} · Piso {room.floor?.name ?? '—'}
          </Text>
          <Text style={styles.cardBody}>{room.name}</Text>

          {mode === 'out' ? (
            <TextInput
              placeholder="Notas (opcional)"
              value={notes}
              onChangeText={setNotes}
              style={styles.input}
              multiline
            />
          ) : null}

          <Button
            title={mode === 'in' ? 'Confirmar check-in' : 'Confirmar check-out'}
            onPress={confirm}
            loading={busy}
          />
          <Button
            title="Reescanear"
            variant="secondary"
            onPress={() => {
              setRoom(null);
              setToken(null);
              setNotes('');
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  scanner: { flex: 1, minHeight: 280, borderRadius: theme.radius, overflow: 'hidden' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: { color: theme.colors.textMuted },
  cardBody: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 12,
    minHeight: 60,
    backgroundColor: '#fff',
  },
});
