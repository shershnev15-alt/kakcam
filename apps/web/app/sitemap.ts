import {
  players as demoPlayers,
  teams as demoTeams,
  tournaments as demoTournaments,
} from '@arena/demo-data';
import type { MetadataRoute } from 'next';
import { getMatches, getPlayers, getTeams, getTournaments } from '@/lib/api';
import { siteUrl } from '@/lib/seo';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl;
  let players: Array<{ slug: string }> = demoPlayers;
  let teams: Array<{ slug: string }> = demoTeams;
  let tournaments: Array<{ slug: string }> = demoTournaments;
  let matches: Array<{ id: string }> = [];
  try {
    const [playerPage, teamPage, tournamentPage, matchPage] = await Promise.all([
      getPlayers({ pageSize: 50 }),
      getTeams({ pageSize: 50 }),
      getTournaments({ pageSize: 50 }),
      getMatches({ pageSize: 50 }),
    ]);
    players = playerPage.data;
    teams = teamPage.data;
    tournaments = tournamentPage.data;
    matches = matchPage.data;
  } catch {
    // Directory URLs remain available during a temporary API outage; match IDs are never guessed.
  }
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
    ...matches.map((match) => ({
      url: `${base}/matches/${match.id}`,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    })),
    ...tournaments.map((tournament) => ({
      url: `${base}/tournaments/${tournament.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];
}
