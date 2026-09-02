import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type { HttpRequest } from '../http.types';
import { PrismaService } from '../prisma.service';
import type {
  CreatePlayerInput,
  CreateTeamInput,
  UpdatePlayerInput,
  UpdateTeamInput,
} from './entities.validation';

const playerInclude = {
  country: { select: { code: true, name: true } },
  currentTeam: { select: { slug: true, name: true, shortName: true } },
  profile: { select: { realName: true } },
} satisfies Prisma.PlayerInclude;

const teamInclude = {
  country: { select: { code: true, name: true } },
} satisfies Prisma.TeamInclude;

type PlayerRecord = Prisma.PlayerGetPayload<{ include: typeof playerInclude }>;
type TeamRecord = Prisma.TeamGetPayload<{ include: typeof teamInclude }>;

function errorCode(error: unknown): string | undefined {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined;
}

@Injectable()
export class EntitiesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listPlayers() {
    const records = await this.prisma.player.findMany({
      where: { status: 'ACTIVE' },
      include: playerInclude,
      orderBy: [{ aggregateVerificationLevel: 'desc' }, { nickname: 'asc' }],
    });
    return records.map((record) => this.playerDto(record));
  }

  async playerBySlug(slug: string) {
    const record = await this.prisma.player.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: playerInclude,
    });
    if (!record) throw new NotFoundException('Player not found');
    return this.playerDto(record);
  }

  async createPlayer(input: CreatePlayerInput, actorId: string, request: HttpRequest) {
    try {
      const record = await this.prisma.$transaction(async (tx) => {
        const player = await tx.player.create({
          data: {
            slug: input.slug,
            nickname: input.nickname,
            normalizedNickname: input.nickname.toLocaleLowerCase('ru-RU'),
            ...(input.countryCode ? { country: { connect: { code: input.countryCode } } } : {}),
            ...(input.realName ? { profile: { create: { realName: input.realName } } } : {}),
          },
          include: playerInclude,
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'player.create',
            targetType: 'Player',
            targetId: player.id,
            diff: { after: input },
            requestId: this.requestId(request) ?? null,
          },
        });
        return player;
      });
      return this.playerDto(record);
    } catch (error) {
      this.handleWriteError(error, 'Игрок с таким slug уже существует');
    }
  }

  async updatePlayer(
    slug: string,
    input: UpdatePlayerInput,
    actorId: string,
    request: HttpRequest,
  ) {
    try {
      const record = await this.prisma.$transaction(async (tx) => {
        const before = await tx.player.findUnique({ where: { slug }, include: playerInclude });
        if (!before) throw new NotFoundException('Player not found');
        const data: Prisma.PlayerUpdateInput = {};
        if (input.nickname) {
          data.nickname = input.nickname;
          data.normalizedNickname = input.nickname.toLocaleLowerCase('ru-RU');
        }
        if (input.countryCode) data.country = { connect: { code: input.countryCode } };
        if (input.realName)
          data.profile = {
            upsert: { create: { realName: input.realName }, update: { realName: input.realName } },
          };
        const player = await tx.player.update({ where: { slug }, data, include: playerInclude });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'player.update',
            targetType: 'Player',
            targetId: player.id,
            diff: { before: this.playerDto(before), after: this.playerDto(player) },
            requestId: this.requestId(request) ?? null,
          },
        });
        return player;
      });
      return this.playerDto(record);
    } catch (error) {
      this.handleWriteError(error, 'Не удалось обновить игрока');
    }
  }

  async archivePlayer(slug: string, actorId: string, request: HttpRequest) {
    const record = await this.prisma.$transaction(async (tx) => {
      const before = await tx.player.findFirst({
        where: { slug, status: 'ACTIVE' },
        include: playerInclude,
      });
      if (!before) throw new NotFoundException('Player not found');
      const player = await tx.player.update({
        where: { id: before.id },
        data: { status: 'ARCHIVED' },
        include: playerInclude,
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'player.archive',
          targetType: 'Player',
          targetId: player.id,
          diff: { before: this.playerDto(before), after: this.playerDto(player) },
          requestId: this.requestId(request) ?? null,
        },
      });
      return player;
    });
    return this.playerDto(record);
  }

  async listTeams() {
    const records = await this.prisma.team.findMany({
      where: { status: 'ACTIVE' },
      include: teamInclude,
      orderBy: [{ aggregateVerificationLevel: 'desc' }, { name: 'asc' }],
    });
    return records.map((record) => this.teamDto(record));
  }

  async teamBySlug(slug: string) {
    const record = await this.prisma.team.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: teamInclude,
    });
    if (!record) throw new NotFoundException('Team not found');
    return this.teamDto(record);
  }

  async createTeam(input: CreateTeamInput, actorId: string, request: HttpRequest) {
    try {
      const record = await this.prisma.$transaction(async (tx) => {
        const team = await tx.team.create({
          data: {
            slug: input.slug,
            name: input.name,
            shortName: input.shortName,
            ...(input.countryCode ? { country: { connect: { code: input.countryCode } } } : {}),
          },
          include: teamInclude,
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'team.create',
            targetType: 'Team',
            targetId: team.id,
            diff: { after: input },
            requestId: this.requestId(request) ?? null,
          },
        });
        return team;
      });
      return this.teamDto(record);
    } catch (error) {
      this.handleWriteError(error, 'Команда с таким slug уже существует');
    }
  }

  async updateTeam(slug: string, input: UpdateTeamInput, actorId: string, request: HttpRequest) {
    try {
      const record = await this.prisma.$transaction(async (tx) => {
        const before = await tx.team.findUnique({ where: { slug }, include: teamInclude });
        if (!before) throw new NotFoundException('Team not found');
        const data: Prisma.TeamUpdateInput = {};
        if (input.name) data.name = input.name;
        if (input.shortName) data.shortName = input.shortName;
        if (input.countryCode) data.country = { connect: { code: input.countryCode } };
        const team = await tx.team.update({ where: { slug }, data, include: teamInclude });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'team.update',
            targetType: 'Team',
            targetId: team.id,
            diff: { before: this.teamDto(before), after: this.teamDto(team) },
            requestId: this.requestId(request) ?? null,
          },
        });
        return team;
      });
      return this.teamDto(record);
    } catch (error) {
      this.handleWriteError(error, 'Не удалось обновить команду');
    }
  }

  async archiveTeam(slug: string, actorId: string, request: HttpRequest) {
    const record = await this.prisma.$transaction(async (tx) => {
      const before = await tx.team.findFirst({
        where: { slug, status: 'ACTIVE' },
        include: teamInclude,
      });
      if (!before) throw new NotFoundException('Team not found');
      const team = await tx.team.update({
        where: { id: before.id },
        data: { status: 'ARCHIVED' },
        include: teamInclude,
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'team.archive',
          targetType: 'Team',
          targetId: team.id,
          diff: { before: this.teamDto(before), after: this.teamDto(team) },
          requestId: this.requestId(request) ?? null,
        },
      });
      return team;
    });
    return this.teamDto(record);
  }

  private playerDto(player: PlayerRecord) {
    return {
      id: player.id,
      slug: player.slug,
      nickname: player.nickname,
      realName: player.profile?.realName ?? null,
      status: player.status,
      verificationLevel: player.aggregateVerificationLevel,
      country: player.country,
      currentTeam: player.currentTeam,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
    };
  }

  private teamDto(team: TeamRecord) {
    return {
      id: team.id,
      slug: team.slug,
      name: team.name,
      shortName: team.shortName,
      status: team.status,
      verificationLevel: team.aggregateVerificationLevel,
      country: team.country,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  private handleWriteError(error: unknown, conflictMessage: string): never {
    if (error instanceof NotFoundException) throw error;
    if (errorCode(error) === 'P2002') throw new ConflictException(conflictMessage);
    if (errorCode(error) === 'P2025') throw new NotFoundException('Связанная запись не найдена');
    throw error;
  }

  private requestId(request: HttpRequest): string | undefined {
    const value = request.headers['x-request-id'];
    return typeof value === 'string' ? value.slice(0, 128) : undefined;
  }
}
