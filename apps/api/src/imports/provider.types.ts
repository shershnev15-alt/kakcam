export type Cs2MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED' | 'POSTPONED';

export type CanonicalEntityRef = {
  externalId: string;
  name: string;
  slugHint: string;
};

export type CanonicalCs2Map = {
  mapKey: string;
  mapOrder: number;
  homeScore: number | null;
  awayScore: number | null;
  overtime: boolean;
  status: 'SCHEDULED' | 'FINISHED';
};

export type CanonicalCs2PlayerStat = {
  player: CanonicalEntityRef;
  teamExternalId: string;
  mapKey: string;
  kills: number;
  deaths: number;
  assists: number;
  rounds: number;
  rating: number | null;
  adr: number | null;
  kast: number | null;
  headshotRate: number | null;
};

export type CanonicalCs2Match = {
  schemaVersion: 1;
  gameSlug: 'cs2';
  externalId: string;
  observedAt: string;
  startsAt: string;
  status: Cs2MatchStatus;
  stage: string;
  bestOf: 1 | 3 | 5;
  tournament: CanonicalEntityRef | null;
  homeTeam: CanonicalEntityRef;
  awayTeam: CanonicalEntityRef;
  homeScore: number | null;
  awayScore: number | null;
  maps: CanonicalCs2Map[];
  playerStatistics: CanonicalCs2PlayerStat[];
};

export type StagedProviderRecord = {
  externalKey: string;
  entityType: 'Match';
  rawPayload: unknown;
  canonicalPayload: CanonicalCs2Match;
};

export type ProviderDescriptor = {
  sourceCode: string;
  name: string;
  gameSlug: 'cs2';
  mode: 'MOCK';
  fixtureKeys: string[];
};

export interface Cs2ProviderAdapter {
  readonly descriptor: ProviderDescriptor;
  fetch(externalKey: string): Promise<unknown>;
  normalize(payload: unknown): StagedProviderRecord[];
}

export class ProviderPayloadError extends Error {
  constructor(readonly issues: string[]) {
    super(issues.join('; '));
  }
}
