export type GameAccountProvider = 'STEAM' | 'FACEIT';
export type IntegrationMode = 'DEMO' | 'LIVE';

export type ExternalGameAccount = {
  provider: GameAccountProvider;
  externalId: string;
  handle: string | null;
  profileUrl: string;
  avatarUrl: string | null;
  verified: boolean;
  mode: IntegrationMode;
};

export interface GameAccountAdapter {
  readonly provider: GameAccountProvider;
  readonly mode: IntegrationMode;
  lookup(reference: string): Promise<ExternalGameAccount>;
}

function requiredReference(reference: string, label: string): string {
  const value = reference.trim();
  if (!value) throw new Error(`Укажите ${label}`);
  return value;
}

export class SteamAccountAdapter implements GameAccountAdapter {
  readonly provider = 'STEAM' as const;
  readonly mode: IntegrationMode;

  constructor(
    private readonly apiKey = process.env.STEAM_WEB_API_KEY?.trim(),
    private readonly baseUrl = process.env.STEAM_API_BASE_URL?.trim() ||
      'https://api.steampowered.com',
  ) {
    this.mode = this.apiKey ? 'LIVE' : 'DEMO';
  }

  async lookup(reference: string): Promise<ExternalGameAccount> {
    const steamId = requiredReference(reference, 'Steam ID');
    if (!/^\d{17}$/.test(steamId)) throw new Error('Steam ID должен состоять из 17 цифр');
    if (!this.apiKey) {
      return {
        provider: this.provider,
        externalId: steamId,
        handle: null,
        profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
        avatarUrl: null,
        verified: false,
        mode: 'DEMO',
      };
    }

    const url = new URL('/ISteamUser/GetPlayerSummaries/v0002/', this.baseUrl);
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('steamids', steamId);
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Steam API вернул ${response.status}`);
    const body = (await response.json()) as {
      response?: {
        players?: Array<{
          steamid: string;
          personaname?: string;
          profileurl?: string;
          avatarfull?: string;
        }>;
      };
    };
    const player = body.response?.players?.[0];
    if (!player || player.steamid !== steamId) throw new Error('Steam-аккаунт не найден');
    return {
      provider: this.provider,
      externalId: player.steamid,
      handle: player.personaname ?? null,
      profileUrl: player.profileurl ?? `https://steamcommunity.com/profiles/${steamId}`,
      avatarUrl: player.avatarfull ?? null,
      verified: false,
      mode: 'LIVE',
    };
  }
}

export class FaceitAccountAdapter implements GameAccountAdapter {
  readonly provider = 'FACEIT' as const;
  readonly mode: IntegrationMode;

  constructor(
    private readonly apiKey = process.env.FACEIT_API_KEY?.trim(),
    private readonly baseUrl = process.env.FACEIT_API_BASE_URL?.trim() ||
      'https://open.faceit.com/data/v4',
  ) {
    this.mode = this.apiKey ? 'LIVE' : 'DEMO';
  }

  async lookup(reference: string): Promise<ExternalGameAccount> {
    const nickname = requiredReference(reference, 'FACEIT nickname');
    if (!/^[\p{L}\p{N}_.-]{2,32}$/u.test(nickname)) throw new Error('Некорректный FACEIT nickname');
    if (!this.apiKey) {
      return {
        provider: this.provider,
        externalId: `demo:${nickname.toLocaleLowerCase('en-US')}`,
        handle: nickname,
        profileUrl: `https://www.faceit.com/ru/players/${encodeURIComponent(nickname)}`,
        avatarUrl: null,
        verified: false,
        mode: 'DEMO',
      };
    }

    const url = new URL(`${this.baseUrl.replace(/\/$/, '')}/players`);
    url.searchParams.set('nickname', nickname);
    const response = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) throw new Error(`FACEIT API вернул ${response.status}`);
    const player = (await response.json()) as {
      player_id?: string;
      nickname?: string;
      avatar?: string;
      faceit_url?: string;
    };
    if (!player.player_id) throw new Error('FACEIT-аккаунт не найден');
    return {
      provider: this.provider,
      externalId: player.player_id,
      handle: player.nickname ?? nickname,
      profileUrl:
        player.faceit_url?.replace('{lang}', 'ru') ??
        `https://www.faceit.com/ru/players/${encodeURIComponent(nickname)}`,
      avatarUrl: player.avatar || null,
      verified: false,
      mode: 'LIVE',
    };
  }
}
