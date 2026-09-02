import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cancelMatchReminder, scheduleMatchReminder } from '../notifications/adapter';
import {
  initialEngagementState,
  parseEngagementState,
  toggleFavoriteState,
  type EngagementState,
  type Favorite,
  type FavoriteKind,
  type MatchReminder,
  type NotificationPreferences,
} from './model';

const STORAGE_KEY = 'arena.engagement.v1';

type EngagementContextValue = {
  state: EngagementState;
  hydrated: boolean;
  isFavorite: (kind: FavoriteKind, slug: string) => boolean;
  toggleFavorite: (favorite: Omit<Favorite, 'createdAt'>) => void;
  isReminder: (matchId: string) => boolean;
  toggleReminder: (input: { matchId: string; label: string; startsAt: string }) => Promise<void>;
  setPreference: (key: keyof NotificationPreferences, value: boolean) => void;
  markAllRead: () => void;
};

const EngagementContext = createContext<EngagementContextValue | null>(null);

function persist(state: EngagementState) {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function activity(
  state: EngagementState,
  input: Pick<EngagementState['inbox'][number], 'topic' | 'title' | 'body' | 'url'>,
) {
  return {
    ...state,
    inbox: [
      {
        ...input,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
        read: false,
      },
      ...state.inbox,
    ].slice(0, 40),
  };
}

export function EngagementProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialEngagementState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => setState(parseEngagementState(value)))
      .catch(() => setState(initialEngagementState))
      .finally(() => setHydrated(true));
  }, []);

  function commit(update: (current: EngagementState) => EngagementState) {
    setState((current) => {
      const next = update(current);
      void persist(next);
      return next;
    });
  }

  const value = useMemo<EngagementContextValue>(
    () => ({
      state,
      hydrated,
      isFavorite: (kind, slug) =>
        state.favorites.some((item) => item.kind === kind && item.slug === slug),
      toggleFavorite: (favorite) => {
        const exists = state.favorites.some(
          (item) => item.kind === favorite.kind && item.slug === favorite.slug,
        );
        commit((current) => {
          const next = toggleFavoriteState(current, {
            ...favorite,
            createdAt: new Date().toISOString(),
          });
          return activity(next, {
            topic: 'favorite',
            title: exists ? 'Удалено из избранного' : 'Добавлено в избранное',
            body: favorite.label,
            url: `/${favorite.kind === 'player' ? 'players' : 'teams'}/${favorite.slug}`,
          });
        });
      },
      isReminder: (matchId) => state.reminders.some((item) => item.matchId === matchId),
      toggleReminder: async (input) => {
        const existing = state.reminders.find((item) => item.matchId === input.matchId);
        if (existing) {
          await cancelMatchReminder(existing.notificationId);
          commit((current) => ({
            ...current,
            reminders: current.reminders.filter((item) => item.matchId !== input.matchId),
          }));
          return;
        }
        const notificationId = await scheduleMatchReminder({
          matchId: input.matchId,
          title: input.label,
          startsAt: input.startsAt,
        });
        const reminder: MatchReminder = {
          ...input,
          notificationId,
          createdAt: new Date().toISOString(),
        };
        commit((current) =>
          activity(
            { ...current, reminders: [reminder, ...current.reminders] },
            {
              topic: 'match-reminder',
              title: 'Напоминание включено',
              body: input.label,
              url: `/matches/${input.matchId}`,
            },
          ),
        );
      },
      setPreference: (key, enabled) =>
        commit((current) => ({
          ...current,
          preferences: { ...current.preferences, [key]: enabled },
        })),
      markAllRead: () =>
        commit((current) => ({
          ...current,
          inbox: current.inbox.map((item) => ({ ...item, read: true })),
        })),
    }),
    [hydrated, state],
  );

  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
}

export function useEngagement() {
  const value = useContext(EngagementContext);
  if (!value) throw new Error('useEngagement must be used inside EngagementProvider');
  return value;
}
