import type { Href } from 'expo-router';
import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApiQuery } from '../../src/api/hooks';
import type { ApiItem, MatchDetail } from '../../src/api/types';
import { AppScreen, SectionHeader } from '../../src/components/app-screen';
import { Avatar } from '../../src/components/cards';
import { ReminderAction, ShareAction } from '../../src/components/entity-actions';
import { ErrorState, LoadingState } from '../../src/components/query-state';
import { formatDateTime, score } from '../../src/lib/format';
import { colors, radius, spacing } from '../../src/theme/tokens';

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useApiQuery<ApiItem<MatchDetail>>(
    ['matches', id],
    `/matches/${encodeURIComponent(id ?? '')}`,
    Boolean(id),
  );
  const match = query.data?.data;
  const label = match
    ? `${match.homeTeam?.shortName ?? 'TBD'} — ${match.awayTeam?.shortName ?? 'TBD'}`
    : 'Матч';
  return (
    <AppScreen
      back
      eyebrow="MATCH CENTER"
      title={label}
      copy={match ? `${match.tournament} · ${formatDateTime(match.startsAt)}` : undefined}
      refreshing={query.isFetching && !query.isLoading}
      onRefresh={() => void query.refetch()}
    >
      {query.isLoading ? <LoadingState rows={5} /> : null}
      {query.isError && !match ? <ErrorState retry={() => void query.refetch()} /> : null}
      {match ? (
        <>
          <View style={styles.scoreboard}>
            <TeamSide team={match.homeTeam} />
            <View style={styles.center}>
              <Text style={[styles.status, match.status === 'LIVE' && styles.live]}>
                {match.status}
              </Text>
              <Text style={styles.score}>
                {score(match.homeScore)} : {score(match.awayScore)}
              </Text>
              <Text style={styles.meta}>BO{match.bestOf}</Text>
            </View>
            <TeamSide team={match.awayTeam} right />
          </View>
          {match.status === 'UPCOMING' ? (
            <ReminderAction matchId={match.id} startsAt={match.startsAt} label={label} />
          ) : null}
          <ShareAction route="matches" id={match.id} label={label} />
          {match.maps.length ? (
            <>
              <SectionHeader title="Карты" />
              {match.maps.map((map) => (
                <View key={`${map.mapOrder}-${map.mapKey}`} style={styles.mapRow}>
                  <Text style={styles.mapOrder}>{map.mapOrder}</Text>
                  <Text style={styles.mapName}>{map.mapKey}</Text>
                  <Text style={styles.mapScore}>
                    {score(map.homeScore)} : {score(map.awayScore)}
                  </Text>
                  <Text style={styles.meta}>{map.overtime ? 'OT' : ''}</Text>
                </View>
              ))}
            </>
          ) : null}
          {match.playerStatistics.length ? (
            <>
              <SectionHeader title="Статистика игроков" />
              {match.playerStatistics.map((stat) => (
                <Link key={stat.playerId} href={`/players/${stat.slug}` as Href} asChild>
                  <Pressable style={styles.statRow}>
                    <Text style={styles.statName}>{stat.nickname}</Text>
                    <Text style={styles.statCell}>{stat.kills}K</Text>
                    <Text style={styles.statCell}>{stat.deaths}D</Text>
                    <Text style={styles.statRating}>{stat.rating.toFixed(2)}</Text>
                  </Pressable>
                </Link>
              ))}
            </>
          ) : null}
          <View style={styles.provenance}>
            <Text style={styles.provenanceTitle}>
              ПРОВЕРЯЕМЫЙ ФАКТ · L{match.verificationLevel}
            </Text>
            <Text style={styles.meta}>
              Источник: {match.sourceCode ?? 'pending'}
              {match.checksum ? ` · ${match.checksum.slice(0, 12)}…` : ''}
            </Text>
          </View>
        </>
      ) : null}
    </AppScreen>
  );
}

function TeamSide({ team, right = false }: { team: MatchDetail['homeTeam']; right?: boolean }) {
  if (!team) return <View style={styles.side} />;
  return (
    <Link href={`/teams/${team.slug}` as Href} asChild>
      <Pressable style={[styles.side, right && styles.sideRight]}>
        <Avatar label={team.shortName} />
        <Text style={styles.teamName}>{team.shortName}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  scoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  side: { flex: 1, alignItems: 'flex-start', gap: 8 },
  sideRight: { alignItems: 'flex-end' },
  teamName: { color: colors.text, fontSize: 15, fontWeight: '900' },
  center: { alignItems: 'center' },
  status: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  live: { color: colors.danger },
  score: { color: colors.text, fontSize: 36, fontWeight: '900', marginVertical: 8 },
  meta: { color: colors.faint, fontSize: 9 },
  mapRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mapOrder: { color: colors.faint, width: 18 },
  mapName: { color: colors.text, fontWeight: '800', flex: 1, textTransform: 'capitalize' },
  mapScore: { color: colors.text, fontSize: 17, fontWeight: '900' },
  statRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statName: { flex: 1, color: colors.text, fontWeight: '800' },
  statCell: { width: 42, color: colors.muted, textAlign: 'right' },
  statRating: { width: 50, color: colors.accent, textAlign: 'right', fontWeight: '900' },
  provenance: {
    marginTop: 30,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#141b26',
  },
  provenanceTitle: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});
