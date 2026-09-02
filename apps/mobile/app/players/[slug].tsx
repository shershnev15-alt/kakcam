import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useApiQuery } from '../../src/api/hooks';
import type { ApiItem, PlayerDetail } from '../../src/api/types';
import { AppScreen, SectionHeader } from '../../src/components/app-screen';
import { Avatar, MatchCard, PlayerRow, StatGrid } from '../../src/components/cards';
import { EntityActions } from '../../src/components/entity-actions';
import { ErrorState, LoadingState } from '../../src/components/query-state';
import { formatPercent } from '../../src/lib/format';
import { colors, radius, spacing } from '../../src/theme/tokens';

export default function PlayerScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useApiQuery<ApiItem<PlayerDetail>>(
    ['players', slug],
    `/players/${encodeURIComponent(slug ?? '')}`,
    Boolean(slug),
  );
  const player = query.data?.data;
  return (
    <AppScreen
      back
      eyebrow="PLAYER DIGITAL PASSPORT"
      title={player?.nickname ?? 'Профиль игрока'}
      copy={
        player
          ? `${player.realName ?? 'Имя не опубликовано'} · ${player.countryName ?? 'CIS'}`
          : undefined
      }
      refreshing={query.isFetching && !query.isLoading}
      onRefresh={() => void query.refetch()}
    >
      {query.isLoading ? <LoadingState rows={5} /> : null}
      {query.isError && !player ? <ErrorState retry={() => void query.refetch()} /> : null}
      {player ? (
        <>
          <View style={styles.hero}>
            <Avatar label={player.nickname} large />
            <View style={styles.heroCopy}>
              <View style={styles.nameLine}>
                <Text style={styles.nickname}>{player.nickname}</Text>
                {player.verificationLevel >= 3 ? (
                  <Text style={styles.verified}>VERIFIED</Text>
                ) : null}
              </View>
              <Text style={styles.meta}>
                {player.roles.join(' / ') || 'Игрок'} · {player.teamName ?? 'Без команды'}
              </Text>
              <Text style={styles.meta}>
                {player.countryCode ?? 'CIS'} · {player.age ? `${player.age} лет` : 'Возраст скрыт'}
              </Text>
            </View>
            <View style={styles.rating}>
              <Text style={styles.ratingValue}>{player.rating?.score ?? '—'}</Text>
              <Text style={styles.ratingLabel}>PPR #{player.rating?.rank ?? '—'}</Text>
            </View>
          </View>
          <EntityActions
            kind="player"
            id={player.id}
            slug={player.slug}
            label={player.nickname}
            subtitle={player.teamName ?? player.countryName ?? 'Игрок'}
          />
          <SectionHeader title="Форма" />
          <StatGrid
            items={[
              { label: 'Матчи', value: player.performance?.sampleMatches ?? 0 },
              { label: 'K/D', value: player.performance?.kd.toFixed(2) ?? '—' },
              { label: 'ADR', value: player.performance?.adr.toFixed(1) ?? '—' },
              { label: 'KAST', value: formatPercent(player.performance?.kast ?? 0) },
              { label: 'Win rate', value: formatPercent(player.performance?.winRate ?? 0) },
              { label: 'Rating', value: player.performance?.performanceRating.toFixed(2) ?? '—' },
            ]}
          />
          {player.matches.length ? (
            <>
              <SectionHeader title="Последние матчи" />
              {player.matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </>
          ) : null}
          {player.achievements.length ? (
            <>
              <SectionHeader title="Достижения" />
              <View style={styles.achievements}>
                {player.achievements.slice(0, 6).map((achievement) => (
                  <View key={achievement.code} style={styles.achievement}>
                    <Text style={styles.rarity}>{achievement.rarity}</Text>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.meta}>{achievement.description}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
          {player.similar.length ? (
            <>
              <SectionHeader title="Похожие игроки" />
              {player.similar.map((item) => (
                <PlayerRow key={item.id} player={item} />
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  heroCopy: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  nickname: { color: colors.text, fontSize: 21, fontWeight: '900' },
  verified: {
    color: colors.canvas,
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 7,
    fontWeight: '900',
  },
  meta: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 3 },
  rating: { alignItems: 'flex-end' },
  ratingValue: { color: colors.text, fontSize: 28, fontWeight: '900' },
  ratingLabel: { color: colors.accent, fontSize: 9, fontWeight: '800' },
  achievements: { gap: 9 },
  achievement: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rarity: { color: colors.accent, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  achievementTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 8 },
});
