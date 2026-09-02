import type { ReactNode } from 'react';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEngagement } from '../engagement/provider';
import { colors, radius, spacing } from '../theme/tokens';

export function AppScreen({
  eyebrow,
  title,
  copy,
  children,
  refreshing = false,
  onRefresh,
  back = false,
}: {
  eyebrow: string;
  title: string;
  copy?: string | undefined;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  back?: boolean;
}) {
  const router = useRouter();
  const { state } = useEngagement();
  const unread = state.inbox.filter((item) => !item.read).length;
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.root}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          ) : undefined
        }
      >
        <View style={styles.header}>
          {back ? (
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.icon}>
              <Text style={styles.iconText}>‹</Text>
            </Pressable>
          ) : (
            <View style={styles.mark}>
              <Text style={styles.markText}>A</Text>
            </View>
          )}
          <Text style={styles.headerText}>ARENA PASSPORT</Text>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Поиск"
              accessibilityRole="button"
              onPress={() => router.push('/search' as Href)}
              style={styles.icon}
            >
              <Text style={styles.iconText}>⌕</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Уведомления"
              accessibilityRole="button"
              onPress={() => router.push('/notifications' as Href)}
              style={styles.icon}
            >
              <Text style={styles.bell}>●</Text>
              {unread ? <Text style={styles.badge}>{Math.min(unread, 9)}</Text> : null}
            </Pressable>
          </View>
        </View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {copy ? <Text style={styles.copy}>{copy}</Text> : null}
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  root: { paddingHorizontal: spacing.md, paddingBottom: 110 },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', marginBottom: 34 },
  mark: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  markText: { color: colors.canvas, fontWeight: '900', fontSize: 20 },
  headerText: {
    color: colors.text,
    marginLeft: 10,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1.3,
  },
  headerActions: { marginLeft: 'auto', flexDirection: 'row', gap: 8 },
  icon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconText: { color: colors.text, fontSize: 23, lineHeight: 25 },
  bell: { color: colors.muted, fontSize: 13 },
  badge: {
    position: 'absolute',
    right: -2,
    top: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    textAlign: 'center',
    color: colors.canvas,
    backgroundColor: colors.accent,
    fontSize: 10,
    fontWeight: '900',
  },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  title: {
    color: colors.text,
    fontSize: 36,
    lineHeight: 39,
    fontWeight: '800',
    letterSpacing: -1.3,
    marginTop: 9,
  },
  copy: { color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 13, maxWidth: 520 },
  content: { marginTop: 30 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 34,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: -0.3,
  },
});
