type DemoEntity = { id: string; slug: string; name: string };

const playerNames = [
  'frostbyte',
  'veles',
  'qbit',
  'sable',
  'aurora',
  'nomad',
  'pulse',
  'onyx',
  'vector',
  'zenith',
];
const teamNames = [
  'Northern Lights',
  'Volna',
  'Red Vertex',
  'Taiga Core',
  'Nomad Five',
  'Ararat Force',
  'Steppe Elite',
  'Neon Bears',
];

export const players = Array.from({ length: 40 }, (_, index) => ({
  id: `player-${index + 1}`,
  slug: playerNames[index] ?? `player-${index + 1}`,
  nickname: playerNames[index] ?? `player${index + 1}`,
  rating: { score: 842 - index * 8, rank: index + 1, confidence: Math.max(50, 94 - index) },
}));

export const teams = teamNames.map((name, index) => ({
  id: `team-${index + 1}`,
  slug: name.toLowerCase().replaceAll(' ', '-'),
  name,
  rating: { score: 872 - index * 34, rank: index + 1, confidence: 92 - index * 4 },
}));

export const matches = Array.from({ length: 30 }, (_, index) => ({
  id: `match-${index + 1}`,
  status: index < 2 ? 'LIVE' : index < 12 ? 'UPCOMING' : 'FINISHED',
}));
export const tournaments: DemoEntity[] = [
  'Eurasia Masters 2026',
  'CIS Challenger: Autumn',
  'Northern Cup 2026',
].map((name, index) => ({
  id: `tournament-${index + 1}`,
  slug: name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-'),
  name,
}));
export const demoCounts = {
  players: 40,
  teams: 8,
  tournaments: 3,
  matches: 30,
  achievements: 20,
} as const;
export const playerBySlug = (slug: string) => players.find((player) => player.slug === slug);
export const teamBySlug = (slug: string) => teams.find((team) => team.slug === slug);
