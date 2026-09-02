import { describe, expect, it } from 'vitest';
import { FaceitAccountAdapter, SteamAccountAdapter } from './game-account.adapters';

describe('game account adapters', () => {
  it('keeps Steam explicitly unverified in demo mode', async () => {
    const account = await new SteamAccountAdapter('').lookup('76561198000000000');
    expect(account).toMatchObject({ provider: 'STEAM', mode: 'DEMO', verified: false });
  });

  it('keeps FACEIT explicitly unverified in demo mode', async () => {
    const account = await new FaceitAccountAdapter('').lookup('frostbyte');
    expect(account).toMatchObject({ provider: 'FACEIT', mode: 'DEMO', verified: false });
  });

  it('rejects invalid external identifiers before any request', async () => {
    await expect(new SteamAccountAdapter('').lookup('123')).rejects.toThrow('17 цифр');
    await expect(new FaceitAccountAdapter('').lookup('x')).rejects.toThrow('FACEIT nickname');
  });
});
