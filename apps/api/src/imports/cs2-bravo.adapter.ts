import type {
  CanonicalCs2Map,
  CanonicalCs2Match,
  CanonicalCs2PlayerStat,
  CanonicalEntityRef,
  Cs2ProviderAdapter,
  StagedProviderRecord,
} from './provider.types';
import { ProviderPayloadError } from './provider.types';
import { array, nullableNumber, number, object, slug, text } from './provider.validation';

const fixtures: Record<string, unknown> = {
  'bravo-result-001': {
    collectedAt: '2026-09-02T13:00:00.000Z',
    fixture: {
      uid: 'bravo-fixture-001',
      videogame: { slug: 'counter-strike-2' },
      scheduledAt: '2026-08-15T17:00:00.000Z',
      state: 'complete',
      format: 'bo3',
      phase: 'Invitational · Final',
    },
    participants: [
      { slot: 1, uid: 'bravo-nrth', display: 'Northern Lights', canonicalSlug: 'northern-lights' },
      { slot: 2, uid: 'bravo-vln', display: 'Volna', canonicalSlug: 'volna' },
    ],
    result: { home: 2, away: 0 },
    games: [
      { sequence: 1, map: 'Mirage', home: 13, away: 8 },
      { sequence: 2, map: 'Nuke', home: 13, away: 10 },
    ],
    boxscore: [
      {
        player: { uid: 'bravo-frostbyte', nickname: 'frostbyte', canonicalSlug: 'frostbyte' },
        teamUid: 'bravo-nrth',
        map: 'Mirage',
        kills: 21,
        deaths: 12,
        assists: 5,
        rounds: 21,
        rating: 1.31,
        adr: 91.4,
        kast: 80.9,
        headshots: 47.6,
      },
      {
        player: { uid: 'bravo-veles', nickname: 'veles', canonicalSlug: 'veles' },
        teamUid: 'bravo-vln',
        map: 'Mirage',
        kills: 13,
        deaths: 19,
        assists: 3,
        rounds: 21,
        rating: 0.86,
        adr: 69.2,
        kast: 66.7,
        headshots: 53.8,
      },
      {
        player: { uid: 'bravo-frostbyte', nickname: 'frostbyte', canonicalSlug: 'frostbyte' },
        teamUid: 'bravo-nrth',
        map: 'Nuke',
        kills: 24,
        deaths: 14,
        assists: 4,
        rounds: 23,
        rating: 1.38,
        adr: 96.1,
        kast: 82.6,
        headshots: 45.8,
      },
      {
        player: { uid: 'bravo-veles', nickname: 'veles', canonicalSlug: 'veles' },
        teamUid: 'bravo-vln',
        map: 'Nuke',
        kills: 15,
        deaths: 21,
        assists: 6,
        rounds: 23,
        rating: 0.91,
        adr: 72.5,
        kast: 69.6,
        headshots: 60,
      },
    ],
  },
};

function entity(value: unknown, field: string): CanonicalEntityRef {
  const data = object(value, field);
  const name = text(data.display ?? data.nickname, `${field}.display`);
  return {
    externalId: text(data.uid, `${field}.uid`),
    name,
    slugHint: slug(text(data.canonicalSlug ?? name, `${field}.canonicalSlug`)),
  };
}

function maps(value: unknown): CanonicalCs2Map[] {
  return array(value, 'games').map((item, index) => {
    const data = object(item, `games[${index}]`);
    const homeScore = number(data.home, `games[${index}].home`);
    const awayScore = number(data.away, `games[${index}].away`);
    return {
      mapKey: slug(text(data.map, `games[${index}].map`)),
      mapOrder: number(data.sequence, `games[${index}].sequence`),
      homeScore,
      awayScore,
      overtime: Math.max(homeScore, awayScore) > 13,
      status: 'FINISHED',
    };
  });
}

function playerStats(value: unknown): CanonicalCs2PlayerStat[] {
  return array(value, 'boxscore').map((item, index) => {
    const data = object(item, `boxscore[${index}]`);
    return {
      player: entity(data.player, `boxscore[${index}].player`),
      teamExternalId: text(data.teamUid, `boxscore[${index}].teamUid`),
      mapKey: slug(text(data.map, `boxscore[${index}].map`)),
      kills: number(data.kills, `boxscore[${index}].kills`),
      deaths: number(data.deaths, `boxscore[${index}].deaths`),
      assists: number(data.assists, `boxscore[${index}].assists`),
      rounds: number(data.rounds, `boxscore[${index}].rounds`),
      rating: nullableNumber(data.rating, `boxscore[${index}].rating`),
      adr: nullableNumber(data.adr, `boxscore[${index}].adr`),
      kast: nullableNumber(data.kast, `boxscore[${index}].kast`),
      headshotRate: nullableNumber(data.headshots, `boxscore[${index}].headshots`),
    };
  });
}

export class Cs2BravoAdapter implements Cs2ProviderAdapter {
  readonly descriptor = {
    sourceCode: 'cs2-demo-bravo',
    name: 'CS2 Demo Bravo feed',
    gameSlug: 'cs2',
    mode: 'MOCK',
    fixtureKeys: Object.keys(fixtures),
  } as const;

  async fetch(externalKey: string): Promise<unknown> {
    const payload = fixtures[externalKey];
    if (!payload) throw new ProviderPayloadError([`Fixture ${externalKey} не найден`]);
    return structuredClone(payload);
  }

  normalize(payload: unknown): StagedProviderRecord[] {
    try {
      const root = object(payload, 'payload');
      const fixture = object(root.fixture, 'fixture');
      const game = object(fixture.videogame, 'fixture.videogame');
      if (text(game.slug, 'fixture.videogame.slug') !== 'counter-strike-2') {
        throw new Error('fixture.videogame.slug: разрешено только counter-strike-2');
      }
      const participants = array(root.participants, 'participants')
        .map((item, index) => object(item, `participants[${index}]`))
        .sort((left, right) => number(left.slot, 'slot') - number(right.slot, 'slot'));
      if (participants.length !== 2) throw new Error('participants: ожидаются две команды');
      const result = object(root.result, 'result');
      const externalId = text(fixture.uid, 'fixture.uid');
      const format = text(fixture.format, 'fixture.format').toLocaleLowerCase('en-US');
      if (!['bo1', 'bo3', 'bo5'].includes(format))
        throw new Error('fixture.format: некорректный формат');
      const canonical: CanonicalCs2Match = {
        schemaVersion: 1,
        gameSlug: 'cs2',
        externalId,
        observedAt: text(root.collectedAt, 'collectedAt'),
        startsAt: text(fixture.scheduledAt, 'fixture.scheduledAt'),
        status: 'FINISHED',
        stage: text(fixture.phase, 'fixture.phase'),
        bestOf: Number(format.slice(2)) as 1 | 3 | 5,
        tournament: null,
        homeTeam: entity(participants[0], 'participants[0]'),
        awayTeam: entity(participants[1], 'participants[1]'),
        homeScore: number(result.home, 'result.home'),
        awayScore: number(result.away, 'result.away'),
        maps: maps(root.games),
        playerStatistics: playerStats(root.boxscore),
      };
      return [
        {
          externalKey: externalId,
          entityType: 'Match',
          rawPayload: payload,
          canonicalPayload: canonical,
        },
      ];
    } catch (error) {
      throw new ProviderPayloadError([
        error instanceof Error ? error.message : 'Некорректный payload',
      ]);
    }
  }
}
