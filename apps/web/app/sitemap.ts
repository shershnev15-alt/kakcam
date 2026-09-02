import { players, teams } from '@arena/demo-data';
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://arena-passport.example';
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/rankings/players`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/rankings/teams`, changeFrequency: 'daily', priority: 0.9 },
    ...players.map((player) => ({
      url: `${base}/players/${player.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...teams.map((team) => ({
      url: `${base}/teams/${team.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];
}
