import { players, teams, tournaments } from '@arena/demo-data';
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://arena-passport.example';
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/players`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/teams`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/matches`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/tournaments`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/transfers`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/rankings/players`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/rankings/teams`, changeFrequency: 'daily', priority: 0.9 },
    ...players.map((player) => ({
      url: `${base}/players/${player.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...players.flatMap((player) => [
      {
        url: `${base}/players/${player.slug}/achievements`,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      },
      {
        url: `${base}/players/${player.slug}/career`,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      },
    ]),
    ...teams.map((team) => ({
      url: `${base}/teams/${team.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...tournaments.map((tournament) => ({
      url: `${base}/tournaments/${tournament.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];
}
