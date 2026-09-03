import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameAccountsService } from './game-accounts.service';

afterEach(() => {
  vi.unstubAllEnvs();
});

function service() {
  const prisma = {
    profileClaim: {
      findFirst: vi.fn().mockResolvedValue({
        playerId: 'player-1',
        player: { id: 'player-1', slug: 'frostbyte', nickname: 'frostbyte' },
      }),
    },
    accountLinkTransaction: { create: vi.fn().mockResolvedValue({}) },
  };
  return { gameAccounts: new GameAccountsService(prisma as never), prisma };
}

describe('game account authorization starts', () => {
  it('creates a one-use Steam OpenID request bound to the API callback', async () => {
    vi.stubEnv('STEAM_OPENID_REALM', 'https://api.cyberid.example/');
    vi.stubEnv('API_PUBLIC_URL', 'https://api.cyberid.example');
    const { gameAccounts, prisma } = service();

    const result = await gameAccounts.startSteam('frostbyte', 'user-1');
    const url = new URL(result.authorizeUrl);
    expect(url.origin + url.pathname).toBe('https://steamcommunity.com/openid/login');
    expect(url.searchParams.get('openid.mode')).toBe('checkid_setup');
    expect(url.searchParams.get('openid.realm')).toBe('https://api.cyberid.example/');
    expect(url.searchParams.get('openid.return_to')).toContain(
      'https://api.cyberid.example/api/v1/integrations/steam/callback',
    );
    expect(prisma.accountLinkTransaction.create).toHaveBeenCalledOnce();
  });

  it('uses FACEIT Authorization Code + PKCE S256', async () => {
    vi.stubEnv('FACEIT_OAUTH_CLIENT_ID', 'client-1');
    vi.stubEnv('FACEIT_OAUTH_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('FACEIT_OAUTH_STATE_SECRET', 'state-secret-with-enough-entropy');
    vi.stubEnv('API_PUBLIC_URL', 'https://api.cyberid.example');
    const { gameAccounts } = service();

    const result = await gameAccounts.startFaceit('frostbyte', 'user-1');
    const url = new URL(result.authorizeUrl);
    expect(url.origin).toBe('https://accounts.faceit.com');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(url.searchParams.get('state')).toBeTruthy();
  });
});
