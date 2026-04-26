import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { fetchRoom, setRoomActive } from '@/lib/admin';
import { theme } from '@/theme';

interface RoomDetail {
  id: string;
  name: string;
  kind: string;
  qr_token: string;
  active: boolean;
  floor: { name: string; ordinal: number; building: { name: string } } | null;
}

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<{ toDataURL: (cb: (data: string) => void) => void } | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    fetchRoom(id)
      .then((r) => setRoom(r as RoomDetail))
      .finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const print = async () => {
    if (!qrRef.current || !room) return;
    qrRef.current.toDataURL(async (base64) => {
      const html = `
        <html><head><meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, sans-serif; text-align: center; padding: 40px; }
          h1 { font-size: 28px; margin: 0 0 8px; }
          h2 { font-size: 20px; color: #555; font-weight: 400; margin: 0 0 24px; }
          img { width: 360px; height: 360px; }
          p { color: #777; margin-top: 16px; font-size: 12px; word-break: break-all; }
        </style></head><body>
          <h1>${room.floor?.building.name ?? ''}</h1>
          <h2>Piso ${room.floor?.name ?? ''} · ${room.name}</h2>
          <img src="data:image/png;base64,${base64}" />
          <p>Dina Limpieza · ${room.qr_token}</p>
        </body></html>`;
      try {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
        }
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo generar el PDF');
      }
    });
  };

  const toggleActive = async () => {
    if (!room) return;
    try {
      await setRoomActive(room.id, !room.active);
      load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo actualizar');
    }
  };

  if (loading || !room) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>{room.name}</Text>
      <Text style={styles.muted}>
        {room.floor?.building.name ?? '—'} · Piso {room.floor?.name ?? '—'} · {room.kind}
      </Text>

      <View style={styles.qrBox}>
        <QRCode
          value={room.qr_token}
          size={240}
          getRef={(ref) => {
            qrRef.current = ref as never;
          }}
        />
        <Text style={styles.token} selectable>
          {room.qr_token}
        </Text>
      </View>

      <Button title="Imprimir / Compartir QR (PDF)" onPress={print} />
      <Button
        title={room.active ? 'Marcar como inactiva' : 'Marcar como activa'}
        variant={room.active ? 'danger' : 'primary'}
        onPress={toggleActive}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  muted: { color: theme.colors.textMuted },
  qrBox: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  token: { color: theme.colors.textMuted, fontSize: 12 },
});
