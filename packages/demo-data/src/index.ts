import type {
  AchievementSummary,
  MatchSummary,
  PlayerSummary,
  TeamSummary,
  TournamentSummary,
} from '@arena/types';

const countryCycle = [
  ['RU', 'Россия'],
  ['KZ', 'Казахстан'],
  ['BY', 'Беларусь'],
  ['AM', 'Армения'],
  ['UZ', 'Узбекистан'],
  ['KG', 'Кыргызстан'],
] as const;

type DemoTeamTuple = [
  slug: string,
  name: string,
  shortName: string,
  countryCode: string,
  countryName: string,
  foundedYear: number,
  score: number,
  confidence: number,
  rank: number,
  form: Array<'W' | 'L'>,
];

const teamRows: DemoTeamTuple[] = [
  [
    'northern-lights',
    'Northern Lights',
    'NRTH',
    'RU',
    'Россия',
    2019,
    872,
    92,
    1,
    ['W', 'W', 'L', 'W', 'W'],
  ],
  ['volna', 'Volna', 'VLN', 'KZ', 'Казахстан', 2020, 821, 88, 2, ['W', 'L', 'W', 'W', 'L']],
  [
    'red-vertex',
    'Red Vertex',
    'RVX',
    'BY',
    'Беларусь',
    2018,
    798,
    86,
    3,
    ['W', 'W', 'L', 'L', 'W'],
  ],
  ['taiga-core', 'Taiga Core', 'TGC', 'RU', 'Россия', 2021, 764, 79, 4, ['L', 'W', 'W', 'L', 'W']],
  [
    'nomad-five',
    'Nomad Five',
    'N5',
    'UZ',
    'Узбекистан',
    2022,
    735,
    74,
    5,
    ['W', 'L', 'L', 'W', 'W'],
  ],
  [
    'ararat-force',
    'Ararat Force',
    'ARF',
    'AM',
    'Армения',
    2020,
    701,
    72,
    6,
    ['L', 'W', 'L', 'W', 'L'],
  ],
  [
    'steppe-elite',
    'Steppe Elite',
    'STP',
    'KG',
    'Кыргызстан',
    2023,
    668,
    64,
    7,
    ['W', 'L', 'W', 'L', 'L'],
  ],
  ['neon-bears', 'Neon Bears', 'NBR', 'RU', 'Россия', 2024, 624, 58, 8, ['L', 'L', 'W', 'L', 'W']],
];

export const teams: TeamSummary[] = teamRows.map(
  (
    [slug, name, shortName, countryCode, countryName, foundedYear, score, confidence, rank, form],
    index,
  ) => ({
    id: `team-${index + 1}`,
    slug,
    name,
    shortName,
    countryCode,
    countryName,
    foundedYear,
    verificationLevel: index < 3 ? 5 : index < 6 ? 3 : 1,
    rating: {
      score,
      confidence,
      rank,
      delta7d: index % 2 === 0 ? 2 : -1,
      delta30d: 8 - index * 2,
      tier: score >= 800 ? 'Master' : score >= 700 ? 'Elite' : 'Pro',
    },
    form,
  }),
);

const featuredPlayers: Array<{
  nickname: string;
  realName: string;
  role: string;
  score: number;
  age: number;
}> = [
  { nickname: 'frostbyte', realName: 'Алексей Морозов', role: 'AWP', score: 842, age: 23 },
  { nickname: 'veles', realName: 'Илья Соколов', role: 'Rifler', score: 827, age: 21 },
  { nickname: 'qbit', realName: 'Тимур Абаев', role: 'Entry', score: 813, age: 20 },
  { nickname: 'sable', realName: 'Максим Чернов', role: 'IGL', score: 801, age: 26 },
  { nickname: 'aurora', realName: 'Егор Светлов', role: 'Rifler', score: 789, age: 19 },
  { nickname: 'nomad', realName: 'Данияр Каримов', role: 'Lurker', score: 776, age: 24 },
  { nickname: 'pulse', realName: 'Никита Волков', role: 'Support', score: 768, age: 22 },
  { nickname: 'onyx', realName: 'Арсен Мкртчян', role: 'AWP', score: 754, age: 23 },
  { nickname: 'vector', realName: 'Павел Орлов', role: 'Entry', score: 746, age: 18 },
  { nickname: 'zenith', realName: 'Руслан Алиев', role: 'Rifler', score: 739, age: 25 },
];

const generatedNicknames = [
  'ember',
  'north',
  'mirage',
  'dusk',
  'orbit',
  'rune',
  'shift',
  'slate',
  'pixel',
  'aero',
  'striker',
  'drift',
  'echo',
  'flux',
  'kaizen',
  'lumen',
  'mako',
  'nova',
  'oxide',
  'prism',
  'quartz',
  'relay',
  'storm',
  'trace',
  'umbra',
  'vortex',
  'warden',
  'xeno',
  'yonder',
  'zero',
];

export const players: PlayerSummary[] = Array.from({ length: 40 }, (_, index) => {
  const featured = featuredPlayers[index];
  const team = teams[index % teams.length]!;
  const country = countryCycle[index % countryCycle.length]!;
  const nickname = featured?.nickname ?? generatedNicknames[index - featuredPlayers.length]!;
  const score = featured?.score ?? 730 - (index - 10) * 9;
  const role = featured?.role ?? ['Rifler', 'Support', 'Entry', 'AWP', 'IGL'][index % 5]!;
  return {
    id: `player-${index + 1}`,
    slug: nickname,
    nickname,
    ...(featured?.realName ? { realName: featured.realName } : {}),
    countryCode: country[0],
    countryName: country[1],
    age: featured?.age ?? 18 + (index % 10),
    teamId: team.id,
    teamName: team.name,
    teamShortName: team.shortName,
    roles: [role],
    verificationLevel: index < 5 ? 5 : index < 18 ? 3 : 1,
    rating: {
      score,
      confidence: Math.max(46, 94 - index),
      rank: index + 1,
      delta7d: index % 4 === 0 ? 4 : index % 3 === 0 ? -2 : 1,
      delta30d: 23 - index,
      tier: score >= 800 ? 'Master' : score >= 700 ? 'Elite' : score >= 600 ? 'Pro' : 'Contender',
    },
    form: Array.from(
      { length: 12 },
      (_, point) => score - 38 + point * 4 + ((index + point) % 4) * 7,
    ),
  };
});

export const tournaments: TournamentSummary[] = [
  {
    id: 'tournament-1',
    slug: 'eurasia-masters-2026',
    name: 'Eurasia Masters 2026',
    tier: 'International',
    mode: 'LAN',
    startsAt: '2026-09-07T09:00:00.000Z',
    endsAt: '2026-09-14T18:00:00.000Z',
    prizePool: 250000,
    currency: 'USD',
    status: 'UPCOMING',
    participantCount: teams.length,
    matchCount: 10,
  },
  {
    id: 'tournament-2',
    slug: 'cis-challenger-autumn',
    name: 'CIS Challenger: Autumn',
    tier: 'Regional',
    mode: 'Online',
    startsAt: '2026-09-18T12:00:00.000Z',
    endsAt: '2026-09-28T18:00:00.000Z',
    prizePool: 50000,
    currency: 'USD',
    status: 'UPCOMING',
    participantCount: teams.length,
    matchCount: 10,
  },
  {
    id: 'tournament-3',
    slug: 'northern-cup-2026',
    name: 'Northern Cup 2026',
    tier: 'National',
    mode: 'Hybrid',
    startsAt: '2026-08-20T10:00:00.000Z',
    endsAt: '2026-08-30T18:00:00.000Z',
    prizePool: 100000,
    currency: 'USD',
    status: 'FINISHED',
    participantCount: teams.length,
    matchCount: 10,
  },
];

export const matches: MatchSummary[] = Array.from({ length: 30 }, (_, index) => {
  const status: MatchSummary['status'] = index < 2 ? 'LIVE' : index < 12 ? 'UPCOMING' : 'FINISHED';
  const home = teams[index % teams.length]!;
  const away = teams[(index + 3) % teams.length]!;
  const bestOf = index % 4 === 0 ? 3 : 1;
  const startsAt =
    status === 'FINISHED'
      ? new Date(Date.UTC(2026, 7, 12 + Math.floor((index - 12) / 2), 13 + (index % 2) * 3))
      : new Date(Date.UTC(2026, 8, 2 + Math.floor(index / 3), 10 + (index % 3) * 3));
  return {
    id: `match-${index + 1}`,
    startsAt: startsAt.toISOString(),
    status,
    tournament: tournaments[index % tournaments.length]!.name,
    stage: index % 4 === 0 ? 'Playoffs' : 'Group stage',
    bestOf,
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeTeam: {
      id: home.id,
      slug: home.slug,
      name: home.name,
      shortName: home.shortName,
    },
    awayTeam: {
      id: away.id,
      slug: away.slug,
      name: away.name,
      shortName: away.shortName,
    },
    verificationLevel: status === 'FINISHED' ? 3 : 1,
    ...(status !== 'UPCOMING'
      ? {
          homeScore: status === 'LIVE' ? 1 : index % 2 === 0 ? Math.ceil(bestOf / 2) : 0,
          awayScore: status === 'LIVE' ? 0 : index % 2 === 0 ? 0 : Math.ceil(bestOf / 2),
        }
      : {}),
  };
});

export const achievements: AchievementSummary[] = [
  ['career.first_match', 'Первый матч', 'Первый подтвержденный матч', 'CAREER', 'Common', 1, 1],
  [
    'career.first_tournament',
    'Турнирный дебют',
    'Первый подтвержденный турнир',
    'CAREER',
    'Common',
    1,
    1,
  ],
  ['career.tournaments_10', 'Постоянный участник', 'Сыграть 10 турниров', 'CAREER', 'Rare', 10, 10],
  ['career.tournaments_50', 'Ветеран тура', 'Сыграть 50 турниров', 'CAREER', 'Epic', 34, 50],
  ['victory.first', 'Первая победа', 'Выиграть первый матч', 'VICTORIES', 'Common', 1, 1],
  ['victory.10', 'Победная привычка', 'Выиграть 10 матчей', 'VICTORIES', 'Rare', 10, 10],
  ['victory.50', 'Проверенный победитель', 'Выиграть 50 матчей', 'VICTORIES', 'Epic', 42, 50],
  ['performance.30_bomb', '30 Bomb', '30 убийств на карте', 'PERFORMANCE', 'Rare', 1, 1],
  ['performance.40_bomb', '40 Bomb', '40 убийств на карте', 'PERFORMANCE', 'Epic', 0, 1],
  [
    'performance.perfect_map',
    'Идеальная карта',
    'Выдающаяся карта без провалов',
    'PERFORMANCE',
    'Legendary',
    0,
    1,
  ],
  ['clutch.1v2', 'Один против двух', 'Выиграть клатч 1v2', 'CLUTCH', 'Rare', 1, 1],
  ['clutch.1v3', 'Один против трех', 'Выиграть клатч 1v3', 'CLUTCH', 'Epic', 1, 1],
  ['clutch.1v4', 'Один против четырех', 'Выиграть клатч 1v4', 'CLUTCH', 'Legendary', 0, 1],
  ['clutch.1v5', 'Один против всех', 'Выиграть клатч 1v5', 'CLUTCH', 'Mythic', 0, 1],
  ['team.loyal_365', 'Верность команде', 'Год в одном составе', 'TEAM', 'Rare', 365, 365],
  ['tournament.first_podium', 'Первый подиум', 'Занять место в топ-3', 'TOURNAMENT', 'Rare', 1, 1],
  ['tournament.champion', 'Чемпион', 'Выиграть подтвержденный турнир', 'TOURNAMENT', 'Epic', 1, 1],
  ['rating.top_100', 'Топ-100', 'Войти в топ-100 PPR', 'RATING', 'Rare', 1, 1],
  ['rating.top_10', 'Топ-10', 'Войти в топ-10 PPR', 'RATING', 'Legendary', 0, 1],
  ['special.mvp', 'MVP', 'Стать MVP турнира', 'SPECIAL', 'Legendary', 1, 1],
].map(([code, title, description, category, rarity, progress, target]) => ({
  code: code as string,
  title: title as string,
  description: description as string,
  category: category as string,
  rarity: rarity as AchievementSummary['rarity'],
  progress: progress as number,
  target: target as number,
}));

export function teamById(id: string): TeamSummary {
  return teams.find((team) => team.id === id) ?? teams[0]!;
}

export function playerBySlug(slug: string): PlayerSummary | undefined {
  return players.find((player) => player.slug === slug);
}

export function teamBySlug(slug: string): TeamSummary | undefined {
  return teams.find((team) => team.slug === slug);
}

export const demoCounts = {
  players: players.length,
  teams: teams.length,
  tournaments: tournaments.length,
  matches: matches.length,
  achievements: achievements.length,
} as const;
