import type { PlayerSummary, TeamSummary } from '@arena/types';

export type PageMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  source: 'postgresql';
};

export type PageResult<T> = { data: T[]; meta: PageMeta };

export type PlayerProfile = PlayerSummary & {
  currentTeam: { id: string; slug: string; name: string; shortName: string } | null;
  ratingPublishedAt: string | null;
  similar: PlayerSummary[];
};

export type TeamProfile = TeamSummary & {
  ratingPublishedAt: string | null;
  roster: PlayerSummary[];
};

export type SearchResult = {
  players: PlayerSummary[];
  teams: TeamSummary[];
  total: number;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function apiBase(): string {
  return (
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4000/api/v1'
  );
}

async function api<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    let message = 'Не удалось загрузить данные';
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // The status code remains the canonical error signal.
    }
    throw new ApiError(message, response.status);
  }
  return (await response.json()) as T;
}

function queryString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export async function getPlayers(params: Record<string, string | number | undefined> = {}) {
  return api<PageResult<PlayerSummary>>(`/players${queryString(params)}`);
}

export async function getTeams(params: Record<string, string | number | undefined> = {}) {
  return api<PageResult<TeamSummary>>(`/teams${queryString(params)}`);
}

export async function getPlayer(slug: string) {
  return (await api<{ data: PlayerProfile }>(`/players/${encodeURIComponent(slug)}`)).data;
}

export async function getTeam(slug: string) {
  return (await api<{ data: TeamProfile }>(`/teams/${encodeURIComponent(slug)}`)).data;
}

export async function getPlayerRankings(params: Record<string, string | number | undefined> = {}) {
  return api<PageResult<PlayerSummary>>(`/rankings/players${queryString(params)}`);
}

export async function getTeamRankings(params: Record<string, string | number | undefined> = {}) {
  return api<PageResult<TeamSummary>>(`/rankings/teams${queryString(params)}`);
}

export async function searchDirectory(query: string) {
  return (await api<{ data: SearchResult }>(`/search${queryString({ q: query })}`)).data;
}
