import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { achievements, matches, players, teams, tournaments } from '@arena/demo-data';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for seed');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const permissionDefinitions = [
  ['player.create', 'Создание профилей игроков'],
  ['player.update', 'Редактирование профилей игроков'],
  ['player.archive', 'Архивация профилей игроков'],
  ['team.create', 'Создание команд'],
  ['team.update', 'Редактирование команд'],
  ['team.archive', 'Архивация команд'],
  ['audit.read', 'Просмотр журнала аудита'],
  ['role.manage', 'Управление ролями и разрешениями'],
] as const;

const roleDefinitions = [
  ['GUEST', 'Гость', []],
  ['REGISTERED_USER', 'Зарегистрированный пользователь', []],
  ['PLAYER', 'Игрок', []],
  ['VERIFIED_PLAYER', 'Подтверждённый игрок', []],
  ['TEAM_CAPTAIN', 'Капитан команды', []],
  ['TEAM_MANAGER', 'Менеджер команды', ['team.update']],
  ['COACH', 'Тренер', []],
  ['ORGANIZER', 'Организатор', ['team.create', 'team.update']],
  ['STATISTICIAN', 'Статистик', ['player.create', 'player.update', 'team.create', 'team.update']],
  [
    'MODERATOR',
    'Модератор',
    [
      'player.create',
      'player.update',
      'player.archive',
      'team.create',
      'team.update',
      'team.archive',
      'audit.read',
    ],
  ],
  [
    'ADMIN',
    'Администратор',
    [
      'player.create',
      'player.update',
      'player.archive',
      'team.create',
      'team.update',
      'team.archive',
      'audit.read',
    ],
  ],
  [
    'SUPER_ADMIN',
    'Суперадминистратор',
    [
      'player.create',
      'player.update',
      'player.archive',
      'team.create',
      'team.update',
      'team.archive',
      'audit.read',
      'role.manage',
    ],
  ],
] as const;

async function seedAccessControl(): Promise<void> {
  const permissionIds = new Map<string, string>();
  for (const [code, description] of permissionDefinitions) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: { description },
      create: { code, description },
    });
    permissionIds.set(code, permission.id);
  }

  const roleIds = new Map<string, string>();
  for (const [code, name] of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name, isSystem: true },
      create: { code, name, isSystem: true },
    });
    roleIds.set(code, role.id);
  }

  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: [...roleIds.values()] } },
  });
  await prisma.rolePermission.createMany({
    data: roleDefinitions.flatMap(([code, , permissionCodes]) =>
      permissionCodes.map((permissionCode) => ({
        roleId: roleIds.get(code)!,
        permissionId: permissionIds.get(permissionCode)!,
      })),
    ),
  });
}

async function main(): Promise<void> {
  await seedAccessControl();

  const game = await prisma.game.upsert({
    where: { slug: 'cs2' },
    update: { name: 'Counter-Strike 2' },
    create: { slug: 'cs2', name: 'Counter-Strike 2' },
  });

  for (const code of ['RU', 'KZ', 'BY', 'AM', 'UZ', 'KG']) {
    const player = players.find((item) => item.countryCode === code);
    await prisma.country.upsert({
      where: { code },
      update: {},
      create: { code, name: player?.countryName ?? code },
    });
  }

  const countries = new Map((await prisma.country.findMany()).map((item) => [item.code, item.id]));
  const teamIds = new Map<string, string>();
  for (const team of teams) {
    const record = await prisma.team.upsert({
      where: { slug: team.slug },
      update: { name: team.name, shortName: team.shortName },
      create: {
        slug: team.slug,
        name: team.name,
        shortName: team.shortName,
        ...(countries.get(team.countryCode) ? { countryId: countries.get(team.countryCode)! } : {}),
        foundedAt: new Date(`${team.foundedYear}-01-01T00:00:00.000Z`),
        aggregateVerificationLevel: team.verificationLevel,
      },
    });
    teamIds.set(team.id, record.id);
  }

  const playerIds = new Map<string, string>();
  for (const player of players) {
    const profile = {
      realName: player.realName ?? null,
      birthDate: new Date(Date.UTC(2026 - (player.age ?? 20), 0, 1)),
    };
    const record = await prisma.player.upsert({
      where: { slug: player.slug },
      update: {
        nickname: player.nickname,
        normalizedNickname: player.nickname.toLocaleLowerCase('ru-RU'),
        ...(countries.get(player.countryCode)
          ? { countryId: countries.get(player.countryCode)! }
          : {}),
        ...(player.teamId && teamIds.get(player.teamId)
          ? { currentTeamId: teamIds.get(player.teamId)! }
          : {}),
        aggregateVerificationLevel: player.verificationLevel,
        profile: { upsert: { create: profile, update: profile } },
      },
      create: {
        slug: player.slug,
        nickname: player.nickname,
        normalizedNickname: player.nickname.toLocaleLowerCase('ru-RU'),
        ...(countries.get(player.countryCode)
          ? { countryId: countries.get(player.countryCode)! }
          : {}),
        ...(player.teamId && teamIds.get(player.teamId)
          ? { currentTeamId: teamIds.get(player.teamId)! }
          : {}),
        aggregateVerificationLevel: player.verificationLevel,
        profile: { create: profile },
      },
    });
    playerIds.set(player.id, record.id);
  }

  const ratingPublishedAt = new Date('2026-09-02T05:00:00.000Z');
  const playerRatingRun = await prisma.ratingRun.upsert({
    where: {
      engine_formulaVersion_inputCutoff: {
        engine: 'PPR',
        formulaVersion: 'demo-v1',
        inputCutoff: ratingPublishedAt,
      },
    },
    update: { status: 'PUBLISHED', config: { periodDays: 90 } },
    create: {
      engine: 'PPR',
      formulaVersion: 'demo-v1',
      inputCutoff: ratingPublishedAt,
      checksum: 'demo-ppr-2026-09-02',
      status: 'PUBLISHED',
      config: { periodDays: 90 },
    },
  });
  const teamRatingRun = await prisma.ratingRun.upsert({
    where: {
      engine_formulaVersion_inputCutoff: {
        engine: 'TPR',
        formulaVersion: 'demo-v1',
        inputCutoff: ratingPublishedAt,
      },
    },
    update: { status: 'PUBLISHED', config: { periodDays: 90 } },
    create: {
      engine: 'TPR',
      formulaVersion: 'demo-v1',
      inputCutoff: ratingPublishedAt,
      checksum: 'demo-tpr-2026-09-02',
      status: 'PUBLISHED',
      config: { periodDays: 90 },
    },
  });

  for (const player of players) {
    await prisma.playerRating.upsert({
      where: {
        playerId_gameId_runId: {
          playerId: playerIds.get(player.id)!,
          gameId: game.id,
          runId: playerRatingRun.id,
        },
      },
      update: {
        score: player.rating.score,
        confidence: player.rating.confidence,
        rank: player.rating.rank,
        explanation: {
          delta7d: player.rating.delta7d,
          delta30d: player.rating.delta30d,
          tier: player.rating.tier,
          roles: player.roles,
          form: player.form,
        },
        publishedAt: ratingPublishedAt,
      },
      create: {
        playerId: playerIds.get(player.id)!,
        gameId: game.id,
        runId: playerRatingRun.id,
        score: player.rating.score,
        confidence: player.rating.confidence,
        rank: player.rating.rank,
        explanation: {
          delta7d: player.rating.delta7d,
          delta30d: player.rating.delta30d,
          tier: player.rating.tier,
          roles: player.roles,
          form: player.form,
        },
        publishedAt: ratingPublishedAt,
      },
    });
  }

  for (const team of teams) {
    await prisma.teamRating.upsert({
      where: {
        teamId_gameId_runId: {
          teamId: teamIds.get(team.id)!,
          gameId: game.id,
          runId: teamRatingRun.id,
        },
      },
      update: {
        score: team.rating.score,
        confidence: team.rating.confidence,
        rank: team.rating.rank,
        explanation: {
          delta7d: team.rating.delta7d,
          delta30d: team.rating.delta30d,
          tier: team.rating.tier,
          form: team.form,
        },
        publishedAt: ratingPublishedAt,
      },
      create: {
        teamId: teamIds.get(team.id)!,
        gameId: game.id,
        runId: teamRatingRun.id,
        score: team.rating.score,
        confidence: team.rating.confidence,
        rank: team.rating.rank,
        explanation: {
          delta7d: team.rating.delta7d,
          delta30d: team.rating.delta30d,
          tier: team.rating.tier,
          form: team.form,
        },
        publishedAt: ratingPublishedAt,
      },
    });
  }

  const tournamentIds = new Map<string, string>();
  for (const tournament of tournaments) {
    const record = await prisma.tournament.upsert({
      where: { slug: tournament.slug },
      update: { name: tournament.name },
      create: {
        slug: tournament.slug,
        gameId: game.id,
        name: tournament.name,
        tier: tournament.tier,
        mode: tournament.mode,
        startsAt: tournament.startsAt,
        endsAt: tournament.endsAt,
        prizePool: tournament.prizePool,
        currency: tournament.currency,
      },
    });
    tournamentIds.set(tournament.id, record.id);
  }

  for (const [matchIndex, match] of matches.entries()) {
    const matchId = `00000000-0000-4000-8000-${String(matchIndex + 1).padStart(12, '0')}`;
    await prisma.match.upsert({
      where: { id: matchId },
      update: {},
      create: {
        id: matchId,
        gameId: game.id,
        tournamentId:
          tournamentIds.get(tournaments.find((item) => item.name === match.tournament)?.id ?? '') ??
          null,
        homeTeamId: teamIds.get(match.homeTeamId) ?? null,
        awayTeamId: teamIds.get(match.awayTeamId) ?? null,
        startsAt: match.startsAt,
        status: match.status === 'UPCOMING' ? 'SCHEDULED' : match.status,
        stage: match.stage,
        bestOf: match.bestOf,
        homeScore: match.homeScore ?? null,
        awayScore: match.awayScore ?? null,
        verificationLevel: match.status === 'FINISHED' ? 3 : 1,
      },
    });
  }

  for (const item of achievements) {
    await prisma.achievement.upsert({
      where: { code: item.code },
      update: { title: item.title, description: item.description },
      create: {
        code: item.code,
        gameId:
          item.code.startsWith('performance.') || item.code.startsWith('clutch.') ? game.id : null,
        title: item.title,
        description: item.description,
        category: item.category,
        rarity: item.rarity.toUpperCase() as 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC',
        rule: { operator: 'gte', target: item.target },
        icon: item.code,
      },
    });
  }

  console.log(
    `Seeded ${roleDefinitions.length} roles, ${permissionDefinitions.length} permissions, ${players.length} players with PPR, ${teams.length} teams with TPR, ${tournaments.length} tournaments, ${matches.length} matches and ${achievements.length} achievements.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
