import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useApiQuery } from '../../src/api/hooks';
import type { ApiItem, TeamDetail } from '../../src/api/types';
import { AppScreen, SectionHeader } from '../../src/components/app-screen';
import { Avatar, MatchCard, PlayerRow, StatGrid } from '../../src/components/cards';
import { EntityActions } from '../../src/components/entity-actions';
import { ErrorState, LoadingState } from '../../src/components/query-state';
import { formatPercent } from '../../src/lib/format';
import { colors, radius, spacing } from '../../src/theme/tokens';

export default function TeamScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useApiQuery<ApiItem<TeamDetail>>(
    ['teams', slug],
    `/teams/${encodeURIComponent(slug ?? '')}`,
    Boolean(slug),
  );
  const team = query.data?.data;
  return (
    <AppScreen
      back
      eyebrow="TEAM PASSPORT"
      title={team?.name ?? 'Профиль команды'}
      copy={team ? `${team.countryName ?? 'CIS'} · основана ${team.foundedYear ?? '—'}` : undefined}
      refreshing={query.isFetching && !query.isLoading}
      onRefresh={() => void query.refetch()}
    >
      {query.isLoading ? <LoadingState rows={5} /> : null}
      {query.isError && !team ? <ErrorState retry={() => void query.refetch()} /> : null}
      {team ? (
        <>
          <View style={styles.hero}>
            <Avatar label={team.shortName} large />
            <View style={styles.grow}>
              <Text style={styles.shortName}>{team.shortName}</Text>
              <Text style={styles.meta}>{team.countryName ?? 'Регион не указан'}</Text>
              <Text style={styles.meta}>Trust level {team.verificationLevel}</Text>
            </View>
            <View style={styles.rating}>
              <Text style={styles.ratingValue}>{team.rating?.score ?? '—'}</Text>
              <Text style={styles.ratingLabel}>TPR #{team.rating?.rank ?? '—'}</Text>
            </View>
          </View>
          <EntityActions
            kind="team"
            id={team.id}
            slug={team.slug}
            label={team.name}
            subtitle={team.countryName ?? team.shortName}
          />
          <SectionHeader title="Командная форма" />
          <StatGrid
            items={[
              { label: 'Матчи', value: team.performance?.sampleMatches ?? 0 },
              { label: 'Победы', value: team.performance?.wins ?? 0 },
              { label: 'Поражения', value: team.performance?.losses ?? 0 },
              { label: 'Win rate', value: formatPercent(team.performance?.winRate ?? 0) },
              {
                label: 'Карты',
                value: `${team.performance?.mapsWon ?? 0}:${team.performance?.mapsLost ?? 0}`,
              },
              { label: 'Раунды', value: team.performance?.roundDifference ?? 0 },
            ]}
          />
          <SectionHeader title="Активный состав" />
          {team.roster.map((player) => (
            <PlayerRow key={player.id} player={player} />
          ))}
          {team.matches.length ? (
            <>
              <SectionHeader title="Матчи команды" />
              {team.matches.map((match) => (
                <MatchCard key={match.id} match={match} reminder />
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
  grow: { flex: 1 },
  shortName: { color: colors.text, fontSize: 22, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 3 },
  rating: { alignItems: 'flex-end' },
  ratingValue: { color: colors.text, fontSize: 28, fontWeight: '900' },
  ratingLabel: { color: colors.accent, fontSize: 9, fontWeight: '800' },
});
