import { useNetInfo } from '@react-native-community/netinfo';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { queryPath } from '../../src/api/client';
import { useApiQuery } from '../../src/api/hooks';
import type {
  ApiPage,
  MatchSummary,
  PlayerSummary,
  TeamSummary,
  TournamentSummary,
} from '../../src/api/types';
import { AppScreen, SectionHeader } from '../../src/components/app-screen';
import { MatchCard, PlayerRow, TeamRow, TournamentCard } from '../../src/components/cards';
import { ErrorState, LoadingState, OfflineNotice } from '../../src/components/query-state';
import { useEngagement } from '../../src/engagement/provider';
import { colors } from '../../src/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const network = useNetInfo();
  const { state } = useEngagement();
  const matches = useApiQuery<ApiPage<MatchSummary>>(
    ['home', 'matches'],
    queryPath('/matches', { status: 'UPCOMING', pageSize: 3 }),
  );
  const players = useApiQuery<ApiPage<PlayerSummary>>(
    ['home', 'players'],
    queryPath('/rankings/players', { pageSize: 5 }),
  );
  const teams = useApiQuery<ApiPage<TeamSummary>>(
    ['home', 'teams'],
    queryPath('/rankings/teams', { pageSize: 3 }),
  );
  const tournaments = useApiQuery<ApiPage<TournamentSummary>>(
    ['home', 'tournaments'],
    queryPath('/tournaments', { pageSize: 3 }),
  );
  const queries = [matches, players, teams, tournaments];
  const loading = queries.some((query) => query.isLoading);
  const error = queries.every((query) => query.isError && !query.data);
  const refreshing = queries.some((query) => query.isFetching) && !loading;
  function refresh() {
    void Promise.all(queries.map((query) => query.refetch()));
  }
  return (
    <AppScreen
      eyebrow="TODAY / LIVE DATA"
      title="Ваш киберспорт без шума"
      copy="Матчи, рейтинги и важные изменения — напрямую из Arena API."
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <OfflineNotice visible={network.isConnected === false} />
      {loading ? <LoadingState rows={4} /> : null}
      {error ? <ErrorState retry={refresh} /> : null}
      {matches.data?.data.length ? (
        <>
          <SectionHeader
            title="Ближайшие матчи"
            action={<TextLink label="Все матчи" onPress={() => router.push('/matches' as Href)} />}
          />
          {matches.data.data.map((match) => (
            <MatchCard key={match.id} match={match} reminder />
          ))}
        </>
      ) : null}
      {state.favorites.length ? (
        <>
          <SectionHeader
            title="Избранное"
            action={<TextLink label="Открыть" onPress={() => router.push('/favorites' as Href)} />}
          />
          <View style={styles.favoriteStrip}>
            {state.favorites.slice(0, 3).map((item) => (
              <Pressable
                key={`${item.kind}-${item.slug}`}
                style={styles.favorite}
                onPress={() =>
                  router.push(
                    `/${item.kind === 'player' ? 'players' : 'teams'}/${item.slug}` as Href,
                  )
                }
              >
                <Text style={styles.favoriteLabel}>{item.label}</Text>
                <Text style={styles.favoriteMeta}>{item.subtitle}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      {players.data?.data.length ? (
        <>
          <SectionHeader title="Топ игроков" />
          {players.data.data.map((player, index) => (
            <PlayerRow key={player.id} player={player} position={index + 1} />
          ))}
        </>
      ) : null}
      {teams.data?.data.length ? (
        <>
          <SectionHeader title="Топ команд" />
          {teams.data.data.map((team, index) => (
            <TeamRow key={team.id} team={team} position={index + 1} />
          ))}
        </>
      ) : null}
      {tournaments.data?.data.length ? (
        <>
          <SectionHeader title="Турниры" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tournaments.data.data.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </ScrollView>
        </>
      ) : null}
    </AppScreen>
  );
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Text style={styles.link}>{label} →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  favoriteStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  favorite: {
    flexGrow: 1,
    minWidth: 130,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  favoriteLabel: { color: colors.text, fontWeight: '800' },
  favoriteMeta: { color: colors.faint, fontSize: 10, marginTop: 4 },
});
