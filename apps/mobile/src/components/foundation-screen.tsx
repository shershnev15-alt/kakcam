import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme/tokens';

export function FoundationScreen({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children?: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.root}>
        <View style={styles.header}>
          <View style={styles.mark}>
            <Text style={styles.markText}>A</Text>
          </View>
          <Text style={styles.headerText}>ARENA PASSPORT</Text>
          <Text style={styles.search}>⌕</Text>
        </View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.copy}>{copy}</Text>
        {children ?? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>Фундамент готов</Text>
            <Text style={styles.placeholderCopy}>
              Контент этого раздела будет подключен на этапе 10.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  root: { padding: spacing.md, paddingBottom: 100 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', marginBottom: 48 },
  mark: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  markText: { color: colors.canvas, fontWeight: '900', fontSize: 19 },
  headerText: {
    color: colors.text,
    marginLeft: 10,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1.3,
  },
  search: { marginLeft: 'auto', color: colors.muted, fontSize: 24 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  title: {
    color: colors.text,
    fontSize: 36,
    lineHeight: 39,
    fontWeight: '800',
    letterSpacing: -1.3,
    marginTop: 9,
  },
  copy: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 13, maxWidth: 420 },
  placeholder: {
    marginTop: 40,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  placeholderTitle: { color: colors.text, fontWeight: '800', fontSize: 18 },
  placeholderCopy: { color: colors.muted, lineHeight: 21, marginTop: 8 },
});
