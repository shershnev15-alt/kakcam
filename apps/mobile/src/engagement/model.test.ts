import { describe, expect, it } from 'vitest';
import {
  initialEngagementState,
  parseEngagementState,
  toggleFavoriteState,
  type Favorite,
} from './model';

const favorite: Favorite = {
  kind: 'player',
  id: 'player-1',
  slug: 'frostbyte',
  label: 'frostbyte',
  subtitle: 'Northern Lights',
  createdAt: '2026-09-02T00:00:00.000Z',
};

describe('engagement state', () => {
  it('adds and removes the same favorite deterministically', () => {
    const added = toggleFavoriteState(initialEngagementState, favorite);
    expect(added.favorites).toHaveLength(1);
    expect(toggleFavoriteState(added, favorite).favorites).toEqual([]);
  });

  it('falls back safely for malformed persisted state', () => {
    expect(parseEngagementState('{broken')).toEqual(initialEngagementState);
    expect(parseEngagementState(JSON.stringify({ version: 0 }))).toEqual(initialEngagementState);
  });
});
