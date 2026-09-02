import { describe, expect, it } from 'vitest';
import { resources } from '../lib/resources';
import { commandsFor } from './admin-console';

describe('admin command registry', () => {
  it('exposes every operational module in navigation', () => {
    expect(resources.map((item) => item.slug)).toEqual(
      expect.arrayContaining([
        'players',
        'teams',
        'matches',
        'tournaments',
        'verification',
        'assertions',
        'imports',
        'reports',
        'users',
        'achievements',
        'ratings',
        'audit',
      ]),
    );
  });

  it('requires a reason and preview for destructive archive commands', () => {
    const archive = commandsFor('players', undefined).find((item) => item.id === 'archive-player');
    expect(archive).toMatchObject({ selection: true, reason: true, danger: true });
  });

  it('keeps immutable audit read-only', () => {
    expect(commandsFor('audit', undefined)).toEqual([]);
  });

  it('exposes only the two approved CS2 provider staging commands', () => {
    const providerCommands = commandsFor('imports', undefined).filter((item) =>
      item.id.startsWith('stage-'),
    );
    expect(providerCommands).toHaveLength(2);
    expect(providerCommands.map((item) => item.payload)).toEqual([
      expect.objectContaining({ sourceCode: 'cs2-demo-alpha' }),
      expect.objectContaining({ sourceCode: 'cs2-demo-bravo' }),
    ]);
  });
});
