import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { QRScanner } from '@/components/QRScanner';
import { Screen } from '@/components/Screen';
import { findRoomByQr } from '@/lib/buildings';
import { theme } from '@/theme';

export default function ClientScan() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handle = async (token: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const room = await findRoomByQr(token);
      if (!room) {
        Alert.alert('QR desconocido', 'Este código no está registrado en ningún edificio tuyo.');
        return;
      }
      router.replace({ pathname: '/(client)/room/[id]', params: { id: room.id } });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No pudimos leer el QR');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll={false}>
      <Text style={styles.heading}>Escaneá el QR de la habitación</Text>
      <View style={styles.scanner}>
        <QRScanner onScan={handle} hint="Apuntá la cámara al QR" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 16, color: theme.colors.text },
  scanner: { flex: 1, minHeight: 320, borderRadius: theme.radius, overflow: 'hidden' },
});
