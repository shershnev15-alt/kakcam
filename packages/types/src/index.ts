export type VerificationLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type GameSlug =
  | 'cs2'
  | 'dota-2'
  | 'valorant'
  | 'league-of-legends'
  | 'pubg'
  | 'mobile-legends';

export interface RatingSnapshot {
  score: number;
  confidence: number;
  rank: number;
  delta7d: number;
  delta30d: number;
  tier: 'Rookie' | 'Challenger' | 'Contender' | 'Pro' | 'Elite' | 'Master' | 'Legend';
}

export interface PlayerSummary {
  id: string;
  slug: string;
  nickname: string;
  realName?: string;
  countryCode: string;
  countryName: string;
  age?: number;
  teamId?: string;
  teamName?: string;
  teamShortName?: string;
  roles: string[];
  verificationLevel: VerificationLevel;
  rating: RatingSnapshot;
  form: number[];
}

export interface TeamSummary {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  countryCode: string;
  countryName: string;
  foundedYear: number;
  verificationLevel: VerificationLevel;
  rating: RatingSnapshot;
  form: Array<'W' | 'L'>;
}

export interface MatchSummary {
  id: string;
  startsAt: string;
  status: 'LIVE' | 'UPCOMING' | 'FINISHED';
  tournament: string;
  tournamentSlug?: string;
  stage: string;
  bestOf: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  homeScore?: number;
  awayScore?: number;
  verificationLevel: VerificationLevel;
}

export interface MatchTeam {
  id: string;
  slug: string;
  name: string;
  shortName: string;
}

export interface MatchMapSummary {
  mapKey: string;
  mapOrder: number;
  homeScore?: number;
  awayScore?: number;
  overtime: boolean;
  status: string;
}

export interface PlayerMatchPerformance {
  playerId: string;
  nickname: string;
  slug: string;
  teamId?: string;
  kills: number;
  deaths: number;
  assists: number;
  rating: number;
  adr: number;
  kast: number;
}

export interface MatchDetail extends MatchSummary {
  maps: MatchMapSummary[];
  playerStatistics: PlayerMatchPerformance[];
  sourceCode: string;
  observedAt: string;
  finalizedAt?: string;
}

export interface TournamentSummary {
  id: string;
  slug: string;
  name: string;
  tier: 'Regional' | 'National' | 'International';
  mode: 'LAN' | 'Online' | 'Hybrid';
  startsAt: string;
  endsAt: string;
  prizePool: number;
  currency: 'USD';
  status: 'UPCOMING' | 'LIVE' | 'FINISHED';
  participantCount: number;
  matchCount: number;
}

export interface TournamentPlacementSummary {
  placeFrom: number;
  placeTo: number;
  prizeAmount?: number;
  team: MatchTeam;
}

export interface TournamentDetail extends TournamentSummary {
  participants: MatchTeam[];
  placements: TournamentPlacementSummary[];
  matches: MatchSummary[];
}

export interface AchievementSummary {
  code: string;
  title: string;
  description: string;
  category: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  progress: number;
  target: number;
}

export interface AchievementDetail extends AchievementSummary {
  status: 'LOCKED' | 'PROVISIONAL' | 'GRANTED' | 'REVOKED';
  grantedAt?: string;
  firstQualifiedAt?: string;
  verificationLevel: VerificationLevel;
  ruleVersion: number;
  evidence?: unknown;
}

export interface CareerPeriod {
  id: string;
  team: MatchTeam | null;
  game: { slug: string; name: string };
  role?: string;
  startedAt: string;
  endedAt?: string;
  verificationLevel: VerificationLevel;
  evidence?: unknown;
}

export interface TransferSummary {
  id: string;
  player?: { id: string; slug: string; nickname: string };
  fromTeam: MatchTeam | null;
  toTeam: MatchTeam | null;
  transferDate: string;
  status: 'REPORTED' | 'CONFIRMED';
  verificationLevel: VerificationLevel;
  evidence?: unknown;
  checksum: string;
}

export interface PlayerCareer {
  player: { id: string; slug: string; nickname: string };
  periods: CareerPeriod[];
  transfers: TransferSummary[];
}

export interface PlayerAchievements {
  player: { id: string; slug: string; nickname: string };
  achievements: AchievementDetail[];
}

export interface PlayerVerificationSummary {
  player: { id: string; slug: string; nickname: string };
  level: VerificationLevel;
  label: string;
  approvedClaim: boolean;
  effectiveAssertions: number;
  verifications: Array<{
    id: string;
    level: number;
    method: string;
    status: string;
    validUntil?: string;
    decidedAt?: string;
    evidence: Array<{ kind: string; visibility: string; createdAt: string }>;
  }>;
}

export interface PlayerPerformanceSummary {
  periodStart: string;
  periodEnd: string;
  sampleMatches: number;
  sampleMaps: number;
  rounds: number;
  kills: number;
  deaths: number;
  assists: number;
  wins: number;
  losses: number;
  kd: number;
  adr: number;
  kast: number;
  winRate: number;
  performanceRating: number;
}

export interface TeamPerformanceSummary {
  periodStart: string;
  periodEnd: string;
  sampleMatches: number;
  wins: number;
  losses: number;
  mapsWon: number;
  mapsLost: number;
  roundsWon: number;
  roundsLost: number;
  winRate: number;
  roundDifference: number;
}

export interface RatingFactor {
  key: string;
  label: string;
  contribution: number;
}

export interface RatingHistoryPoint {
  score: number;
  confidence: number;
  rank: number;
  publishedAt: string;
  formulaVersion: string;
  factors: RatingFactor[];
}
