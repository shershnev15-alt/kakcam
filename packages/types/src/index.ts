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
  stage: string;
  bestOf: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
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
