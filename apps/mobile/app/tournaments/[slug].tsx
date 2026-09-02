import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useApiQuery } from '../../src/api/hooks';
import type { ApiItem, TournamentDetail } from '../../src/api/types';
import { AppScreen, SectionHeader } from '../../src/components/app-screen';
import { MatchCard, StatGrid, TeamRow } from '../../src/components/cards';
import { ShareAction } from '../../src/components/entity-actions';
import { ErrorState, LoadingState } from '../../src/components/query-state';
import { formatDateTime } from '../../src/lib/format';
import { colors, radius, spacing } from '../../src/theme/tokens';

export default function TournamentScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useApiQuery<ApiItem<TournamentDetail>>(
    ['tournaments', slug],
    `/tournaments/${encodeURIComponent(slug ?? '')}`,
    Boolean(slug),
  );
  const tournament = query.data?.data;
  return (
    <AppScreen
      back
      eyebrow="TOURNAMENT HUB"
      title={tournament?.name ?? 'Турнир'}
      copy={tournament ? `${tournament.tier} · ${tournament.mode}` : undefined}
      refreshing={query.isFetching && !query.isLoading}
      onRefresh={() => void query.refetch()}
    >
      {query.isLoading ? <LoadingState rows={5} /> : null}
      {query.isError && !tournament ? <ErrorState retry={() => void query.refetch()} /> : null}
      {tournament ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.status}>{tournament.status}</Text>
            <Text style={styles.date}>
              {formatDateTime(tournament.startsAt)} — {formatDateTime(tournament.endsAt)}
            </Text>
            <Text style={styles.prize}>
              {tournament.prizePool
                ? `${tournament.prizePool.toLocaleString('ru-RU')} ${tournament.currency ?? ''}`
                : 'Призовой фонд не опубликован'}
            </Text>
          </View>
          <ShareAction route="tournaments" id={tournament.slug} label={tournament.name} />
          <SectionHeader title="Обзор" />
          <StatGrid
            items={[
              { label: 'Команды', value: tournament.participantCount },
              { label: 'Матчи', value: tournament.matchCount },
              { label: 'Tier', value: tournament.tier },
              { label: 'Формат', value: tournament.mode },
            ]}
          />
          {tournament.placements.length ? (
            <>
              <SectionHeader title="Итоги" />
              {tournament.placements.map((placement) => (
                <View key={`${placement.placeFrom}-${placement.team.id}`} style={styles.placement}>
                  <Text style={styles.place}>#{placement.placeFrom}</Text>
                  <Text style={styles.team}>{placement.team.name}</Text>
                  <Text style={styles.amount}>
                    {placement.prizeAmount?.toLocaleString('ru-RU') ?? '—'}
                  </Text>
                </View>
              ))}
            </>
          ) : null}
          <SectionHeader title="Участники" />
          {tournament.participants.map((team, index) => (
            <TeamRow
              key={team.id}
              position={index + 1}
              team={{
                ...team,
                verificationLevel: 0,
                countryCode: null,
                countryName: null,
                foundedYear: null,
                rating: null,
                form: [],
              }}
            />
          ))}
          {tournament.matches.length ? (
            <>
              <SectionHeader title="Матчи" />
              {tournament.matches.map((match) => (
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
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  status: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  date: { color: colors.muted, fontSize: 12, marginTop: 12 },
  prize: { color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 22 },
  placement: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  place: { width: 42, color: colors.accent, fontWeight: '900' },
  team: { flex: 1, color: colors.text, fontWeight: '800' },
  amount: { color: colors.muted },
});
