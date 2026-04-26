import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { theme } from '@/theme';

export default function NoRole() {
  const { signOut, email } = useAuth();
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
        <Button title="Cerrar sesión" variant="secondary" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12, padding: 8 },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  body: { fontSize: 15, color: theme.colors.textMuted, lineHeight: 22 },
});
