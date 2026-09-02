import type {
  CanonicalCs2Match,
  CanonicalEntityRef,
  Cs2MatchStatus,
  Cs2ProviderAdapter,
  StagedProviderRecord,
} from './provider.types';
import { ProviderPayloadError } from './provider.types';
import { array, number, object, slug, text } from './provider.validation';

const fixtures: Record<string, unknown> = {
  'alpha-upcoming-001': {
    generated_at: '2026-09-02T12:00:00.000Z',
    discipline: 'cs2',
    series: [
      {
        match_id: 'alpha-series-001',
        begin_at: '2026-10-12T16:00:00.000Z',
        state: 'scheduled',
        round_name: 'Open qualifier · Round 1',
        format: 3,
        competition: null,
        competitors: [
          { side: 'home', id: 'alpha-team-nrth', name: 'Northern Lights', slug: 'northern-lights' },
          { side: 'away', id: 'alpha-team-nbr', name: 'Neon Bears', slug: 'neon-bears' },
        ],
      },
    ],
  },
  'alpha-overlap-001': {
    generated_at: '2026-09-02T14:00:00.000Z',
    discipline: 'cs2',
    series: [
      {
        match_id: 'alpha-series-overlap-001',
        begin_at: '2026-10-12T16:00:00.000Z',
        state: 'scheduled',
        round_name: 'Open qualifier · Round 1',
        format: 3,
        competition: null,
        competitors: [
          { side: 'home', id: 'alpha-team-nrth', name: 'Northern Lights', slug: 'northern-lights' },
          { side: 'away', id: 'alpha-team-nbr', name: 'Neon Bears', slug: 'neon-bears' },
        ],
      },
    ],
  },
};

function entity(value: unknown, field: string): CanonicalEntityRef {
  const data = object(value, field);
  const name = text(data.name, `${field}.name`);
  return {
    externalId: text(data.id, `${field}.id`),
    name,
    slugHint: typeof data.slug === 'string' ? slug(data.slug) : slug(name),
  };
}

function status(value: unknown): Cs2MatchStatus {
  const normalized = text(value, 'state').toLocaleLowerCase('en-US');
  const statuses: Record<string, Cs2MatchStatus> = {
    scheduled: 'SCHEDULED',
    running: 'LIVE',
    complete: 'FINISHED',
    cancelled: 'CANCELLED',
    postponed: 'POSTPONED',
  };
  const result = statuses[normalized];
  if (!result) throw new Error(`state: неподдерживаемое значение ${normalized}`);
  return result;
}

function bestOf(value: unknown): 1 | 3 | 5 {
  const parsed = number(value, 'format');
  if (parsed !== 1 && parsed !== 3 && parsed !== 5) throw new Error('format: ожидается 1, 3 или 5');
  return parsed;
}

export class Cs2AlphaAdapter implements Cs2ProviderAdapter {
  readonly descriptor = {
    sourceCode: 'cs2-demo-alpha',
    name: 'CS2 Demo Alpha feed',
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
      if (text(root.discipline, 'discipline') !== 'cs2') {
        throw new Error('discipline: разрешено только cs2');
      }
      const observedAt = text(root.generated_at, 'generated_at');
      return array(root.series, 'series').map((item, index) => {
        const match = object(item, `series[${index}]`);
        const competitors = array(match.competitors, `series[${index}].competitors`).map(
          (value, competitorIndex) => object(value, `competitors[${competitorIndex}]`),
        );
        const home = competitors.find((value) => value.side === 'home');
        const away = competitors.find((value) => value.side === 'away');
        if (!home || !away) throw new Error(`series[${index}]: home/away обязательны`);
        const externalId = text(match.match_id, `series[${index}].match_id`);
        const canonical: CanonicalCs2Match = {
          schemaVersion: 1,
          gameSlug: 'cs2',
          externalId,
          observedAt,
          startsAt: text(match.begin_at, `series[${index}].begin_at`),
          status: status(match.state),
          stage: text(match.round_name, `series[${index}].round_name`),
          bestOf: bestOf(match.format),
          tournament: match.competition ? entity(match.competition, 'competition') : null,
          homeTeam: entity(home, 'home'),
          awayTeam: entity(away, 'away'),
          homeScore: null,
          awayScore: null,
          maps: [],
          playerStatistics: [],
        };
        return {
          externalKey: externalId,
          entityType: 'Match',
          rawPayload: item,
          canonicalPayload: canonical,
        };
      });
    } catch (error) {
      throw new ProviderPayloadError([
        error instanceof Error ? error.message : 'Некорректный payload',
      ]);
    }
  }
}
