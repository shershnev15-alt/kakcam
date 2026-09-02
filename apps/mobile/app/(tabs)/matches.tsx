import { useNetInfo } from '@react-native-community/netinfo';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { queryPath } from '../../src/api/client';
import { useApiQuery } from '../../src/api/hooks';
import type { ApiPage, MatchSummary } from '../../src/api/types';
import { AppScreen } from '../../src/components/app-screen';
import { MatchCard } from '../../src/components/cards';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  OfflineNotice,
} from '../../src/components/query-state';
import { colors, radius } from '../../src/theme/tokens';

const filters = [
  { value: '', label: 'Все' },
  { value: 'LIVE', label: 'Live' },
  { value: 'UPCOMING', label: 'Скоро' },
  { value: 'FINISHED', label: 'Результаты' },
] as const;

export default function MatchesScreen() {
  const [status, setStatus] = useState<(typeof filters)[number]['value']>('');
  const network = useNetInfo();
  const query = useApiQuery<ApiPage<MatchSummary>>(
    ['matches', status || 'all'],
    queryPath('/matches', { status, pageSize: 30 }),
  );
  return (
    <AppScreen
      eyebrow="MATCH CENTER"
      title="Матчи"
      copy="Live, ближайшие серии и подтверждённые результаты."
      refreshing={query.isFetching && !query.isLoading}
      onRefresh={() => void query.refetch()}
    >
      <OfflineNotice visible={network.isConnected === false} />
      <View style={styles.filters}>
        {filters.map((filter) => (
          <Pressable
            key={filter.value || 'all'}
            onPress={() => setStatus(filter.value)}
            style={[styles.filter, status === filter.value && styles.filterActive]}
          >
            <Text style={[styles.filterText, status === filter.value && styles.filterTextActive]}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {query.isLoading ? <LoadingState rows={5} /> : null}
      {query.isError && !query.data ? <ErrorState retry={() => void query.refetch()} /> : null}
      {query.data?.data.map((match) => (
        <MatchCard key={match.id} match={match} reminder />
      ))}
      {query.data && !query.data.data.length ? (
        <EmptyState title="Матчей нет" copy="Для выбранного статуса пока нет серий." />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 },
  filter: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: colors.canvas },
});
