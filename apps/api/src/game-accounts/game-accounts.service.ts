import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { HttpRequest } from '../http.types';
import { PrismaService } from '../prisma.service';
import { SteamAccountAdapter } from './game-account.adapters';

type LinkProvider = 'STEAM' | 'FACEIT';
type CallbackQuery = Record<string, string | undefined>;

const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';
const FACEIT_AUTHORIZE_ENDPOINT = 'https://accounts.faceit.com';
const FACEIT_TOKEN_ENDPOINT = 'https://api.faceit.com/auth/v1/oauth/token';
const FACEIT_USERINFO_ENDPOINT = 'https://api.faceit.com/auth/v1/resources/userinfo';
const LINK_TTL_MS = 10 * 60 * 1_000;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function base64Url(value: Buffer): string {
  return value.toString('base64url');
}

@Injectable()
export class GameAccountsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  status() {
    const steamReady = Boolean(process.env.STEAM_OPENID_REALM && process.env.API_PUBLIC_URL);
    const faceitReady = Boolean(
      process.env.FACEIT_OAUTH_CLIENT_ID &&
        process.env.FACEIT_OAUTH_CLIENT_SECRET &&
        process.env.FACEIT_OAUTH_STATE_SECRET &&
        process.env.API_PUBLIC_URL,
    );
    const identityReady = Boolean(
      process.env.SUMSUB_APP_TOKEN &&
        process.env.SUMSUB_SECRET_KEY &&
        process.env.SUMSUB_WEBHOOK_SECRET &&
        process.env.SUMSUB_LEVEL_NAME,
    );
    const emailReady = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
    return [
      {
        provider: 'STEAM',
        mode: steamReady ? 'LIVE' : 'DEMO',
        canVerify: steamReady,
        message: steamReady
          ? 'Steam OpenID 2.0 готов подтверждать владение аккаунтом.'
          : 'Нужны STEAM_OPENID_REALM и публичный API callback.',
      },
      {
        provider: 'FACEIT',
        mode: faceitReady ? 'LIVE' : 'DEMO',
        canVerify: faceitReady,
        message: faceitReady
          ? 'FACEIT OAuth Authorization Code + PKCE настроен.'
          : 'Нужны FACEIT OAuth client, secret, state secret и публичный callback.',
      },
      {
        provider: 'EMAIL',
        mode: emailReady || process.env.EMAIL_DELIVERY_ENDPOINT ? 'LIVE' : 'DEMO',
        canVerify: emailReady || Boolean(process.env.EMAIL_DELIVERY_ENDPOINT),
        message: emailReady
          ? 'Транзакционная доставка Resend настроена.'
          : 'Нужны RESEND_API_KEY и подтверждённый EMAIL_FROM.',
      },
      {
        provider: 'IDENTITY_DOCUMENT',
        mode: identityReady ? 'LIVE' : 'DEMO',
        canVerify: identityReady,
        message: identityReady
          ? 'Sumsub document + face match + liveness настроен.'
          : 'Нужны Sumsub app token, API secret, webhook secret и verification level.',
      },
      {
        provider: 'BILLING',
        mode: process.env.BILLING_PROVIDER ? 'LIVE' : 'DEMO',
        canVerify: Boolean(process.env.BILLING_PROVIDER && process.env.BILLING_WEBHOOK_SECRET),
        message: process.env.BILLING_PROVIDER
          ? 'Платёжный провайдер указан; webhook должен подписывать изменения Subscription.'
          : 'Тарифная модель готова, списания отключены до выбора эквайринга.',
      },
    ];
  }

  async startSteam(playerSlug: string, userId: string) {
    const realm = process.env.STEAM_OPENID_REALM?.trim();
    const callback = this.callbackUrl('steam');
    if (!realm) throw new ServiceUnavailableException('Steam OpenID не настроен');
    const { player, state } = await this.createTransaction('STEAM', playerSlug, userId);
    const returnTo = new URL(callback);
    returnTo.searchParams.set('state', state);
    const url = new URL(STEAM_OPENID_ENDPOINT);
    url.searchParams.set('openid.ns', 'http://specs.openid.net/auth/2.0');
    url.searchParams.set('openid.mode', 'checkid_setup');
    url.searchParams.set('openid.return_to', returnTo.toString());
    url.searchParams.set('openid.realm', realm);
    url.searchParams.set('openid.identity', 'http://specs.openid.net/auth/2.0/identifier_select');
    url.searchParams.set('openid.claimed_id', 'http://specs.openid.net/auth/2.0/identifier_select');
    return { authorizeUrl: url.toString(), player };
  }

  async finishSteam(query: CallbackQuery, userId: string, request: HttpRequest) {
    const state = this.required(query.state, 'state');
    const transaction = await this.consumeTransaction('STEAM', state, userId);
    if (query['openid.mode'] !== 'id_res') throw new UnauthorizedException('Steam OpenID отклонён');
    const claimedId = this.required(query['openid.claimed_id'], 'openid.claimed_id');
    const match = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(claimedId);
    if (!match) throw new UnauthorizedException('Steam вернул некорректный claimed_id');

    const verification = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key.startsWith('openid.') && value !== undefined) verification.set(key, value);
    }
    verification.set('openid.mode', 'check_authentication');
    const response = await fetch(STEAM_OPENID_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verification,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok || !(await response.text()).includes('is_valid:true')) {
      throw new UnauthorizedException('Подпись Steam OpenID не подтверждена');
    }
    const profile = await new SteamAccountAdapter().lookup(match[1]!);
    return this.persistVerifiedAccount(
      transaction.playerId,
      userId,
      'STEAM',
      profile.externalId,
      profile.handle,
      request,
    );
  }

  async startFaceit(playerSlug: string, userId: string) {
    const clientId = process.env.FACEIT_OAUTH_CLIENT_ID?.trim();
    if (!clientId || !process.env.FACEIT_OAUTH_CLIENT_SECRET || !this.faceitStateSecret()) {
      throw new ServiceUnavailableException('FACEIT OAuth не настроен');
    }
    const { player, state } = await this.createTransaction('FACEIT', playerSlug, userId);
    const verifier = this.faceitVerifier(state);
    const challenge = base64Url(createHash('sha256').update(verifier).digest());
    const url = new URL(FACEIT_AUTHORIZE_ENDPOINT);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', this.callbackUrl('faceit'));
    url.searchParams.set('scope', 'openid profile');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return { authorizeUrl: url.toString(), player };
  }

  async finishFaceit(query: CallbackQuery, userId: string, request: HttpRequest) {
    if (query.error) throw new UnauthorizedException(`FACEIT OAuth: ${query.error}`);
    const state = this.required(query.state, 'state');
    const code = this.required(query.code, 'code');
    const transaction = await this.consumeTransaction('FACEIT', state, userId);
    const clientId = this.required(process.env.FACEIT_OAUTH_CLIENT_ID, 'FACEIT_OAUTH_CLIENT_ID');
    const clientSecret = this.required(
      process.env.FACEIT_OAUTH_CLIENT_SECRET,
      'FACEIT_OAUTH_CLIENT_SECRET',
    );
    const tokenResponse = await fetch(FACEIT_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.callbackUrl('faceit'),
        code_verifier: this.faceitVerifier(state),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok) throw new BadGatewayException('FACEIT не выдал access token');
    const token = (await tokenResponse.json()) as { access_token?: string };
    if (!token.access_token) throw new BadGatewayException('FACEIT вернул пустой access token');
    const userResponse = await fetch(FACEIT_USERINFO_ENDPOINT, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!userResponse.ok) throw new BadGatewayException('FACEIT userinfo недоступен');
    const profile = (await userResponse.json()) as {
      sub?: string;
      nickname?: string;
      preferred_username?: string;
    };
    if (!profile.sub) throw new BadGatewayException('FACEIT не вернул player id');
    return this.persistVerifiedAccount(
      transaction.playerId,
      userId,
      'FACEIT',
      profile.sub,
      profile.nickname ?? profile.preferred_username ?? null,
      request,
    );
  }

  private async createTransaction(provider: LinkProvider, playerSlug: string, userId: string) {
    const claim = await this.prisma.profileClaim.findFirst({
      where: {
        userId,
        player: { slug: playerSlug, status: 'ACTIVE' },
        status: { in: ['SUBMITTED', 'EVIDENCE_REQUESTED', 'IN_REVIEW', 'APPROVED'] },
      },
      include: { player: { select: { id: true, slug: true, nickname: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (!claim) throw new NotFoundException('Сначала создайте заявку на этот профиль');
    const state = base64Url(randomBytes(32));
    await this.prisma.accountLinkTransaction.create({
      data: {
        userId,
        playerId: claim.playerId,
        provider,
        stateHash: sha256(state),
        expiresAt: new Date(Date.now() + LINK_TTL_MS),
      },
    });
    return { player: claim.player, state };
  }

  private async consumeTransaction(provider: LinkProvider, state: string, userId: string) {
    const transaction = await this.prisma.accountLinkTransaction.findFirst({
      where: {
        userId,
        provider,
        stateHash: sha256(state),
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!transaction) throw new UnauthorizedException('Сессия привязки истекла или использована');
    const consumed = await this.prisma.accountLinkTransaction.updateMany({
      where: { id: transaction.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) throw new UnauthorizedException('Сессия привязки уже использована');
    return transaction;
  }

  private async persistVerifiedAccount(
    playerId: string,
    userId: string,
    provider: LinkProvider,
    externalId: string,
    handle: string | null,
    request: HttpRequest,
  ) {
    const game = await this.prisma.game.findUnique({ where: { slug: 'cs2' } });
    if (!game) throw new NotFoundException('CS2 не настроен');
    const owner = await this.prisma.playerGameAccount.findUnique({
      where: { provider_externalId: { provider, externalId } },
    });
    if (owner && owner.playerId !== playerId) {
      throw new ConflictException('Этот внешний аккаунт уже связан с другим игроком');
    }
    const now = new Date();
    const account = await this.prisma.$transaction(async (tx) => {
      const linked = await tx.playerGameAccount.upsert({
        where: { playerId_gameId_provider: { playerId, gameId: game.id, provider } },
        create: { playerId, gameId: game.id, provider, externalId, handle, verifiedAt: now },
        update: { externalId, handle, verifiedAt: now },
      });
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: `game_account.${provider.toLocaleLowerCase('en-US')}.link`,
          targetType: 'PlayerGameAccount',
          targetId: linked.id,
          diff: { provider, externalIdHash: sha256(externalId), verifiedAt: now.toISOString() },
          requestId: this.requestId(request),
        },
      });
      return linked;
    });
    return { provider: account.provider, handle: account.handle, verifiedAt: account.verifiedAt };
  }

  private callbackUrl(provider: 'steam' | 'faceit'): string {
    const base = process.env.API_PUBLIC_URL?.trim();
    if (!base) throw new ServiceUnavailableException('API_PUBLIC_URL не настроен');
    return new URL(`/api/v1/integrations/${provider}/callback`, base).toString();
  }

  private faceitStateSecret(): string {
    return process.env.FACEIT_OAUTH_STATE_SECRET?.trim() ?? '';
  }

  private faceitVerifier(state: string): string {
    return base64Url(createHmac('sha256', this.faceitStateSecret()).update(state).digest());
  }

  private required(value: string | undefined, field: string): string {
    if (!value) throw new UnauthorizedException(`Отсутствует ${field}`);
    return value;
  }

  private requestId(request: HttpRequest): string | null {
    const value = request.headers['x-request-id'];
    return typeof value === 'string' ? value.slice(0, 128) : null;
  }
}
