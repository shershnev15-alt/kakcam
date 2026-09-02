import { product } from '@arena/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { achievements, matches, players, teams, tournaments } from '@arena/demo-data';
import {
  calculatePprDetailed,
  calculateTprLeaderboard,
  type RatingObservation,
} from '@arena/rating-engine';
import { evaluateAchievementCatalog, type ThresholdRule } from '@arena/achievements-engine';
import { createHash } from 'node:crypto';
import { hashPassword } from '../src/auth/password';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for seed');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function ratingTournamentCoefficient(tier: string | null | undefined): number {
  const normalized = tier?.toLocaleLowerCase('en-US');
  if (normalized === 'international' || normalized === 'elite') return 1.1;
  if (normalized === 'national') return 1;
  if (normalized === 'regional') return 0.95;
  return 0.85;
}

const permissionDefinitions = [
  ['player.create', 'Создание профилей игроков'],
  ['player.update', 'Редактирование профилей игроков'],
  ['player.archive', 'Архивация профилей игроков'],
  ['team.create', 'Создание команд'],
  ['team.update', 'Редактирование команд'],
  ['team.archive', 'Архивация команд'],
  ['match.create', 'Создание матчей'],
  ['match.update', 'Редактирование матчей и статистики'],
  ['match.verify', 'Финализация и подтверждение результатов'],
  ['tournament.manage', 'Управление турнирами и участниками'],
  ['rating.run', 'Запуск воспроизводимого расчёта рейтингов'],
  ['achievement.replay', 'Идемпотентный replay правил достижений'],
  ['transfer.manage', 'Регистрация подтверждённых переходов и карьерных периодов'],
  ['claim.review', 'Рассмотрение заявок на владение профилем'],
  ['player.publish', 'Публикация игрока после полной проверки федерацией'],
  ['audit.read', 'Просмотр журнала аудита'],
  ['role.manage', 'Управление ролями и разрешениями'],
  ['admin.read', 'Доступ к административной консоли'],
  ['admin.archive', 'Архивация сущностей через admin preview'],
  ['admin.user.manage', 'Управление статусами пользователей'],
  ['organization.manage', 'Управление организациями'],
  ['assertion.manage', 'Разрешение field assertions и конфликтов'],
  ['import.manage', 'Управление очередью импортов'],
  ['report.manage', 'Рассмотрение жалоб и репортов'],
  ['achievement.manage', 'Управление версиями правил достижений'],
] as const;

const roleDefinitions = [
  ['GUEST', 'Гость', []],
  ['REGISTERED_USER', 'Зарегистрированный пользователь', []],
  ['PLAYER', 'Игрок', []],
  ['VERIFIED_PLAYER', 'Подтверждённый игрок', []],
  ['FEDERATION_REVIEWER', 'Верификатор местной федерации', ['player.publish']],
  ['TEAM_CAPTAIN', 'Капитан команды', []],
  ['TEAM_MANAGER', 'Менеджер команды', ['team.update']],
  ['COACH', 'Тренер', []],
  [
    'ORGANIZER',
    'Организатор',
    ['team.create', 'team.update', 'match.create', 'match.update', 'tournament.manage'],
  ],
  [
    'STATISTICIAN',
    'Статистик',
    [
      'player.create',
      'player.update',
      'team.create',
      'team.update',
      'match.update',
      'rating.run',
      'achievement.replay',
    ],
  ],
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
      'match.create',
      'match.update',
      'match.verify',
      'tournament.manage',
      'achievement.replay',
      'transfer.manage',
      'claim.review',
      'audit.read',
      'admin.read',
      'admin.archive',
      'assertion.manage',
      'report.manage',
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
      'match.create',
      'match.update',
      'match.verify',
      'tournament.manage',
      'rating.run',
      'achievement.replay',
      'transfer.manage',
      'claim.review',
      'audit.read',
      'admin.read',
      'admin.archive',
      'admin.user.manage',
      'organization.manage',
      'assertion.manage',
      'import.manage',
      'report.manage',
      'achievement.manage',
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
      'match.create',
      'match.update',
      'match.verify',
      'tournament.manage',
      'rating.run',
      'achievement.replay',
      'transfer.manage',
      'claim.review',
      'audit.read',
      'role.manage',
      'admin.read',
      'admin.archive',
      'admin.user.manage',
      'organization.manage',
      'assertion.manage',
      'import.manage',
      'report.manage',
      'achievement.manage',
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

async function seedLocalAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLocaleLowerCase('en-US');
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email && !password) return;
  if (!email || !password || password.length < 12) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (12+ chars) must be set together');
  }
  const role = await prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { displayName: 'Локальный администр', status: 'ACTIVE' },
    create: {
      email,
      displayName: 'Локальный администр',
      identities: { create: { provider: 'EMAIL', providerSubject: email, passwordHash } },
    },
  });
  await prisma.identity.upsert({
    where: { provider_providerSubject: { provider: 'EMAIL', providerSubject: email } },
    update: { userId: user.id, passwordHash },
    create: { userId: user.id, provider: 'EMAIL', providerSubject: email, passwordHash },
  });
  const assigned = await prisma.userRole.findFirst({ where: { userId: user.id, roleId: role.id } });
  if (!assigned) await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
}

async function main(): Promise<void> {
  await seedAccessControl();
  await seedLocalAdmin();

  const game = await prisma.game.upsert({
    where: { slug: 'cs2' },
    update: { name: 'Counter-Strike 2' },
    create: { slug: 'cs2', name: 'Counter-Strike 2' },
  });

  const dataSource = await prisma.dataSource.upsert({
    where: { code: 'arena-demo' },
    update: { name: product.demoSourceName, type: 'INTERNAL', trustLevel: 3 },
    create: {
      code: 'arena-demo',
      name: product.demoSourceName,
      type: 'INTERNAL',
      trustLevel: 3,
    },
  });

  await Promise.all([
    prisma.dataSource.upsert({
      where: { code: 'cs2-demo-alpha' },
      update: { name: 'CS2 Demo Alpha feed', type: 'MOCK_PROVIDER', trustLevel: 2 },
      create: {
        code: 'cs2-demo-alpha',
        name: 'CS2 Demo Alpha feed',
        type: 'MOCK_PROVIDER',
        trustLevel: 2,
      },
    }),
    prisma.dataSource.upsert({
      where: { code: 'cs2-demo-bravo' },
      update: { name: 'CS2 Demo Bravo feed', type: 'MOCK_PROVIDER', trustLevel: 2 },
      create: {
        code: 'cs2-demo-bravo',
        name: 'CS2 Demo Bravo feed',
        type: 'MOCK_PROVIDER',
        trustLevel: 2,
      },
    }),
  ]);

  for (const code of ['RU', 'KZ', 'BY', 'AM', 'UZ', 'KG']) {
    const player = players.find((item) => item.countryCode === code);
    await prisma.country.upsert({
      where: { code },
      update: {},
      create: { code, name: player?.countryName ?? code },
    });
  }

  const countries = new Map((await prisma.country.findMany()).map((item) => [item.code, item.id]));
  const citiesByCountry: Record<string, string[]> = {
    RU: ['Москва', 'Санкт-Петербург', 'Казань', 'Екатеринбург'],
    KZ: ['Алматы', 'Астана'],
    BY: ['Минск'],
    AM: ['Ереван'],
    UZ: ['Ташкент'],
    KG: ['Бишкек'],
  };
  const teamIds = new Map<string, string>();
  for (const [teamIndex, team] of teams.entries()) {
    const teamCities = citiesByCountry[team.countryCode] ?? ['Не указан'];
    const city = teamCities[teamIndex % teamCities.length]!;
    const record = await prisma.team.upsert({
      where: { slug: team.slug },
      update: { name: team.name, shortName: team.shortName, city },
      create: {
        slug: team.slug,
        name: team.name,
        shortName: team.shortName,
        city,
        ...(countries.get(team.countryCode) ? { countryId: countries.get(team.countryCode)! } : {}),
        foundedAt: new Date(`${team.foundedYear}-01-01T00:00:00.000Z`),
        aggregateVerificationLevel: team.verificationLevel,
      },
    });
    teamIds.set(team.id, record.id);
  }

  const playerIds = new Map<string, string>();
  for (const [playerIndex, player] of players.entries()) {
    const playerCities = citiesByCountry[player.countryCode] ?? ['Не указан'];
    const profile = {
      realName: player.realName ?? null,
      birthDate: new Date(Date.UTC(2026 - (player.age ?? 20), 0, 1)),
      regionName: playerCities[playerIndex % playerCities.length]!,
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

  const demoPlayer = players[0]!;
  const demoPlayerId = playerIds.get(demoPlayer.id)!;
  const federation = await prisma.organization.upsert({
    where: { slug: 'demo-cs2-federation' },
    update: { name: 'Демо-федерация CS2', countryCode: 'RU', isFederation: true },
    create: {
      slug: 'demo-cs2-federation',
      name: 'Демо-федерация CS2',
      countryCode: 'RU',
      isFederation: true,
    },
  });
  const demoReviewer = await prisma.user.upsert({
    where: { email: 'reviewer@demo.arena.local' },
    update: { displayName: 'Демо-верификатор', emailVerifiedAt: new Date('2026-09-01') },
    create: {
      email: 'reviewer@demo.arena.local',
      displayName: 'Демо-верификатор',
      emailVerifiedAt: new Date('2026-09-01'),
    },
  });
  const federationRole = await prisma.role.findUniqueOrThrow({
    where: { code: 'FEDERATION_REVIEWER' },
  });
  const reviewerRole = await prisma.userRole.findFirst({
    where: {
      userId: demoReviewer.id,
      roleId: federationRole.id,
      scopeType: 'ORGANIZATION',
      scopeId: federation.id,
    },
  });
  if (!reviewerRole) {
    await prisma.userRole.create({
      data: {
        userId: demoReviewer.id,
        roleId: federationRole.id,
        scopeType: 'ORGANIZATION',
        scopeId: federation.id,
      },
    });
  }
  const demoClaimant = await prisma.user.upsert({
    where: { email: 'frostbyte@demo.arena.local' },
    update: { displayName: demoPlayer.nickname, emailVerifiedAt: new Date('2026-09-01') },
    create: {
      email: 'frostbyte@demo.arena.local',
      displayName: demoPlayer.nickname,
      emailVerifiedAt: new Date('2026-09-01'),
    },
  });
  const demoClaim = await prisma.profileClaim.upsert({
    where: { id: '20000000-0000-4000-8000-000000000001' },
    update: {
      userId: demoClaimant.id,
      playerId: demoPlayerId,
      status: 'APPROVED',
      reviewerId: demoReviewer.id,
      decidedAt: new Date('2026-09-01'),
    },
    create: {
      id: '20000000-0000-4000-8000-000000000001',
      userId: demoClaimant.id,
      playerId: demoPlayerId,
      status: 'APPROVED',
      method: 'DEMO_SELF_CLAIM',
      statement: 'Демонстрационная заявка вымышленного игрока',
      evidenceSummary: { synthetic: true, purpose: 'local-demo' },
      reviewerId: demoReviewer.id,
      decisionReason: 'Approved synthetic demo record',
      decidedAt: new Date('2026-09-01'),
    },
  });
  const photoChecksum = createHash('sha256').update('demo-player-frostbyte.png:v1').digest('hex');
  const photoEvidence = await prisma.verificationEvidence.upsert({
    where: { id: '30000000-0000-4000-8000-000000000001' },
    update: {
      claimId: demoClaim.id,
      submittedById: demoClaimant.id,
      kind: 'PROFILE_PHOTO',
      reference: '/demo-player-frostbyte.png',
      checksum: photoChecksum,
      visibility: 'RESTRICTED',
    },
    create: {
      id: '30000000-0000-4000-8000-000000000001',
      claimId: demoClaim.id,
      submittedById: demoClaimant.id,
      kind: 'PROFILE_PHOTO',
      reference: '/demo-player-frostbyte.png',
      checksum: photoChecksum,
      visibility: 'RESTRICTED',
    },
  });
  await Promise.all([
    prisma.playerGameAccount.upsert({
      where: { provider_externalId: { provider: 'STEAM', externalId: '76561198000000001' } },
      update: {
        playerId: demoPlayerId,
        gameId: game.id,
        handle: 'frostbyte',
        verifiedAt: new Date('2026-09-01'),
      },
      create: {
        playerId: demoPlayerId,
        gameId: game.id,
        provider: 'STEAM',
        externalId: '76561198000000001',
        handle: 'frostbyte',
        verifiedAt: new Date('2026-09-01'),
      },
    }),
    prisma.playerGameAccount.upsert({
      where: { provider_externalId: { provider: 'FACEIT', externalId: 'demo-frostbyte' } },
      update: {
        playerId: demoPlayerId,
        gameId: game.id,
        handle: 'frostbyte',
        verifiedAt: new Date('2026-09-01'),
      },
      create: {
        playerId: demoPlayerId,
        gameId: game.id,
        provider: 'FACEIT',
        externalId: 'demo-frostbyte',
        handle: 'frostbyte',
        verifiedAt: new Date('2026-09-01'),
      },
    }),
  ]);

  const careerEpoch = new Date('2024-01-01T00:00:00.000Z');
  for (const [playerIndex, player] of players.entries()) {
    const playerId = playerIds.get(player.id)!;
    const currentTeamId = player.teamId ? teamIds.get(player.teamId)! : null;
    if (!currentTeamId) continue;
    const previousTeam = teams[(playerIndex + teams.length - 1) % teams.length]!;
    const previousTeamId = teamIds.get(previousTeam.id)!;
    const currentStartedAt = new Date(
      Date.UTC(2024, careerEpoch.getUTCMonth() + (playerIndex % 12), 1),
    );
    const previousStartedAt = new Date(Date.UTC(2022 + (playerIndex % 2), playerIndex % 12, 1));
    await prisma.careerHistory.upsert({
      where: {
        playerId_teamId_gameId_startedAt: {
          playerId,
          teamId: previousTeamId,
          gameId: game.id,
          startedAt: previousStartedAt,
        },
      },
      update: {
        endedAt: currentStartedAt,
        role: player.roles[0] ?? 'Player',
        sourceId: dataSource.id,
        verificationLevel: 3,
        evidence: { sourceCode: dataSource.code, type: 'roster_snapshot' },
      },
      create: {
        playerId,
        teamId: previousTeamId,
        gameId: game.id,
        role: player.roles[0] ?? 'Player',
        startedAt: previousStartedAt,
        endedAt: currentStartedAt,
        sourceId: dataSource.id,
        verificationLevel: 3,
        evidence: { sourceCode: dataSource.code, type: 'roster_snapshot' },
      },
    });
    await prisma.careerHistory.upsert({
      where: {
        playerId_teamId_gameId_startedAt: {
          playerId,
          teamId: currentTeamId,
          gameId: game.id,
          startedAt: currentStartedAt,
        },
      },
      update: {
        endedAt: null,
        role: player.roles[0] ?? 'Player',
        sourceId: dataSource.id,
        verificationLevel: 3,
        evidence: { sourceCode: dataSource.code, type: 'official_roster' },
      },
      create: {
        playerId,
        teamId: currentTeamId,
        gameId: game.id,
        role: player.roles[0] ?? 'Player',
        startedAt: currentStartedAt,
        sourceId: dataSource.id,
        verificationLevel: 3,
        evidence: { sourceCode: dataSource.code, type: 'official_roster' },
      },
    });
    const transferChecksum = createHash('sha256')
      .update(`${playerId}:${previousTeamId}:${currentTeamId}:${currentStartedAt.toISOString()}`)
      .digest('hex');
    await prisma.transfer.upsert({
      where: { checksum: transferChecksum },
      update: {
        status: 'CONFIRMED',
        sourceId: dataSource.id,
        verificationLevel: 3,
        evidence: { sourceCode: dataSource.code, type: 'official_roster' },
      },
      create: {
        playerId,
        fromTeamId: previousTeamId,
        toTeamId: currentTeamId,
        transferDate: currentStartedAt,
        status: 'CONFIRMED',
        sourceId: dataSource.id,
        observedAt: currentStartedAt,
        verificationLevel: 3,
        evidence: { sourceCode: dataSource.code, type: 'official_roster' },
        checksum: transferChecksum,
      },
    });
    const verificationId = `10000000-0000-4000-8000-${String(playerIndex + 1).padStart(12, '0')}`;
    await prisma.verification.upsert({
      where: { id: verificationId },
      update: {
        level: player.verificationLevel,
        method: 'DEMO_SOURCE',
        status: 'APPROVED',
        reason: 'Deterministic seed verification',
        decidedAt: currentStartedAt,
      },
      create: {
        id: verificationId,
        subjectType: 'Player',
        subjectId: playerId,
        level: player.verificationLevel,
        method: 'DEMO_SOURCE',
        status: 'APPROVED',
        reason: 'Deterministic seed verification',
        decidedAt: currentStartedAt,
      },
    });
  }

  await prisma.playerPublication.upsert({
    where: { playerId: demoPlayerId },
    update: {
      selfClaimId: demoClaim.id,
      federationId: federation.id,
      photoEvidenceId: photoEvidence.id,
      verificationId: '10000000-0000-4000-8000-000000000001',
      reviewerId: demoReviewer.id,
      status: 'PUBLISHED',
      publicPhotoUrl: '/demo-player-frostbyte.png',
      reason: 'Synthetic demo profile: all publication gates passed',
      publishedAt: new Date('2026-09-02'),
      revokedAt: null,
    },
    create: {
      playerId: demoPlayerId,
      selfClaimId: demoClaim.id,
      federationId: federation.id,
      photoEvidenceId: photoEvidence.id,
      verificationId: '10000000-0000-4000-8000-000000000001',
      reviewerId: demoReviewer.id,
      status: 'PUBLISHED',
      publicPhotoUrl: '/demo-player-frostbyte.png',
      reason: 'Synthetic demo profile: all publication gates passed',
      publishedAt: new Date('2026-09-02'),
    },
  });

  const ratingPublishedAt = new Date('2026-09-02T05:00:00.000Z');
  const playerRatingRun = await prisma.ratingRun.upsert({
    where: {
      engine_formulaVersion_inputCutoff: {
        engine: 'PPR',
        formulaVersion: 'demo-v1',
        inputCutoff: ratingPublishedAt,
      },
    },
    update: { status: 'SUPERSEDED', config: { periodDays: 90 } },
    create: {
      engine: 'PPR',
      formulaVersion: 'demo-v1',
      inputCutoff: ratingPublishedAt,
      checksum: 'demo-ppr-2026-09-02',
      status: 'SUPERSEDED',
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
    update: { status: 'SUPERSEDED', config: { periodDays: 90 } },
    create: {
      engine: 'TPR',
      formulaVersion: 'demo-v1',
      inputCutoff: ratingPublishedAt,
      checksum: 'demo-tpr-2026-09-02',
      status: 'SUPERSEDED',
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

  for (const tournament of tournaments) {
    const tournamentId = tournamentIds.get(tournament.id)!;
    for (const [teamIndex, team] of teams.entries()) {
      const teamId = teamIds.get(team.id)!;
      await prisma.tournamentParticipant.upsert({
        where: { tournamentId_teamId: { tournamentId, teamId } },
        update: { seed: teamIndex + 1, status: 'ACTIVE' },
        create: { tournamentId, teamId, seed: teamIndex + 1, status: 'ACTIVE' },
      });
      if (tournament.status === 'FINISHED') {
        const prizeShares = [0.5, 0.25, 0.125, 0.075, 0.025, 0.015, 0.007, 0.003];
        await prisma.tournamentPlacement.upsert({
          where: { tournamentId_teamId: { tournamentId, teamId } },
          update: {
            placeFrom: teamIndex + 1,
            placeTo: teamIndex + 1,
            prizeAmount: tournament.prizePool * prizeShares[teamIndex]!,
            points: Math.max(10, 100 - teamIndex * 12),
            verifiedAt: tournament.endsAt,
          },
          create: {
            tournamentId,
            teamId,
            placeFrom: teamIndex + 1,
            placeTo: teamIndex + 1,
            prizeAmount: tournament.prizePool * prizeShares[teamIndex]!,
            points: Math.max(10, 100 - teamIndex * 12),
            verifiedAt: tournament.endsAt,
          },
        });
      }
    }
  }

  const mapPool = ['ancient', 'mirage', 'nuke', 'dust2', 'inferno', 'anubis', 'train'];
  for (const [matchIndex, match] of matches.entries()) {
    const matchId = `00000000-0000-4000-8000-${String(matchIndex + 1).padStart(12, '0')}`;
    const tournament = tournaments.find((item) => item.name === match.tournament);
    const tournamentId = tournament ? tournamentIds.get(tournament.id)! : null;
    const homeTeamId = teamIds.get(match.homeTeamId)!;
    const awayTeamId = teamIds.get(match.awayTeamId)!;
    const status = match.status === 'UPCOMING' ? ('SCHEDULED' as const) : match.status;
    const finalizedAt =
      match.status === 'FINISHED'
        ? new Date(new Date(match.startsAt).getTime() + 3 * 60 * 60 * 1000)
        : null;
    const matchData = {
      tournamentId,
      homeTeamId,
      awayTeamId,
      startsAt: match.startsAt,
      status,
      stage: match.stage,
      bestOf: match.bestOf,
      homeScore: match.homeScore ?? null,
      awayScore: match.awayScore ?? null,
      verificationLevel: match.status === 'FINISHED' ? 3 : 1,
      sourceCode: 'arena-demo',
      observedAt: new Date(match.startsAt),
      finalizedAt,
    };
    await prisma.match.upsert({
      where: { id: matchId },
      update: matchData,
      create: { id: matchId, gameId: game.id, ...matchData },
    });

    const mapCount =
      match.status === 'FINISHED'
        ? Math.max(1, (match.homeScore ?? 0) + (match.awayScore ?? 0))
        : match.status === 'LIVE'
          ? 1
          : match.bestOf;
    for (let mapIndex = 0; mapIndex < mapCount; mapIndex += 1) {
      const homeWon = (match.homeScore ?? 0) > (match.awayScore ?? 0);
      const mapFinished = match.status === 'FINISHED';
      const winnerScore = 13 + ((matchIndex + mapIndex) % 3 === 0 ? 3 : 0);
      const loserScore = 6 + ((matchIndex * 2 + mapIndex) % 7);
      await prisma.matchMap.upsert({
        where: { matchId_mapOrder: { matchId, mapOrder: mapIndex + 1 } },
        update: {
          mapKey: mapPool[(matchIndex + mapIndex) % mapPool.length]!,
          homeScore: mapFinished ? (homeWon ? winnerScore : loserScore) : null,
          awayScore: mapFinished ? (homeWon ? loserScore : winnerScore) : null,
          overtime: mapFinished && winnerScore > 13,
          status: mapFinished ? 'FINISHED' : match.status === 'LIVE' ? 'LIVE' : 'SCHEDULED',
        },
        create: {
          matchId,
          mapKey: mapPool[(matchIndex + mapIndex) % mapPool.length]!,
          mapOrder: mapIndex + 1,
          homeScore: mapFinished ? (homeWon ? winnerScore : loserScore) : null,
          awayScore: mapFinished ? (homeWon ? loserScore : winnerScore) : null,
          overtime: mapFinished && winnerScore > 13,
          status: mapFinished ? 'FINISHED' : match.status === 'LIVE' ? 'LIVE' : 'SCHEDULED',
        },
      });
    }

    if (match.status === 'FINISHED' && finalizedAt) {
      const winnerTeamId =
        (match.homeScore ?? 0) > (match.awayScore ?? 0) ? homeTeamId : awayTeamId;
      const checksum = createHash('sha256')
        .update(`${matchId}:${match.homeScore}:${match.awayScore}:arena-demo`)
        .digest('hex');
      await prisma.matchResult.upsert({
        where: { matchId },
        update: {
          winnerTeamId,
          homeScore: match.homeScore!,
          awayScore: match.awayScore!,
          checksum,
          sourceCode: 'arena-demo',
          finalizedAt,
        },
        create: {
          matchId,
          winnerTeamId,
          homeScore: match.homeScore!,
          awayScore: match.awayScore!,
          checksum,
          sourceCode: 'arena-demo',
          finalizedAt,
        },
      });

      const participantPlayers = players.filter(
        (player) => player.teamId === match.homeTeamId || player.teamId === match.awayTeamId,
      );
      for (const player of participantPlayers) {
        const playerIndex = players.findIndex((item) => item.id === player.id);
        const isHome = player.teamId === match.homeTeamId;
        const teamId = isHome ? homeTeamId : awayTeamId;
        const opponentTeamId = isHome ? awayTeamId : homeTeamId;
        const won = winnerTeamId === teamId;
        const kills = 14 + ((playerIndex * 3 + matchIndex) % 17);
        const deaths = 10 + ((playerIndex + matchIndex * 2) % 12);
        const assists = 3 + ((playerIndex * 2 + matchIndex) % 10);
        const rounds = 22 + ((matchIndex + playerIndex) % 9);
        const adr = Number((58 + kills * 1.35 + (won ? 4 : 0)).toFixed(2));
        const kast = Number((61 + ((kills + assists) / Math.max(1, rounds)) * 18).toFixed(2));
        const performanceRating = Number(
          (
            0.72 +
            (kills / Math.max(1, deaths)) * 0.28 +
            assists * 0.006 +
            (won ? 0.04 : 0)
          ).toFixed(3),
        );
        const impact = Number((0.65 + (kills / Math.max(1, rounds)) * 0.7).toFixed(3));
        const headshotRate = Number((32 + ((playerIndex * 7 + matchIndex) % 36)).toFixed(2));
        const openingDuelRate = Number((8 + ((playerIndex * 3 + matchIndex) % 14)).toFixed(2));
        const statisticData = {
          teamId,
          opponentTeamId,
          kills,
          deaths,
          assists,
          rounds,
          performanceRating,
          adr,
          kast,
          impact,
          headshotRate,
          openingDuelRate,
          verifiedAt: finalizedAt,
          sourceCode: 'arena-demo',
          metrics: {
            result: won ? 'win' : 'loss',
            tournamentTier: tournament?.tier ?? 'Regional',
            clutches: (playerIndex + matchIndex) % 3,
            multikills: (playerIndex * 2 + matchIndex) % 5,
          },
        };
        await prisma.playerMatchStatistic.upsert({
          where: {
            playerId_matchId_mapKey: {
              playerId: playerIds.get(player.id)!,
              matchId,
              mapKey: 'all',
            },
          },
          update: statisticData,
          create: {
            playerId: playerIds.get(player.id)!,
            matchId,
            mapKey: 'all',
            ...statisticData,
          },
        });
      }
    }
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

  const achievementRecords = new Map(
    (await prisma.achievement.findMany()).map((item) => [item.code, item]),
  );
  for (const [teamIndex, team] of teams.entries()) {
    const grantedCodes = ['team.loyal_365', ...(teamIndex === 0 ? ['tournament.champion'] : [])];
    for (const code of grantedCodes) {
      const achievement = achievementRecords.get(code)!;
      const source = achievements.find((item) => item.code === code)!;
      await prisma.teamAchievement.upsert({
        where: {
          teamId_achievementId: {
            teamId: teamIds.get(team.id)!,
            achievementId: achievement.id,
          },
        },
        update: {
          progress: source.target,
          target: source.target,
          grantedAt: new Date('2026-08-30T18:00:00.000Z'),
          status: 'GRANTED',
        },
        create: {
          teamId: teamIds.get(team.id)!,
          achievementId: achievement.id,
          progress: source.target,
          target: source.target,
          grantedAt: new Date('2026-08-30T18:00:00.000Z'),
          status: 'GRANTED',
        },
      });
    }
  }

  const periodStart = new Date('2026-06-05T00:00:00.000Z');
  const periodEnd = new Date('2026-09-02T00:00:00.000Z');
  for (const player of players) {
    const playerId = playerIds.get(player.id)!;
    const statistics = await prisma.playerMatchStatistic.findMany({
      where: { playerId, verifiedAt: { not: null } },
      include: { match: { include: { result: true } } },
    });
    if (!statistics.length) continue;
    const total = (key: 'kills' | 'deaths' | 'assists' | 'rounds') =>
      statistics.reduce((sum, item) => sum + (item[key] ?? 0), 0);
    const average = (key: 'adr' | 'kast' | 'performanceRating' | 'impact' | 'headshotRate') =>
      Number(
        (
          statistics.reduce((sum, item) => sum + Number(item[key] ?? 0), 0) / statistics.length
        ).toFixed(3),
      );
    const wins = statistics.filter(
      (item) => item.match.result?.winnerTeamId === item.teamId,
    ).length;
    const aggregateData = {
      sampleMatches: statistics.length,
      sampleMaps: statistics.length,
      rounds: total('rounds'),
      kills: total('kills'),
      deaths: total('deaths'),
      assists: total('assists'),
      wins,
      losses: statistics.length - wins,
      metrics: {
        kd: Number((total('kills') / Math.max(1, total('deaths'))).toFixed(3)),
        adr: average('adr'),
        kast: average('kast'),
        performanceRating: average('performanceRating'),
        impact: average('impact'),
        headshotRate: average('headshotRate'),
      },
    };
    await prisma.playerStatistic.upsert({
      where: {
        playerId_gameId_periodStart_periodEnd: {
          playerId,
          gameId: game.id,
          periodStart,
          periodEnd,
        },
      },
      update: aggregateData,
      create: { playerId, gameId: game.id, periodStart, periodEnd, ...aggregateData },
    });

    const tournamentGroups = new Map<string, typeof statistics>();
    for (const statistic of statistics) {
      if (!statistic.match.tournamentId) continue;
      const group = tournamentGroups.get(statistic.match.tournamentId) ?? [];
      group.push(statistic);
      tournamentGroups.set(statistic.match.tournamentId, group);
    }
    for (const [tournamentId, group] of tournamentGroups) {
      const groupTotal = (key: 'kills' | 'deaths' | 'assists') =>
        group.reduce((sum, item) => sum + (item[key] ?? 0), 0);
      const tournamentData = {
        sampleMatches: group.length,
        sampleMaps: group.length,
        kills: groupTotal('kills'),
        deaths: groupTotal('deaths'),
        assists: groupTotal('assists'),
        metrics: {
          rating: Number(
            (
              group.reduce((sum, item) => sum + Number(item.performanceRating ?? 0), 0) /
              group.length
            ).toFixed(3),
          ),
        },
      };
      await prisma.playerTournamentStatistic.upsert({
        where: { playerId_tournamentId: { playerId, tournamentId } },
        update: tournamentData,
        create: { playerId, tournamentId, ...tournamentData },
      });
    }
  }

  for (const team of teams) {
    const teamId = teamIds.get(team.id)!;
    const teamMatches = await prisma.match.findMany({
      where: {
        status: 'FINISHED',
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: { maps: true, result: true },
      orderBy: { startsAt: 'asc' },
    });
    const wins = teamMatches.filter((match) => match.result?.winnerTeamId === teamId).length;
    let mapsWon = 0;
    let mapsLost = 0;
    let roundsWon = 0;
    let roundsLost = 0;
    for (const match of teamMatches) {
      const home = match.homeTeamId === teamId;
      for (const map of match.maps) {
        const own = home ? (map.homeScore ?? 0) : (map.awayScore ?? 0);
        const other = home ? (map.awayScore ?? 0) : (map.homeScore ?? 0);
        if (own > other) mapsWon += 1;
        else mapsLost += 1;
        roundsWon += own;
        roundsLost += other;
      }
    }
    const teamData = {
      sampleMatches: teamMatches.length,
      wins,
      losses: teamMatches.length - wins,
      mapsWon,
      mapsLost,
      roundsWon,
      roundsLost,
      metrics: {
        winRate: Number((wins / Math.max(1, teamMatches.length)).toFixed(3)),
        roundDifference: roundsWon - roundsLost,
        form: teamMatches
          .slice(-5)
          .map((match) => (match.result?.winnerTeamId === teamId ? 'W' : 'L')),
      },
    };
    await prisma.teamStatistic.upsert({
      where: {
        teamId_gameId_periodStart_periodEnd: { teamId, gameId: game.id, periodStart, periodEnd },
      },
      update: teamData,
      create: { teamId, gameId: game.id, periodStart, periodEnd, ...teamData },
    });
  }

  const computedCutoff = new Date('2026-09-02T08:00:00.000Z');
  const ratingMatches = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      verificationLevel: { gte: 3 },
      startsAt: { lte: computedCutoff },
      homeTeamId: { not: null },
      awayTeamId: { not: null },
      homeScore: { not: null },
      awayScore: { not: null },
    },
    include: { tournament: true },
    orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
  });
  const computedTeamRatings = calculateTprLeaderboard(
    [...teamIds.values()],
    ratingMatches.map((match) => ({
      id: match.id,
      playedAt: match.startsAt.toISOString(),
      homeTeamId: match.homeTeamId!,
      awayTeamId: match.awayTeamId!,
      homeScore: match.homeScore!,
      awayScore: match.awayScore!,
      tournamentCoefficient: ratingTournamentCoefficient(match.tournament?.tier),
      dataQuality: Math.max(0.65, match.verificationLevel / 3),
    })),
    computedCutoff.toISOString(),
  );
  const computedTprChecksum = createHash('sha256')
    .update(JSON.stringify({ formulaVersion: 'tpr-v1.0.0', computedCutoff, computedTeamRatings }))
    .digest('hex');
  const computedTprRun = await prisma.ratingRun.upsert({
    where: {
      engine_formulaVersion_inputCutoff: {
        engine: 'TPR',
        formulaVersion: 'tpr-v1.0.0',
        inputCutoff: computedCutoff,
      },
    },
    update: {
      checksum: computedTprChecksum,
      status: 'PUBLISHED',
      config: { periodDays: 365, cohort: 'cs2-cis' },
    },
    create: {
      engine: 'TPR',
      formulaVersion: 'tpr-v1.0.0',
      inputCutoff: computedCutoff,
      checksum: computedTprChecksum,
      status: 'PUBLISHED',
      config: { periodDays: 365, cohort: 'cs2-cis' },
    },
  });
  for (const item of computedTeamRatings) {
    const previous = await prisma.teamRating.findFirst({
      where: {
        teamId: item.teamId,
        publishedAt: { lt: computedCutoff },
        run: { status: 'PUBLISHED' },
      },
      orderBy: { publishedAt: 'desc' },
    });
    const explanation = {
      delta7d: previous ? item.score - previous.score : 0,
      delta30d: previous ? item.score - previous.score : 0,
      tier: item.tier,
      effectiveMatches: item.effectiveMatches,
      opponentCount: item.opponentCount,
      factors: item.factors.map((factor) => ({ ...factor })),
      form: item.form,
    };
    await prisma.teamRating.upsert({
      where: {
        teamId_gameId_runId: { teamId: item.teamId, gameId: game.id, runId: computedTprRun.id },
      },
      update: {
        score: item.score,
        confidence: item.confidence,
        rank: item.rank,
        explanation,
        publishedAt: computedCutoff,
      },
      create: {
        teamId: item.teamId,
        gameId: game.id,
        runId: computedTprRun.id,
        score: item.score,
        confidence: item.confidence,
        rank: item.rank,
        explanation,
        publishedAt: computedCutoff,
      },
    });
  }

  const tprScores = new Map(computedTeamRatings.map((item) => [item.teamId, item.score]));
  const playersForRating = await prisma.player.findMany({
    where: { status: 'ACTIVE' },
    include: {
      statistics: {
        where: { mapKey: 'all', verifiedAt: { not: null, lte: computedCutoff } },
        include: { match: { include: { result: true, tournament: true } } },
        orderBy: { match: { startsAt: 'asc' } },
      },
    },
  });
  const computedPlayerRatings = playersForRating
    .map((player) => {
      const observations: RatingObservation[] = player.statistics.map((statistic) => ({
        performanceZ: (Number(statistic.performanceRating ?? 1) - 1) / 0.25,
        daysAgo: Math.max(
          0,
          (computedCutoff.getTime() - statistic.match.startsAt.getTime()) / 86_400_000,
        ),
        opponentTpr: statistic.opponentTeamId
          ? (tprScores.get(statistic.opponentTeamId) ?? 500)
          : 500,
        tournamentCoefficient: ratingTournamentCoefficient(statistic.match.tournament?.tier),
        result: statistic.match.result?.winnerTeamId === statistic.teamId ? 'win' : 'loss',
        dataQuality: Math.max(0.65, statistic.match.verificationLevel / 3),
      }));
      const result = calculatePprDetailed(observations);
      const demoPlayer = players.find((item) => playerIds.get(item.id) === player.id);
      return {
        playerId: player.id,
        result,
        roles: demoPlayer?.roles ?? ['Player'],
        form: player.statistics
          .slice(-12)
          .map((statistic) =>
            Math.round(
              Math.min(
                1000,
                Math.max(0, 500 + (Number(statistic.performanceRating ?? 1) - 1) * 300),
              ),
            ),
          ),
      };
    })
    .sort(
      (left, right) =>
        right.result.score - left.result.score || left.playerId.localeCompare(right.playerId),
    )
    .map((item, index) => ({ ...item, rank: index + 1 }));
  const computedPprChecksum = createHash('sha256')
    .update(JSON.stringify({ formulaVersion: 'ppr-v1.0.0', computedCutoff, computedPlayerRatings }))
    .digest('hex');
  const computedPprRun = await prisma.ratingRun.upsert({
    where: {
      engine_formulaVersion_inputCutoff: {
        engine: 'PPR',
        formulaVersion: 'ppr-v1.0.0',
        inputCutoff: computedCutoff,
      },
    },
    update: {
      checksum: computedPprChecksum,
      status: 'PUBLISHED',
      config: { periodDays: 365, cohort: 'cs2-cis' },
    },
    create: {
      engine: 'PPR',
      formulaVersion: 'ppr-v1.0.0',
      inputCutoff: computedCutoff,
      checksum: computedPprChecksum,
      status: 'PUBLISHED',
      config: { periodDays: 365, cohort: 'cs2-cis' },
    },
  });
  for (const item of computedPlayerRatings) {
    const previous = await prisma.playerRating.findFirst({
      where: {
        playerId: item.playerId,
        publishedAt: { lt: computedCutoff },
        run: { status: 'PUBLISHED' },
      },
      orderBy: { publishedAt: 'desc' },
    });
    const explanation = {
      delta7d: previous ? item.result.score - previous.score : 0,
      delta30d: previous ? item.result.score - previous.score : 0,
      tier: item.result.tier,
      effectiveSample: item.result.effectiveSample,
      factors: item.result.factors.map((factor) => ({ ...factor })),
      strongestFactor: item.result.strongestFactor,
      weakestFactor: item.result.weakestFactor,
      form: item.form,
      roles: item.roles,
    };
    await prisma.playerRating.upsert({
      where: {
        playerId_gameId_runId: {
          playerId: item.playerId,
          gameId: game.id,
          runId: computedPprRun.id,
        },
      },
      update: {
        score: item.result.score,
        confidence: item.result.confidence,
        rank: item.rank,
        explanation,
        publishedAt: computedCutoff,
      },
      create: {
        playerId: item.playerId,
        gameId: game.id,
        runId: computedPprRun.id,
        score: item.result.score,
        confidence: item.result.confidence,
        rank: item.rank,
        explanation,
        publishedAt: computedCutoff,
      },
    });
  }

  const achievementMetricByCode: Record<string, string> = {
    'career.first_match': 'matches',
    'career.first_tournament': 'tournaments',
    'career.tournaments_10': 'tournaments',
    'career.tournaments_50': 'tournaments',
    'victory.first': 'wins',
    'victory.10': 'wins',
    'victory.50': 'wins',
    'performance.30_bomb': 'max_kills',
    'performance.40_bomb': 'max_kills',
    'performance.perfect_map': 'perfect_maps',
    'clutch.1v2': 'clutch_1v2',
    'clutch.1v3': 'clutch_1v3',
    'clutch.1v4': 'clutch_1v4',
    'clutch.1v5': 'clutch_1v5',
    'team.loyal_365': 'loyal_days',
    'tournament.first_podium': 'podiums',
    'tournament.champion': 'championships',
    'rating.top_100': 'top_100',
    'rating.top_10': 'top_10',
    'special.mvp': 'mvp_awards',
  };
  const achievementRules: ThresholdRule[] = achievements.map((item) => ({
    code: item.code,
    metric: achievementMetricByCode[item.code] ?? item.code,
    target: item.target,
    minimumVerificationLevel: 3,
    ruleVersion: 1,
  }));
  const verifiedPlacements = await prisma.tournamentPlacement.findMany({
    where: { verifiedAt: { not: null, lte: computedCutoff } },
  });
  for (const player of players) {
    const playerId = playerIds.get(player.id)!;
    const [statistics, tournamentStatistics, career, latestRating] = await Promise.all([
      prisma.playerMatchStatistic.findMany({
        where: { playerId, mapKey: 'all', verifiedAt: { not: null, lte: computedCutoff } },
        include: { match: { include: { result: true } } },
        orderBy: { matchId: 'asc' },
      }),
      prisma.playerTournamentStatistic.findMany({
        where: { playerId, tournament: { endsAt: { lte: computedCutoff } } },
      }),
      prisma.careerHistory.findMany({ where: { playerId }, orderBy: { startedAt: 'asc' } }),
      prisma.playerRating.findFirst({
        where: { playerId, publishedAt: { lte: computedCutoff }, run: { status: 'PUBLISHED' } },
        orderBy: { publishedAt: 'desc' },
      }),
    ]);
    const teamSet = new Set(
      statistics.map((item) => item.teamId).filter((teamId): teamId is string => Boolean(teamId)),
    );
    const tournamentSet = new Set(tournamentStatistics.map((item) => item.tournamentId));
    const placements = verifiedPlacements.filter(
      (item) => teamSet.has(item.teamId) && tournamentSet.has(item.tournamentId),
    );
    const loyalDays = career.reduce((maximum, period) => {
      const end =
        period.endedAt && period.endedAt < computedCutoff ? period.endedAt : computedCutoff;
      return Math.max(
        maximum,
        Math.max(0, Math.floor((end.getTime() - period.startedAt.getTime()) / 86_400_000)),
      );
    }, 0);
    const metrics = {
      matches: new Set(statistics.map((item) => item.matchId)).size,
      tournaments: tournamentSet.size,
      wins: statistics.filter((item) => item.match.result?.winnerTeamId === item.teamId).length,
      max_kills: statistics.reduce((maximum, item) => Math.max(maximum, item.kills ?? 0), 0),
      perfect_maps: 0,
      clutch_1v2: 0,
      clutch_1v3: 0,
      clutch_1v4: 0,
      clutch_1v5: 0,
      loyal_days: loyalDays,
      podiums: placements.filter((item) => item.placeFrom <= 3).length,
      championships: placements.filter((item) => item.placeFrom === 1).length,
      top_100: latestRating?.rank && latestRating.rank <= 100 ? 1 : 0,
      top_10: latestRating?.rank && latestRating.rank <= 10 ? 1 : 0,
      mvp_awards: 0,
    };
    const checksum = createHash('sha256')
      .update(JSON.stringify({ playerId, metrics, achievementRules }))
      .digest('hex');
    const eventKey = `facts:${playerId}:${checksum}`;
    const results = evaluateAchievementCatalog(achievementRules, {
      eventKey,
      type: 'FactsReplayed',
      subjectId: playerId,
      occurredAt: computedCutoff.toISOString(),
      verificationLevel: 3,
      metrics,
      evidenceKeys: statistics.map((item) => item.matchId),
    });
    await prisma.achievementEvent.upsert({
      where: { eventKey },
      update: { processedAt: new Date() },
      create: {
        eventKey,
        eventType: 'FactsReplayed',
        subjectType: 'Player',
        subjectId: playerId,
        occurredAt: computedCutoff,
        checksum,
        payload: { metrics, ruleCount: achievementRules.length },
        processedAt: new Date(),
      },
    });
    for (const result of results) {
      const definition = achievementRecords.get(result.code)!;
      const existing = await prisma.playerAchievement.findUnique({
        where: { playerId_achievementId: { playerId, achievementId: definition.id } },
      });
      const status = result.granted
        ? 'GRANTED'
        : result.provisional
          ? 'PROVISIONAL'
          : existing?.status === 'GRANTED'
            ? 'REVOKED'
            : 'LOCKED';
      await prisma.playerAchievement.upsert({
        where: { playerId_achievementId: { playerId, achievementId: definition.id } },
        update: {
          progress: result.progress,
          target: result.target,
          grantedAt: result.granted ? (existing?.grantedAt ?? computedCutoff) : null,
          status,
          evidence: { eventKey, evidenceKeys: result.evidenceKeys, checksum },
          evaluationKey: eventKey,
          verificationLevel: result.granted ? 3 : 0,
          firstQualifiedAt: result.firstQualifiedAt
            ? new Date(result.firstQualifiedAt)
            : (existing?.firstQualifiedAt ?? null),
          ruleVersion: result.ruleVersion,
        },
        create: {
          playerId,
          achievementId: definition.id,
          progress: result.progress,
          target: result.target,
          grantedAt: result.granted ? computedCutoff : null,
          status,
          evidence: { eventKey, evidenceKeys: result.evidenceKeys, checksum },
          evaluationKey: eventKey,
          verificationLevel: result.granted ? 3 : 0,
          firstQualifiedAt: result.firstQualifiedAt ? new Date(result.firstQualifiedAt) : null,
          ruleVersion: result.ruleVersion,
        },
      });
    }
  }

  console.log(
    `Seeded ${roleDefinitions.length} roles, ${permissionDefinitions.length} permissions, ${players.length} players with career/PPR/achievements, ${teams.length} teams with TPR/stats, ${tournaments.length} tournaments, ${matches.length} matches and ${achievements.length} achievement definitions.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
