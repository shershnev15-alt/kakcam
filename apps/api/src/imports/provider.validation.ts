import { createHash } from 'node:crypto';
import type { CanonicalCs2Match, CanonicalCs2PlayerStat } from './provider.types';

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function payloadChecksum(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

export function aggregateCs2PlayerStatistics(
  statistics: CanonicalCs2PlayerStat[],
): CanonicalCs2PlayerStat[] {
  const grouped = new Map<string, CanonicalCs2PlayerStat[]>();
  for (const statistic of statistics) {
    const current = grouped.get(statistic.player.externalId) ?? [];
    current.push(statistic);
    grouped.set(statistic.player.externalId, current);
  }
  return [...grouped.values()].map((items) => {
    const first = items[0]!;
    const rounds = items.reduce((sum, item) => sum + item.rounds, 0);
    const weighted = (field: 'rating' | 'adr' | 'kast' | 'headshotRate') => {
      const available = items.filter((item) => item[field] !== null);
      if (!available.length) return null;
      const weight = available.reduce((sum, item) => sum + item.rounds, 0);
      return (
        available.reduce((sum, item) => sum + item[field]! * item.rounds, 0) / Math.max(1, weight)
      );
    };
    return {
      player: first.player,
      teamExternalId: first.teamExternalId,
      mapKey: 'all',
      kills: items.reduce((sum, item) => sum + item.kills, 0),
      deaths: items.reduce((sum, item) => sum + item.deaths, 0),
      assists: items.reduce((sum, item) => sum + item.assists, 0),
      rounds,
      rating: weighted('rating'),
      adr: weighted('adr'),
      kast: weighted('kast'),
      headshotRate: weighted('headshotRate'),
    };
  });
}

export function validateCanonicalCs2Match(match: CanonicalCs2Match): string[] {
  const issues: string[] = [];
  if (match.gameSlug !== 'cs2') issues.push('Разрешена только дисциплина cs2');
  if (!match.externalId.trim()) issues.push('externalId обязателен');
  if (Number.isNaN(new Date(match.startsAt).getTime())) issues.push('Некорректный startsAt');
  if (Number.isNaN(new Date(match.observedAt).getTime())) issues.push('Некорректный observedAt');
  if (![1, 3, 5].includes(match.bestOf)) issues.push('bestOf должен быть 1, 3 или 5');
  if (match.homeTeam.externalId === match.awayTeam.externalId) {
    issues.push('Участники матча должны различаться');
  }
  if (match.status === 'FINISHED') {
    if (match.homeScore === null || match.awayScore === null) {
      issues.push('Завершённый матч требует итоговый счёт');
    } else if (match.homeScore === match.awayScore) {
      issues.push('Завершённый CS2 матч не может закончиться вничью');
    }
  }
  const orders = new Set<number>();
  for (const map of match.maps) {
    if (orders.has(map.mapOrder)) issues.push(`Дублируется mapOrder ${map.mapOrder}`);
    orders.add(map.mapOrder);
    if (!/^[a-z0-9-]{2,32}$/.test(map.mapKey)) issues.push(`Некорректная карта ${map.mapKey}`);
    for (const score of [map.homeScore, map.awayScore]) {
      if (score !== null && (!Number.isInteger(score) || score < 0)) {
        issues.push(`Некорректный счёт карты ${map.mapOrder}`);
      }
    }
  }
  const statKeys = new Set<string>();
  for (const stat of match.playerStatistics) {
    const key = `${stat.player.externalId}:${stat.mapKey}`;
    if (statKeys.has(key)) issues.push(`Дублируется статистика ${key}`);
    statKeys.add(key);
    for (const [field, value] of Object.entries({
      kills: stat.kills,
      deaths: stat.deaths,
      assists: stat.assists,
      rounds: stat.rounds,
    })) {
      if (!Number.isInteger(value) || value < 0) issues.push(`Некорректное поле ${field} у ${key}`);
    }
    if (![match.homeTeam.externalId, match.awayTeam.externalId].includes(stat.teamExternalId)) {
      issues.push(`Команда статистики ${key} не участвует в матче`);
    }
  }
  return [...new Set(issues)];
}

export function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field}: ожидается объект`);
  }
  return value as Record<string, unknown>;
}

export function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${field}: ожидается массив`);
  return value;
}

export function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field}: ожидается строка`);
  return value.trim();
}

export function number(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${field}: ожидается число`);
  }
  return value;
}

export function nullableNumber(value: unknown, field: string): number | null {
  return value === null || value === undefined ? null : number(value, field);
}

export function slug(value: string): string {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
