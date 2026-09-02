import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { canonicalWebUrl } from '../api/client';
import { useEngagement } from '../engagement/provider';
import type { FavoriteKind } from '../engagement/model';
import { canonicalEntityUrl } from '../navigation/links';
import { colors, radius } from '../theme/tokens';

export function EntityActions({
  kind,
  id,
  slug,
  label,
  subtitle,
}: {
  kind: FavoriteKind;
  id: string;
  slug: string;
  label: string;
  subtitle: string;
}) {
  const { isFavorite, toggleFavorite } = useEngagement();
  const active = isFavorite(kind, slug);
  async function share() {
    const route = kind === 'player' ? 'players' : 'teams';
    const url = canonicalEntityUrl(canonicalWebUrl, route, slug);
    await Share.share({ title: label, message: `${label} — Arena Passport\n${url}`, url });
  }
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[styles.button, active && styles.active]}
        onPress={() => toggleFavorite({ kind, id, slug, label, subtitle })}
      >
        <Text style={[styles.text, active && styles.activeText]}>
          {active ? '★ В избранном' : '☆ В избранное'}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => void share()}>
        <Text style={styles.text}>Поделиться</Text>
      </Pressable>
    </View>
  );
}

export function ReminderAction({
  matchId,
  startsAt,
  label,
}: {
  matchId: string;
  startsAt: string;
  label: string;
}) {
  const { isReminder, toggleReminder } = useEngagement();
  const active = isReminder(matchId);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    try {
      await toggleReminder({ matchId, startsAt, label });
    } catch {
      setError('Разрешите уведомления в настройках устройства');
    }
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[styles.reminder, active && styles.active]}
        onPress={() => void toggle()}
      >
        <Text style={[styles.text, active && styles.activeText]}>
          {active ? 'Напоминание включено' : 'Напомнить за 15 минут'}
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function ShareAction({
  route,
  id,
  label,
}: {
  route: 'players' | 'teams' | 'matches' | 'tournaments';
  id: string;
  label: string;
}) {
  async function share() {
    const url = canonicalEntityUrl(canonicalWebUrl, route, id);
    await Share.share({ title: label, message: `${label} — Arena Passport\n${url}`, url });
  }
  return (
    <Pressable accessibilityRole="button" style={styles.reminder} onPress={() => void share()}>
      <Text style={styles.text}>Поделиться</Text>
    </Pressable>
  );
}

export function InlineLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(href as Href)}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 9, marginTop: 20 },
  button: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reminder: {
    marginTop: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  active: { borderColor: colors.accent, backgroundColor: '#1b2217' },
  text: { color: colors.text, fontWeight: '700', fontSize: 12 },
  activeText: { color: colors.accent },
  error: { color: colors.danger, fontSize: 10, marginTop: 7 },
  link: { color: colors.accent, fontSize: 12, fontWeight: '800' },
});
