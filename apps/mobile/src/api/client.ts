import Constants from 'expo-constants';

type ExpoExtra = { apiUrl?: string; canonicalWebUrl?: string };

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
export const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? 'http://localhost:4000/api/v1';
export const canonicalWebUrl =
  process.env.EXPO_PUBLIC_WEB_URL ?? extra.canonicalWebUrl ?? 'http://localhost:3000';

export class MobileApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new MobileApiError(payload?.message ?? 'Не удалось загрузить данные', response.status);
  }
  return response.json() as Promise<T>;
}

export const queryKeys = {
  home: ['home'] as const,
  matches: (status?: string) => ['matches', status ?? 'all'] as const,
  playerRankings: (page = 1) => ['rankings', 'players', page] as const,
  teamRankings: (page = 1) => ['rankings', 'teams', page] as const,
  player: (slug: string) => ['players', slug] as const,
  team: (slug: string) => ['teams', slug] as const,
  match: (id: string) => ['matches', id] as const,
  tournament: (slug: string) => ['tournaments', slug] as const,
  search: (query: string) => ['search', query] as const,
};

export function queryPath(path: string, params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const suffix = query.toString();
  return `${path}${suffix ? `?${suffix}` : ''}`;
}
