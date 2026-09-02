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
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers },
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
  player: (slug: string) => ['players', slug] as const,
};
