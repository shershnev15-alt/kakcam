import { useNetInfo } from '@react-native-community/netinfo';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { queryPath } from '../../src/api/client';
import { useApiQuery } from '../../src/api/hooks';
import type { ApiPage, PlayerSummary, TeamSummary } from '../../src/api/types';
import { AppScreen } from '../../src/components/app-screen';
import { PlayerRow, TeamRow } from '../../src/components/cards';
import { ErrorState, LoadingState, OfflineNotice } from '../../src/components/query-state';
import { colors, radius } from '../../src/theme/tokens';

export default function RankingsScreen() {
  const [mode, setMode] = useState<'players' | 'teams'>('players');
  const network = useNetInfo();
  const players = useApiQuery<ApiPage<PlayerSummary>>(
    ['rankings', 'players', 1],
    queryPath('/rankings/players', { pageSize: 40 }),
    mode === 'players',
  );
  const teams = useApiQuery<ApiPage<TeamSummary>>(
    ['rankings', 'teams', 1],
    queryPath('/rankings/teams', { pageSize: 20 }),
    mode === 'teams',
  );
  const query = mode === 'players' ? players : teams;
  return (
    <AppScreen
      eyebrow="PPR / TPR"
      title="Рейтинги"
      copy="Позиция, confidence и форма — только из опубликованного расчёта."
      refreshing={query.isFetching && !query.isLoading}
      onRefresh={() => void query.refetch()}
    >
      <OfflineNotice visible={network.isConnected === false} />
      <View style={styles.segment}>
        {(['players', 'teams'] as const).map((value) => (
          <Pressable
            key={value}
            style={[styles.segmentButton, mode === value && styles.active]}
            onPress={() => setMode(value)}
          >
            <Text style={[styles.segmentText, mode === value && styles.activeText]}>
              {value === 'players' ? 'Игроки · PPR' : 'Команды · TPR'}
            </Text>
          </Pressable>
        ))}
      </View>
      {query.isLoading ? <LoadingState rows={7} /> : null}
      {query.isError && !query.data ? <ErrorState retry={() => void query.refetch()} /> : null}
      {mode === 'players'
        ? players.data?.data.map((player, index) => (
            <PlayerRow key={player.id} player={player} position={index + 1} />
          ))
        : teams.data?.data.map((team, index) => (
            <TeamRow key={team.id} team={team} position={index + 1} />
          ))}
      <Text style={styles.formula}>
        {query.data?.meta.ratingRun?.formulaVersion ?? 'Расчёт не опубликован'}
      </Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: 15,
  },
  segmentButton: { flex: 1, padding: 11, borderRadius: radius.sm, alignItems: 'center' },
  active: { backgroundColor: colors.accent },
  segmentText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  activeText: { color: colors.canvas },
  formula: { color: colors.faint, fontSize: 10, textAlign: 'center', marginTop: 20 },
});
