import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { clearAuthLogs, subscribeAuthLogs } from '@/auth/authLog';
import { theme } from '@/theme';

export default function Login() {
  const { signIn, redirectUri } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => subscribeAuthLogs(setLogs), []);

  const handle = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos iniciarte sesión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>D</Text>
        </View>
        <Text style={styles.title}>Dina Limpieza</Text>
        <Text style={styles.subtitle}>
          Ingresá con tu cuenta para registrar limpieza por habitación.
        </Text>
      </View>
      <Button title="Ingresar con Auth0" onPress={handle} loading={busy} />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {__DEV__ ? (
        <View style={styles.debugBox}>
          <View style={styles.debugHeader}>
            <Pressable onPress={() => setShowDebug((s) => !s)}>
              <Text style={styles.debugLabel}>
                {showDebug ? 'Ocultar' : 'Mostrar'} debug
              </Text>
            </Pressable>
            {showDebug ? (
              <Pressable onPress={clearAuthLogs}>
                <Text style={styles.debugClear}>Limpiar</Text>
              </Pressable>
            ) : null}
          </View>
          {showDebug ? (
            <>
              <Text style={styles.debugHint}>redirect_uri (copialo a Auth0):</Text>
              <Text selectable style={styles.debugUri}>
                {redirectUri}
              </Text>
              <Text style={styles.debugHint}>Eventos:</Text>
              <ScrollView style={styles.logScroll}>
                {logs.length === 0 ? (
                  <Text style={styles.debugUri}>(sin eventos todavía)</Text>
                ) : (
                  logs.map((l, i) => (
                    <Text key={i} selectable style={styles.logLine}>
                      {l}
                    </Text>
                  ))
                )}
              </ScrollView>
            </>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 48, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: theme.colors.textMuted,
    paddingHorizontal: 16,
  },
  error: { color: theme.colors.danger, textAlign: 'center' },
  debugBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 6,
  },
  debugHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  debugLabel: { color: theme.colors.primary, fontWeight: '600' },
  debugClear: { color: theme.colors.danger, fontWeight: '600' },
  debugUri: { fontFamily: 'Courier', color: theme.colors.text, fontSize: 11 },
  debugHint: { color: theme.colors.textMuted, fontSize: 12, marginTop: 4 },
  logScroll: { maxHeight: 320, backgroundColor: '#0F172A', padding: 8, borderRadius: 8 },
  logLine: { fontFamily: 'Courier', color: '#A5F3FC', fontSize: 10, lineHeight: 14 },
});
