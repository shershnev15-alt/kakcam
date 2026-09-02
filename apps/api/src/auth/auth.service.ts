import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { HttpRequest, HttpResponse } from '../http.types';
import { PrismaService } from '../prisma.service';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
  LoginInput,
  RegistrationInput,
} from './auth.types';
import { hashPassword, verifyPassword } from './password';

const SESSION_COOKIE = 'arena_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1_000;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

@Injectable()
export class AuthService {
  private readonly dummyPasswordHash = hashPassword('arena-passport-dummy-password');

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async register(input: RegistrationInput, request: HttpRequest) {
    const passwordHash = await hashPassword(input.password);
    const role = await this.prisma.role.findUnique({ where: { code: 'REGISTERED_USER' } });
    if (!role) throw new Error('REGISTERED_USER role is not seeded');

    const session = this.newSession(request);
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: input.email,
            displayName: input.displayName,
            identities: {
              create: {
                provider: 'EMAIL',
                providerSubject: input.email,
                passwordHash,
              },
            },
            roles: { create: { roleId: role.id } },
            sessions: { create: session.data },
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: created.id,
            action: 'auth.register',
            targetType: 'User',
            targetId: created.id,
            requestId: this.requestId(request) ?? null,
            ipHash: session.data.ipHash ?? null,
          },
        });
        return created;
      });
      return { user: this.publicUser(user, ['REGISTERED_USER'], []), token: session.token };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Аккаунт с таким email уже существует');
      }
      throw error;
    }
  }

  async login(input: LoginInput, request: HttpRequest) {
    const identity = await this.prisma.identity.findUnique({
      where: {
        provider_providerSubject: { provider: 'EMAIL', providerSubject: input.email },
      },
      include: { user: true },
    });
    const passwordHash = identity?.passwordHash ?? (await this.dummyPasswordHash);
    const valid = await verifyPassword(input.password, passwordHash);
    if (!identity || !valid || identity.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const session = this.newSession(request);
    await this.prisma.$transaction([
      this.prisma.session.create({ data: { userId: identity.userId, ...session.data } }),
      this.prisma.auditLog.create({
        data: {
          actorId: identity.userId,
          action: 'auth.login',
          targetType: 'Session',
          requestId: this.requestId(request) ?? null,
          ipHash: session.data.ipHash ?? null,
        },
      }),
    ]);
    const auth = await this.loadUser(identity.userId);
    return { user: auth, token: session.token };
  }

  async authenticate(request: AuthenticatedRequest): Promise<AuthenticatedUser> {
    const token = this.readToken(request);
    if (!token) throw new UnauthorizedException('Требуется вход');

    const now = new Date();
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: {
        user: {
          include: {
            roles: {
              where: { OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
              include: {
                role: { include: { permissions: { include: { permission: true } } } },
              },
            },
          },
        },
      },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Сессия недействительна');
    }

    if (now.getTime() - session.lastSeenAt.getTime() > 5 * 60 * 1_000) {
      void this.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: now } });
    }
    const roles = session.user.roles.map((item) => item.role.code);
    const permissions = [
      ...new Set(
        session.user.roles.flatMap((item) =>
          item.role.permissions.map((permission) => permission.permission.code),
        ),
      ),
    ];
    const auth = this.publicUser(session.user, roles, permissions);
    request.auth = auth;
    request.authSession = { id: session.id, token };
    return auth;
  }

  async logout(request: AuthenticatedRequest): Promise<void> {
    if (!request.authSession || !request.auth) return;
    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: request.authSession.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: request.auth.id,
          action: 'auth.logout',
          targetType: 'Session',
          targetId: request.authSession.id,
          requestId: this.requestId(request) ?? null,
        },
      }),
    ]);
  }

  setSessionCookie(response: HttpResponse, token: string): void {
    response.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_MS,
    });
  }

  clearSessionCookie(response: HttpResponse): void {
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  private async loadUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: {
          where: { OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }] },
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    const roles = user.roles.map((item) => item.role.code);
    const permissions = [
      ...new Set(
        user.roles.flatMap((item) =>
          item.role.permissions.map((permission) => permission.permission.code),
        ),
      ),
    ];
    return this.publicUser(user, roles, permissions);
  }

  private newSession(request: HttpRequest) {
    const token = randomBytes(32).toString('base64url');
    const ipHashSalt = process.env.IP_HASH_SALT;
    return {
      token,
      data: {
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
        userAgent: this.header(request, 'user-agent')?.slice(0, 512) ?? null,
        ...(ipHashSalt ? { ipHash: sha256(`${ipHashSalt}:${request.ip}`) } : {}),
      },
    };
  }

  private readToken(request: HttpRequest): string | undefined {
    const authorization = this.header(request, 'authorization');
    if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim() || undefined;
    const cookie = this.header(request, 'cookie')
      ?.split(';')
      .map((item) => item.trim().split('='))
      .find(([name]) => name === SESSION_COOKIE);
    return cookie?.[1] ? decodeURIComponent(cookie[1]) : undefined;
  }

  private publicUser(
    user: { id: string; email: string; displayName: string | null },
    roles: string[],
    permissions: string[],
  ): AuthenticatedUser {
    return { id: user.id, email: user.email, displayName: user.displayName, roles, permissions };
  }

  private requestId(request: HttpRequest): string | undefined {
    return this.header(request, 'x-request-id')?.slice(0, 128);
  }

  private header(request: HttpRequest, name: string): string | undefined {
    const value = request.headers[name];
    return typeof value === 'string' ? value : value?.[0];
  }
}
