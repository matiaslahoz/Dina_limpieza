import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { theme } from '@/theme';

export default function NoRole() {
  const { signOut, email, auth0Sub } = useAuth();
  return (
    <Screen>
      <View style={styles.box}>
        <Text style={styles.title}>Cuenta sin rol asignado</Text>
        <Text style={styles.body}>
          {email
            ? `La cuenta ${email} todavía no tiene un rol (admin / cleaner / client) asignado en Auth0.`
            : 'Todavía no tenés un rol asignado en Auth0.'}{' '}
          Pedile al administrador que te asigne el rol correspondiente.
        </Text>

        {auth0Sub ? (
          <View style={styles.debug}>
            <Text style={styles.debugLabel}>Auth0 sub</Text>
            <Text selectable style={styles.debugValue}>{auth0Sub}</Text>
            {email ? (
              <>
                <Text style={styles.debugLabel}>Email</Text>
                <Text selectable style={styles.debugValue}>{email}</Text>
              </>
            ) : null}
          </View>
        ) : null}

        <Button title="Cerrar sesión" variant="secondary" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12, padding: 8 },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  body: { fontSize: 15, color: theme.colors.textMuted, lineHeight: 22 },
  debug: {
    padding: 12,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 4,
  },
  debugLabel: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  debugValue: { fontFamily: 'Courier', fontSize: 12, color: theme.colors.text },
});
