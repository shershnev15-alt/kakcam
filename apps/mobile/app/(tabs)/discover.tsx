import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { queryPath } from '../../src/api/client';
import { useApiQuery } from '../../src/api/hooks';
import type {
  ApiPage,
  PlayerSummary,
  TournamentSummary,
  TransferSummary,
} from '../../src/api/types';
import { AppScreen, SectionHeader } from '../../src/components/app-screen';
import { PlayerRow, TournamentCard, TransferCard } from '../../src/components/cards';
import { ErrorState, LoadingState } from '../../src/components/query-state';
import { colors, radius } from '../../src/theme/tokens';

export default function DiscoverScreen() {
  const router = useRouter();
  const players = useApiQuery<ApiPage<PlayerSummary>>(
    ['discover', 'players'],
    queryPath('/players', { pageSize: 6, sort: 'rating' }),
  );
  const transfers = useApiQuery<ApiPage<TransferSummary>>(
    ['discover', 'transfers'],
    queryPath('/transfers', { pageSize: 5 }),
  );
  const tournaments = useApiQuery<ApiPage<TournamentSummary>>(
    ['discover', 'tournaments'],
    queryPath('/tournaments', { pageSize: 3 }),
  );
  const loading = players.isLoading || transfers.isLoading || tournaments.isLoading;
  const error = players.isError && transfers.isError && tournaments.isError;
  function refresh() {
    void Promise.all([players.refetch(), transfers.refetch(), tournaments.refetch()]);
  }
  return (
    <AppScreen
      eyebrow="DISCOVER"
      title="Открывайте новых"
      copy="Игроки в форме, подтверждённые переходы и турниры региона."
      refreshing={
        !loading && (players.isFetching || transfers.isFetching || tournaments.isFetching)
      }
      onRefresh={refresh}
    >
      <Pressable style={styles.search} onPress={() => router.push('/search' as Href)}>
        <Text style={styles.searchIcon}>⌕</Text>
        <Text style={styles.searchText}>Найти игрока или команду</Text>
      </Pressable>
      {loading ? <LoadingState rows={5} /> : null}
      {error ? <ErrorState retry={refresh} /> : null}
      {players.data?.data.length ? (
        <>
          <SectionHeader title="Сильнейшие сейчас" />
          {players.data.data.map((player, index) => (
            <PlayerRow key={player.id} player={player} position={index + 1} />
          ))}
        </>
      ) : null}
      {transfers.data?.data.length ? (
        <>
          <SectionHeader title="Переходы" />
          {transfers.data.data.map((transfer) => (
            <TransferCard key={transfer.id} transfer={transfer} />
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

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 15,
    marginBottom: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { color: colors.accent, fontSize: 22 },
  searchText: { color: colors.muted, fontSize: 14 },
});
