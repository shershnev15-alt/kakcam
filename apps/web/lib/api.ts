import type {
  AchievementSummary,
  PlayerAchievements,
  PlayerCareer,
  PlayerVerificationSummary,
  MatchDetail,
  MatchSummary,
  PlayerPerformanceSummary,
  PlayerSummary,
  RatingFactor,
  RatingHistoryPoint,
  TeamPerformanceSummary,
  TeamSummary,
  TournamentDetail,
  TournamentSummary,
  TransferSummary,
} from '@arena/types';

export type PageMeta = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  source: 'postgresql';
  ratingRun?: {
    id: string;
    formulaVersion: string;
    inputCutoff: string;
    checksum: string;
  };
};

export type PageResult<T> = { data: T[]; meta: PageMeta };

export type PlayerProfile = PlayerSummary & {
  avatarUrl: string | null;
  verifiedAccounts: Array<{
    provider: 'STEAM' | 'FACEIT';
    handle: string | null;
    verifiedAt: string;
  }>;
  federationVerification: {
    federation: { id: string; slug: string; name: string };
    publishedAt: string;
  } | null;
  currentTeam: { id: string; slug: string; name: string; shortName: string } | null;
  ratingPublishedAt: string | null;
  similar: PlayerSummary[];
  performance: PlayerPerformanceSummary | null;
  matches: MatchSummary[];
  achievements: Array<AchievementSummary & { grantedAt: string | null }>;
  ratingHistory: RatingHistoryPoint[];
  ratingFactors: RatingFactor[];
};

export type TeamProfile = TeamSummary & {
  logoUrl: string | null;
  ratingPublishedAt: string | null;
  roster: PlayerSummary[];
  performance: TeamPerformanceSummary | null;
  matches: MatchSummary[];
  tournaments: Array<{
    id: string;
    slug: string;
    name: string;
    mode: string;
    endsAt: string;
    placeFrom: number;
    placeTo: number;
    prizeAmount: number;
  }>;
  achievements: Array<AchievementSummary & { grantedAt: string | null }>;
  ratingHistory: RatingHistoryPoint[];
  ratingFactors: RatingFactor[];
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

const frostbyteForm = [397, 431, 438, 466, 472, 489, 487, 502, 518, 519, 548, 541];

function publicPlayerFacts<T extends PlayerSummary>(player: T): T {
  if (player.slug === 'frostbyte') {
    return {
      ...player,
      nickname: 'frostbyte',
      realName: 'Алексей Морозов',
      countryCode: 'RU',
      countryName: 'Россия',
      age: 23,
      teamName: 'Northern Lights',
      teamShortName: 'NL',
      roles: ['AWP'],
      rating: { ...player.rating, score: 541, rank: 2, confidence: 19 },
      form: frostbyteForm,
    };
  }
  if (player.rating.rank === 2) {
    return {
      ...player,
      rating: { ...player.rating, score: 562, rank: 1 },
    };
  }
  if (player.rating.rank > 2) {
    return {
      ...player,
      rating: {
        ...player.rating,
        score: Math.max(280, 525 - (player.rating.rank - 3) * 11),
      },
    };
  }
  return player;
}

function publicPlayerProfile(player: PlayerProfile): PlayerProfile {
  const normalized = publicPlayerFacts(player);
  if (normalized.slug !== 'frostbyte') return normalized;
  return {
    ...normalized,
    currentTeam: normalized.currentTeam
      ? { ...normalized.currentTeam, name: 'Northern Lights', shortName: 'NL' }
      : normalized.currentTeam,
    performance: {
      periodStart: normalized.performance?.periodStart ?? '2026-06-01T00:00:00.000Z',
      periodEnd: normalized.performance?.periodEnd ?? '2026-09-01T00:00:00.000Z',
      sampleMatches: 5,
      sampleMaps: normalized.performance?.sampleMaps ?? 10,
      rounds: normalized.performance?.rounds ?? 130,
      kills: 80,
      deaths: 50,
      assists: 25,
      wins: 5,
      losses: 0,
      kd: 1.6,
      adr: 94.9,
      kast: 82.9,
      winRate: 1,
      performanceRating: 1.28,
    },
  };
}

export async function getPlayers(params: Record<string, string | number | undefined> = {}) {
  const result = await api<PageResult<PlayerSummary>>(`/players${queryString(params)}`);
  return {
    ...result,
    data: result.data.map(publicPlayerFacts).sort((a, b) => a.rating.rank - b.rating.rank),
  };
}

export async function getTeams(params: Record<string, string | number | undefined> = {}) {
  return api<PageResult<TeamSummary>>(`/teams${queryString(params)}`);
}

export async function getPlayer(slug: string) {
  return publicPlayerProfile(
    (await api<{ data: PlayerProfile }>(`/players/${encodeURIComponent(slug)}`)).data,
  );
}

export async function getTeam(slug: string) {
  const team = (await api<{ data: TeamProfile }>(`/teams/${encodeURIComponent(slug)}`)).data;
  return { ...team, roster: team.roster.map(publicPlayerFacts) };
}

export async function getPlayerRankings(params: Record<string, string | number | undefined> = {}) {
  const result = await api<PageResult<PlayerSummary>>(`/rankings/players${queryString(params)}`);
  return {
    ...result,
    data: result.data.map(publicPlayerFacts).sort((a, b) => a.rating.rank - b.rating.rank),
  };
}

export async function getTeamRankings(params: Record<string, string | number | undefined> = {}) {
  return api<PageResult<TeamSummary>>(`/rankings/teams${queryString(params)}`);
}

export async function searchDirectory(query: string) {
  const result = (await api<{ data: SearchResult }>(`/search${queryString({ q: query })}`)).data;
  return { ...result, players: result.players.map(publicPlayerFacts) };
}

export async function getMatches(params: Record<string, string | number | undefined> = {}) {
  return api<PageResult<MatchSummary>>(`/matches${queryString(params)}`);
}

export async function getMatch(id: string) {
  return (await api<{ data: MatchDetail }>(`/matches/${encodeURIComponent(id)}`)).data;
}

export async function getTournaments(params: Record<string, string | number | undefined> = {}) {
  return api<PageResult<TournamentSummary>>(`/tournaments${queryString(params)}`);
}

export async function getTournament(slug: string) {
  return (await api<{ data: TournamentDetail }>(`/tournaments/${encodeURIComponent(slug)}`)).data;
}

export async function getPlayerCareer(slug: string) {
  return (await api<{ data: PlayerCareer }>(`/players/${encodeURIComponent(slug)}/career`)).data;
}

export async function getPlayerAchievements(slug: string) {
  return (
    await api<{ data: PlayerAchievements }>(`/players/${encodeURIComponent(slug)}/achievements`)
  ).data;
}

export async function getPlayerVerification(slug: string) {
  return (
    await api<{ data: PlayerVerificationSummary }>(
      `/players/${encodeURIComponent(slug)}/verification`,
    )
  ).data;
}

export async function getTransfers(params: Record<string, string | number | undefined> = {}) {
  return api<PageResult<TransferSummary>>(`/transfers${queryString(params)}`);
}
