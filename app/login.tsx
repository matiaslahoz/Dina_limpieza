import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { theme } from '@/theme';

export default function Login() {
  const { signIn, redirectUri } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

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
        <Pressable onPress={() => setShowDebug((s) => !s)} style={styles.debugBox}>
          <Text style={styles.debugLabel}>
            {showDebug ? 'Ocultar' : 'Mostrar'} redirect_uri (debug)
          </Text>
          {showDebug ? (
            <Text selectable style={styles.debugUri}>
              {redirectUri}
            </Text>
          ) : null}
          {showDebug ? (
            <Text style={styles.debugHint}>
              Copialo y agregalo en Auth0 → Application → Allowed Callback URLs
              y Allowed Logout URLs.
            </Text>
          ) : null}
        </Pressable>
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
    marginTop: 24,
    padding: 12,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 6,
  },
  debugLabel: { color: theme.colors.primary, fontWeight: '600' },
  debugUri: { fontFamily: 'Courier', color: theme.colors.text, fontSize: 12 },
  debugHint: { color: theme.colors.textMuted, fontSize: 12 },
});
