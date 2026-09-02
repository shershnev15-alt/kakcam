import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../src/components/app-screen';
import { Avatar } from '../src/components/cards';
import { EmptyState } from '../src/components/query-state';
import { useEngagement } from '../src/engagement/provider';
import { colors, radius, spacing } from '../src/theme/tokens';

export default function FavoritesScreen() {
  const router = useRouter();
  const { state, toggleFavorite } = useEngagement();

  return (
    <AppScreen
      eyebrow="YOUR LIST"
      title="Избранное"
      copy="Игроки и команды сохранены локально и доступны без регистрации."
      back
    >
      {!state.favorites.length ? (
        <EmptyState
          title="Список пока пуст"
          copy="Добавляйте игроков и команды с их публичных страниц."
        />
      ) : (
        state.favorites.map((favorite) => (
          <View key={`${favorite.kind}-${favorite.slug}`} style={styles.row}>
            <Pressable
              accessibilityRole="link"
              onPress={() =>
                router.push(
                  `/${favorite.kind === 'player' ? 'players' : 'teams'}/${favorite.slug}` as Href,
                )
              }
              style={styles.identity}
            >
              <Avatar label={favorite.label} />
              <View style={styles.grow}>
                <Text style={styles.name}>{favorite.label}</Text>
                <Text style={styles.copy}>{favorite.subtitle}</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityLabel={`Удалить ${favorite.label} из избранного`}
              accessibilityRole="button"
              onPress={() => toggleFavorite(favorite)}
              style={styles.remove}
            >
              <Text style={styles.removeText}>×</Text>
            </Pressable>
          </View>
        ))
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    marginBottom: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  name: { color: colors.text, fontSize: 15, fontWeight: '800' },
  copy: { color: colors.muted, fontSize: 11, marginTop: 4 },
  remove: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.elevated,
  },
  removeText: { color: colors.muted, fontSize: 23, lineHeight: 25 },
});
