import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AppScreen, SectionHeader } from '../src/components/app-screen';
import { EmptyState } from '../src/components/query-state';
import type { NotificationPreferences } from '../src/engagement/model';
import { useEngagement } from '../src/engagement/provider';
import { formatDateTime } from '../src/lib/format';
import { requestPushPermissionAfterRationale } from '../src/notifications/adapter';
import { colors, radius, spacing } from '../src/theme/tokens';

const preferenceLabels: Record<keyof NotificationPreferences, string> = {
  matchReminders: 'Напоминания о матчах',
  ratingChanges: 'Изменения рейтинга',
  tournamentUpdates: 'Новости турниров',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { state, setPreference, markAllRead } = useEngagement();
  const [permission, setPermission] = useState<'idle' | 'granted' | 'denied'>('idle');

  async function enableNotifications() {
    try {
      const granted = await requestPushPermissionAfterRationale(true);
      setPermission(granted ? 'granted' : 'denied');
    } catch {
      setPermission('denied');
    }
  }

  return (
    <AppScreen
      eyebrow="INBOX"
      title="Уведомления"
      copy="Сначала объясняем пользу, затем запрашиваем системное разрешение."
      back
    >
      <View style={styles.permission}>
        <Text style={styles.permissionTitle}>Не пропускайте важные матчи</Text>
        <Text style={styles.copy}>
          Разрешите уведомления, чтобы получить напоминание за 15 минут до старта.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void enableNotifications()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {permission === 'granted' ? 'Разрешено ✓' : 'Включить уведомления'}
          </Text>
        </Pressable>
        {permission === 'denied' ? (
          <Text style={styles.denied}>Разрешение отключено в системных настройках.</Text>
        ) : null}
      </View>

      <SectionHeader title="Темы" />
      <View style={styles.preferences}>
        {(Object.keys(preferenceLabels) as Array<keyof NotificationPreferences>).map((key) => (
          <View key={key} style={styles.preference}>
            <Text style={styles.preferenceLabel}>{preferenceLabels[key]}</Text>
            <Switch
              value={state.preferences[key]}
              onValueChange={(value) => setPreference(key, value)}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.text}
            />
          </View>
        ))}
      </View>

      <SectionHeader
        title={`История · ${state.inbox.length}`}
        action={
          state.inbox.some((item) => !item.read) ? (
            <Pressable accessibilityRole="button" onPress={markAllRead}>
              <Text style={styles.readAll}>Прочитать всё</Text>
            </Pressable>
          ) : null
        }
      />
      {!state.inbox.length ? (
        <EmptyState
          title="Здесь пока тихо"
          copy="Действия с избранным и напоминаниями появятся в этой ленте."
        />
      ) : (
        state.inbox.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole={item.url ? 'link' : undefined}
            disabled={!item.url}
            onPress={() => item.url && router.push(item.url as Href)}
            style={[styles.inboxItem, !item.read && styles.unread]}
          >
            <View style={styles.inboxTop}>
              <Text style={styles.topic}>{item.topic.replace('-', ' ').toUpperCase()}</Text>
              <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text>
            </View>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.copy}>{item.body}</Text>
          </Pressable>
        ))
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  permission: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  permissionTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  copy: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  button: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  buttonText: { color: colors.canvas, fontWeight: '900' },
  denied: { color: colors.danger, fontSize: 10, marginTop: 10 },
  preferences: { borderTopWidth: 1, borderTopColor: colors.border },
  preference: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  preferenceLabel: { color: colors.text, fontWeight: '700' },
  readAll: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  inboxItem: {
    padding: spacing.md,
    marginBottom: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: colors.accent },
  inboxTop: { flexDirection: 'row', justifyContent: 'space-between' },
  topic: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  time: { color: colors.faint, fontSize: 9 },
  itemTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 10 },
});
