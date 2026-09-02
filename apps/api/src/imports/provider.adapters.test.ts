import { describe, expect, it } from 'vitest';
import { Cs2AlphaAdapter } from './cs2-alpha.adapter';
import { Cs2BravoAdapter } from './cs2-bravo.adapter';
import {
  aggregateCs2PlayerStatistics,
  payloadChecksum,
  stableJson,
  validateCanonicalCs2Match,
} from './provider.validation';

describe('CS2 provider adapters', () => {
  it('normalizes two independent payload shapes into the same contract', async () => {
    const alpha = new Cs2AlphaAdapter();
    const bravo = new Cs2BravoAdapter();
    const alphaRecord = alpha.normalize(await alpha.fetch('alpha-upcoming-001'))[0]!;
    const bravoRecord = bravo.normalize(await bravo.fetch('bravo-result-001'))[0]!;

    expect(alphaRecord.canonicalPayload.gameSlug).toBe('cs2');
    expect(alphaRecord.canonicalPayload.status).toBe('SCHEDULED');
    expect(bravoRecord.canonicalPayload.gameSlug).toBe('cs2');
    expect(bravoRecord.canonicalPayload.status).toBe('FINISHED');
    expect(bravoRecord.canonicalPayload.maps).toHaveLength(2);
    expect(bravoRecord.canonicalPayload.playerStatistics).toHaveLength(4);
    expect(validateCanonicalCs2Match(alphaRecord.canonicalPayload)).toEqual([]);
    expect(validateCanonicalCs2Match(bravoRecord.canonicalPayload)).toEqual([]);
  });

  it('produces a stable checksum regardless of object key order', () => {
    expect(stableJson({ b: 2, a: 1 })).toBe(stableJson({ a: 1, b: 2 }));
    expect(payloadChecksum({ b: 2, a: 1 })).toBe(payloadChecksum({ a: 1, b: 2 }));
  });

  it('builds a deterministic series aggregate while preserving map facts', async () => {
    const adapter = new Cs2BravoAdapter();
    const record = adapter.normalize(await adapter.fetch('bravo-result-001'))[0]!;
    const aggregate = aggregateCs2PlayerStatistics(record.canonicalPayload.playerStatistics);
    expect(aggregate).toHaveLength(2);
    expect(aggregate[0]).toMatchObject({ mapKey: 'all', kills: 45, deaths: 26, rounds: 44 });
    expect(record.canonicalPayload.playerStatistics).toHaveLength(4);
  });

  it('rejects cross-discipline and structurally invalid canonical facts', async () => {
    const adapter = new Cs2AlphaAdapter();
    expect(() => adapter.normalize({ discipline: 'dota2', generated_at: 'x', series: [] })).toThrow(
      'discipline: разрешено только cs2',
    );
    const record = adapter.normalize(await adapter.fetch('alpha-upcoming-001'))[0]!;
    expect(
      validateCanonicalCs2Match({
        ...record.canonicalPayload,
        awayTeam: record.canonicalPayload.homeTeam,
      }),
    ).toContain('Участники матча должны различаться');
  });
});
