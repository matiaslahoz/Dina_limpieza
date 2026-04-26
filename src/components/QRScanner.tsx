import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { theme } from '@/theme';

interface Props {
  onScan: (token: string) => void;
  hint?: string;
}

export const QRScanner = ({ onScan, hint }: Props) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(true);
  const lastScan = useRef<{ token: string; t: number } | null>(null);

  useEffect(() => {
    if (permission && !permission.granted) requestPermission();
  }, [permission, requestPermission]);

  if (!permission) return <View style={styles.placeholder} />;
  if (!permission.granted) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.text}>
          Necesitamos acceso a la cámara para escanear los QR de cada habitación.
        </Text>
        <Button title="Permitir cámara" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          active
            ? (event) => {
                const token = event.data.trim();
                const now = Date.now();
                // Debounce de 1.5s para no disparar varios checks por frame
                if (lastScan.current && lastScan.current.token === token && now - lastScan.current.t < 1500) {
                  return;
                }
                lastScan.current = { token, t: now };
                setActive(false);
                onScan(token);
                setTimeout(() => setActive(true), 1500);
              }
            : undefined
        }
      />
      <View pointerEvents="none" style={styles.frame} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: theme.radius,
    backgroundColor: '#000',
  },
  frame: {
    position: 'absolute',
    top: '20%',
    bottom: '20%',
    left: '10%',
    right: '10%',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: theme.radius,
    opacity: 0.7,
  },
  hint: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  placeholder: {
    flex: 1,
    padding: 24,
    gap: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    justifyContent: 'center',
  },
  text: { color: theme.colors.text, fontSize: 16, lineHeight: 22 },
});
