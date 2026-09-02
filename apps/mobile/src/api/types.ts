export type ApiMeta = {
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  source?: string;
  ratingRun?: { formulaVersion: string; inputCutoff: string };
};

export type ApiPage<T> = { data: T[]; meta: ApiMeta };
export type ApiItem<T> = { data: T; meta?: ApiMeta };

export type Rating = {
  score: number;
  confidence: number;
  rank: number;
  delta7d: number;
  delta30d: number;
  tier: string;
};

export type TeamRef = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
};

export type PlayerSummary = {
  id: string;
  slug: string;
  nickname: string;
  realName: string | null;
  age: number | null;
  verificationLevel: number;
  countryCode: string | null;
  countryName: string | null;
  teamName: string | null;
  teamShortName: string | null;
  currentTeam: TeamRef | null;
  roles: string[];
  rating: Rating | null;
  form: number[];
};

export type MatchSummary = {
  id: string;
  startsAt: string;
  status: 'LIVE' | 'UPCOMING' | 'FINISHED';
  tournament: string;
  tournamentSlug: string | null;
  stage: string;
  bestOf: number;
  homeTeam: TeamRef | null;
  awayTeam: TeamRef | null;
  homeScore: number | null;
  awayScore: number | null;
  verificationLevel: number;
};

export type Achievement = {
  code: string;
  title: string;
  description: string;
  rarity: string;
  progress: number;
  target: number;
  grantedAt: string | null;
};

export type PlayerDetail = PlayerSummary & {
  performance: {
    sampleMatches: number;
    kills: number;
    deaths: number;
    assists: number;
    kd: number;
    adr: number;
    kast: number;
    winRate: number;
    performanceRating: number;
  } | null;
  matches: MatchSummary[];
  achievements: Achievement[];
  similar: PlayerSummary[];
  ratingHistory: Array<{ score: number; confidence: number; rank: number; publishedAt: string }>;
  ratingFactors: Array<{ label?: string; key?: string; value?: number; contribution?: number }>;
};

export type TeamSummary = TeamRef & {
  verificationLevel: number;
  countryCode: string | null;
  countryName: string | null;
  foundedYear: number | null;
  rating: Rating | null;
  form: string[];
};

export type TeamDetail = TeamSummary & {
  roster: PlayerSummary[];
  performance: {
    sampleMatches: number;
    wins: number;
    losses: number;
    mapsWon: number;
    mapsLost: number;
    winRate: number;
    roundDifference: number;
  } | null;
  matches: MatchSummary[];
};

export type MatchDetail = MatchSummary & {
  maps: Array<{
    mapKey: string;
    mapOrder: number;
    homeScore: number | null;
    awayScore: number | null;
    overtime: boolean;
  }>;
  playerStatistics: Array<{
    playerId: string;
    slug: string;
    nickname: string;
    teamId: string;
    kills: number;
    deaths: number;
    assists: number;
    adr: number;
    kast: number;
    rating: number;
  }>;
  checksum: string | null;
  finalizedAt: string | null;
  sourceCode: string | null;
};

export type TournamentSummary = {
  id: string;
  slug: string;
  name: string;
  tier: string;
  mode: string;
  startsAt: string;
  endsAt: string;
  prizePool: number | null;
  currency: string | null;
  status: 'LIVE' | 'UPCOMING' | 'FINISHED';
  participantCount: number;
  matchCount: number;
};

export type TournamentDetail = TournamentSummary & {
  participants: TeamRef[];
  placements: Array<{
    placeFrom: number;
    placeTo: number;
    prizeAmount: number | null;
    team: TeamRef;
  }>;
  matches: MatchSummary[];
};

export type SearchResult = {
  players: PlayerSummary[];
  teams: TeamSummary[];
  total: number;
};

export type TransferSummary = {
  id: string;
  player: { id: string; slug: string; nickname: string };
  fromTeam: TeamRef | null;
  toTeam: TeamRef | null;
  transferDate: string;
  status: string;
  verificationLevel: number;
};
