export type FavoriteKind = 'player' | 'team';

export type Favorite = {
  kind: FavoriteKind;
  id: string;
  slug: string;
  label: string;
  subtitle: string;
  createdAt: string;
};

export type MatchReminder = {
  matchId: string;
  label: string;
  startsAt: string;
  notificationId: string;
  createdAt: string;
};

export type InboxItem = {
  id: string;
  topic: 'favorite' | 'match-reminder' | 'rating' | 'tournament';
  title: string;
  body: string;
  url: string | null;
  createdAt: string;
  read: boolean;
};

export type NotificationPreferences = {
  matchReminders: boolean;
  ratingChanges: boolean;
  tournamentUpdates: boolean;
};

export type EngagementState = {
  version: 1;
  favorites: Favorite[];
  reminders: MatchReminder[];
  inbox: InboxItem[];
  preferences: NotificationPreferences;
};

export const initialEngagementState: EngagementState = {
  version: 1,
  favorites: [],
  reminders: [],
  inbox: [],
  preferences: {
    matchReminders: true,
    ratingChanges: true,
    tournamentUpdates: false,
  },
};

export function toggleFavoriteState(state: EngagementState, favorite: Favorite): EngagementState {
  const exists = state.favorites.some(
    (item) => item.kind === favorite.kind && item.slug === favorite.slug,
  );
  const favorites = exists
    ? state.favorites.filter(
        (item) => !(item.kind === favorite.kind && item.slug === favorite.slug),
      )
    : [favorite, ...state.favorites];
  return { ...state, favorites };
}

export function parseEngagementState(value: string | null): EngagementState {
  if (!value) return initialEngagementState;
  try {
    const parsed = JSON.parse(value) as Partial<EngagementState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.favorites)) return initialEngagementState;
    return {
      ...initialEngagementState,
      ...parsed,
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
      inbox: Array.isArray(parsed.inbox) ? parsed.inbox : [],
      preferences: { ...initialEngagementState.preferences, ...parsed.preferences },
    };
  } catch {
    return initialEngagementState;
  }
}
