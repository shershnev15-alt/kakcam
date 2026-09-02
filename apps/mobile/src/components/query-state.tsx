import { StyleSheet, Text, View, Pressable } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <View style={styles.stack} accessibilityLabel="Загрузка">
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.skeleton} />
      ))}
    </View>
  );
}

export function ErrorState({ retry }: { retry: () => void }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Не удалось загрузить</Text>
      <Text style={styles.copy}>Проверьте подключение. Сохранённые данные останутся доступны.</Text>
      <Pressable accessibilityRole="button" style={styles.button} onPress={retry}>
        <Text style={styles.buttonText}>Повторить</Text>
      </Pressable>
    </View>
  );
}

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>{copy}</Text>
    </View>
  );
}

export function OfflineNotice({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.offline}>
      <Text style={styles.offlineText}>OFFLINE · показываем последние сохранённые данные</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  skeleton: {
    height: 94,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.7,
  },
  panel: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  copy: { color: colors.muted, lineHeight: 21, marginTop: 7 },
  button: {
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  buttonText: { color: colors.canvas, fontWeight: '800' },
  offline: {
    borderWidth: 1,
    borderColor: '#594b25',
    backgroundColor: '#272113',
    padding: 10,
    borderRadius: radius.sm,
    marginBottom: 14,
  },
  offlineText: { color: '#f0cf73', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
});
