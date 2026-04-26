import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { listAllBuildings } from '@/lib/admin';
import { theme } from '@/theme';

interface Row {
  id: string;
  name: string;
  address: string | null;
  client_org_id: string;
  client_orgs: { name: string } | null;
}

export default function BuildingsList() {
  const router = useRouter();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      listAllBuildings()
        .then((d) => setItems(d as Row[]))
        .finally(() => setLoading(false));
    }, []),
  );

  return (
    <Screen scroll={false}>
      <Link href="/(admin)/buildings/new" asChild>
        <Button title="+ Nuevo edificio" />
      </Link>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={<Text style={styles.muted}>No hay edificios cargados.</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/(admin)/buildings/[id]', params: { id: item.id } })}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.muted}>
                {item.client_orgs?.name ?? '—'}
                {item.address ? ` · ${item.address}` : ''}
              </Text>
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: theme.colors.textMuted },
  row: {
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  title: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
});
