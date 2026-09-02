import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { queryKeys, queryPath } from '../src/api/client';
import { useApiQuery } from '../src/api/hooks';
import type { ApiItem, SearchResult } from '../src/api/types';
import { AppScreen, SectionHeader } from '../src/components/app-screen';
import { PlayerRow, TeamRow } from '../src/components/cards';
import { EmptyState, ErrorState, LoadingState, OfflineNotice } from '../src/components/query-state';
import { colors, radius, spacing } from '../src/theme/tokens';

export default function SearchScreen() {
  const netInfo = useNetInfo();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 250);
    return () => clearTimeout(timer);
  }, [input]);

  const search = useApiQuery<ApiItem<SearchResult>>(
    queryKeys.search(query),
    queryPath('/search', { q: query }),
    query.length >= 2,
  );
  const result = search.data?.data;

  return (
    <AppScreen eyebrow="DISCOVER" title="Поиск" copy="Игроки и команды в едином реестре." back>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        accessibilityLabel="Поисковый запрос"
        onChangeText={setInput}
        placeholder="Никнейм или название команды"
        placeholderTextColor={colors.faint}
        returnKeyType="search"
        style={styles.input}
        value={input}
      />
      <OfflineNotice visible={netInfo.isConnected === false} />
      {query.length < 2 ? (
        <EmptyState title="Введите минимум 2 символа" copy="Например: frost, NAVI или Spirit." />
      ) : search.isPending ? (
        <LoadingState rows={4} />
      ) : search.isError ? (
        <ErrorState retry={() => void search.refetch()} />
      ) : !result?.total ? (
        <EmptyState title="Ничего не найдено" copy="Попробуйте другой никнейм или команду." />
      ) : (
        <View>
          {result.players.length ? (
            <>
              <SectionHeader title={`Игроки · ${result.players.length}`} />
              {result.players.map((player) => (
                <PlayerRow key={player.id} player={player} />
              ))}
            </>
          ) : null}
          {result.teams.length ? (
            <>
              <SectionHeader title={`Команды · ${result.teams.length}`} />
              {result.teams.map((team) => (
                <TeamRow key={team.id} team={team} />
              ))}
            </>
          ) : null}
        </View>
      )}
      {search.isFetching && !search.isPending ? <Text style={styles.sync}>ОБНОВЛЯЕМ…</Text> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 54,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sync: { color: colors.accent, fontSize: 9, fontWeight: '900', marginTop: spacing.md },
});
