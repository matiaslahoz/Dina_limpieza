import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme';

export const Screen = ({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) => (
  <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    {scroll ? (
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    ) : (
      <View style={[styles.content, { flex: 1 }]}>{children}</View>
    )}
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, gap: 16 },
});
