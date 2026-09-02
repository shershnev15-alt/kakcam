import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { achievements, matches, players, teams, tournaments } from '@arena/demo-data';
import {
  calculatePprDetailed,
  calculateTprLeaderboard,
  type RatingObservation,
} from '@arena/rating-engine';
import { createHash } from 'node:crypto';

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
  [
    'ORGANIZER',
    'Организатор',
    ['team.create', 'team.update', 'match.create', 'match.update', 'tournament.manage'],
  ],
  [
    'STATISTICIAN',
    'Статистик',
    ['player.create', 'player.update', 'team.create', 'team.update', 'match.update', 'rating.run'],
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
      'match.create',
      'match.update',
      'match.verify',
      'tournament.manage',
      'rating.run',
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
      'match.create',
      'match.update',
      'match.verify',
      'tournament.manage',
      'rating.run',
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

  await prisma.dataSource.upsert({
    where: { code: 'arena-demo' },
    update: { name: 'Arena Passport deterministic demo', type: 'INTERNAL', trustLevel: 3 },
    create: {
      code: 'arena-demo',
      name: 'Arena Passport deterministic demo',
      type: 'INTERNAL',
      trustLevel: 3,
    },
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
  for (const [playerIndex, player] of players.entries()) {
    const grantedCodes = [
      'career.first_match',
      'career.first_tournament',
      'victory.first',
      'rating.top_100',
      'team.loyal_365',
      ...(playerIndex < 15 ? ['performance.30_bomb'] : []),
      ...(playerIndex < 10 ? ['rating.top_10'] : []),
      ...(playerIndex < 3 ? ['special.mvp'] : []),
    ];
    for (const code of grantedCodes) {
      const achievement = achievementRecords.get(code)!;
      const source = achievements.find((item) => item.code === code)!;
      await prisma.playerAchievement.upsert({
        where: {
          playerId_achievementId: {
            playerId: playerIds.get(player.id)!,
            achievementId: achievement.id,
          },
        },
        update: {
          progress: source.target,
          target: source.target,
          grantedAt: new Date('2026-08-30T18:00:00.000Z'),
          status: 'GRANTED',
          evidence: { sourceCode: 'arena-demo', verified: true },
        },
        create: {
          playerId: playerIds.get(player.id)!,
          achievementId: achievement.id,
          progress: source.target,
          target: source.target,
          grantedAt: new Date('2026-08-30T18:00:00.000Z'),
          status: 'GRANTED',
          evidence: { sourceCode: 'arena-demo', verified: true },
        },
      });
    }
  }

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

  console.log(
    `Seeded ${roleDefinitions.length} roles, ${permissionDefinitions.length} permissions, ${players.length} players with PPR/stats, ${teams.length} teams with TPR/stats, ${tournaments.length} tournaments, ${matches.length} matches and ${achievements.length} achievements.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
