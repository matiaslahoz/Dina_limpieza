import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { fetchMyBuildings } from '@/lib/buildings';
import { theme } from '@/theme';
import type { Building } from '@/types';

export default function ClientHome() {
  const { name, signOut } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchMyBuildings()
        .then(setBuildings)
        .finally(() => setLoading(false));
    }, []),
  );

  return (
    <Screen scroll={false}>
      <View>
        <Text style={styles.hi}>Hola{name ? `, ${name.split(' ')[0]}` : ''} 👋</Text>
        <Text style={styles.muted}>
          Escaneá el QR de cualquier habitación para ver quién la limpió y cuándo.
        </Text>
      </View>

      <Link href="/(client)/scan" asChild>
        <Button title="Escanear QR de una habitación" />
      </Link>

      <Text style={styles.section}>Mis edificios</Text>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={buildings}
          keyExtractor={(b) => b.id}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <Text style={styles.muted}>No hay edificios cargados todavía.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              {item.address ? <Text style={styles.muted}>{item.address}</Text> : null}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      <Button title="Cerrar sesión" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hi: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  muted: { color: theme.colors.textMuted },
  section: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  row: {
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  rowTitle: { fontWeight: '600', color: theme.colors.text, fontSize: 16 },
});
