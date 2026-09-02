import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AppScreen, SectionHeader } from '../../src/components/app-screen';
import { useEngagement } from '../../src/engagement/provider';
import type { NotificationPreferences } from '../../src/engagement/model';
import { colors, radius, spacing } from '../../src/theme/tokens';

const preferenceLabels: Record<keyof NotificationPreferences, { title: string; copy: string }> = {
  matchReminders: { title: 'Матчи', copy: 'Напоминания за 15 минут' },
  ratingChanges: { title: 'Рейтинг', copy: 'Заметные изменения PPR/TPR' },
  tournamentUpdates: { title: 'Турниры', copy: 'Старт и решающие стадии' },
};

export default function ProfileScreen() {
  const router = useRouter();
  const { state, setPreference } = useEngagement();
  return (
    <AppScreen
      eyebrow="GUEST PASSPORT"
      title="Ваш профиль"
      copy="Избранное и напоминания работают без регистрации и сохраняются на устройстве."
    >
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>G</Text>
        </View>
        <View style={styles.grow}>
          <Text style={styles.name}>Гостевой профиль</Text>
          <Text style={styles.copy}>Локальные настройки · синхронизация появится после входа</Text>
        </View>
      </View>
      <View style={styles.metrics}>
        <Metric label="Избранное" value={state.favorites.length} />
        <Metric label="Напоминания" value={state.reminders.length} />
        <Metric label="Новые" value={state.inbox.filter((item) => !item.read).length} />
      </View>
      <View style={styles.links}>
        <MenuLink
          label="Избранное"
          value={`${state.favorites.length}`}
          onPress={() => router.push('/favorites' as Href)}
        />
        <MenuLink
          label="Уведомления"
          value={`${state.inbox.length}`}
          onPress={() => router.push('/notifications' as Href)}
        />
      </View>
      <SectionHeader title="Что сообщать" />
      <View style={styles.preferences}>
        {(Object.keys(preferenceLabels) as Array<keyof NotificationPreferences>).map((key) => (
          <View key={key} style={styles.preference}>
            <View style={styles.grow}>
              <Text style={styles.preferenceTitle}>{preferenceLabels[key].title}</Text>
              <Text style={styles.copy}>{preferenceLabels[key].copy}</Text>
            </View>
            <Switch
              value={state.preferences[key]}
              onValueChange={(value) => setPreference(key, value)}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.text}
            />
          </View>
        ))}
      </View>
      <View style={styles.guestNote}>
        <Text style={styles.noteTitle}>Единая учётная запись</Text>
        <Text style={styles.copy}>
          Email, OAuth и Steam будут подключены к тому же профилю без ограничения публичного
          просмотра.
        </Text>
      </View>
    </AppScreen>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function MenuLink({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.menuLink} onPress={onPress}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuValue}>{value} ›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  avatarText: { color: colors.canvas, fontSize: 25, fontWeight: '900' },
  grow: { flex: 1 },
  name: { color: colors.text, fontSize: 18, fontWeight: '800' },
  copy: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  metrics: { flexDirection: 'row', gap: 8, marginTop: 10 },
  metric: { flex: 1, padding: 13, backgroundColor: colors.elevated, borderRadius: radius.sm },
  metricValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
  metricLabel: { color: colors.faint, fontSize: 9, marginTop: 3 },
  links: { marginTop: 22, borderTopWidth: 1, borderTopColor: colors.border },
  menuLink: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLabel: { color: colors.text, fontWeight: '700' },
  menuValue: { color: colors.accent, fontWeight: '800' },
  preferences: { borderTopWidth: 1, borderTopColor: colors.border },
  preference: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  preferenceTitle: { color: colors.text, fontWeight: '700' },
  guestNote: {
    marginTop: 28,
    padding: spacing.md,
    backgroundColor: '#141b26',
    borderRadius: radius.md,
  },
  noteTitle: { color: colors.accent, fontSize: 12, fontWeight: '800' },
});
