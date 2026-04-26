import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { createBuilding, listClientOrgs } from '@/lib/admin';
import { theme } from '@/theme';

interface Org {
  id: string;
  name: string;
}

export default function NewBuilding() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listClientOrgs().then((d) => {
      setOrgs(d as Org[]);
      if (d.length === 1) setOrgId((d[0] as Org).id);
    });
  }, []);

  const submit = async () => {
    if (!orgId || !name.trim()) {
      Alert.alert('Faltan datos', 'Cliente y nombre son obligatorios.');
      return;
    }
    setBusy(true);
    try {
      const b = await createBuilding({ client_org_id: orgId, name: name.trim(), address: address.trim() || undefined });
      router.replace({ pathname: '/(admin)/buildings/[id]', params: { id: b.id } });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No pudimos crearlo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.label}>Cliente</Text>
      <View style={styles.chips}>
        {orgs.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => setOrgId(o.id)}
            style={[styles.chip, orgId === o.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, orgId === o.id && styles.chipTextActive]}>{o.name}</Text>
          </Pressable>
        ))}
        {orgs.length === 0 ? (
          <Text style={styles.muted}>No hay clientes cargados todavía. Cargalos en Supabase.</Text>
        ) : null}
      </View>

      <Text style={styles.label}>Nombre del edificio</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Edificio A" style={styles.input} />

      <Text style={styles.label}>Dirección (opcional)</Text>
      <TextInput value={address} onChangeText={setAddress} placeholder="Calle 123" style={styles.input} />

      <Button title="Crear edificio" onPress={submit} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: theme.colors.text, fontWeight: '600' },
  muted: { color: theme.colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    padding: 12,
    backgroundColor: '#fff',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
});
