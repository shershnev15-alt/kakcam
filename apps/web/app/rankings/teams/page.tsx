import type { Metadata } from 'next';
import { TeamRankingTable } from '@/components/ranking-table';
import { RankingsShell } from '@/components/rankings-shell';
import { getTeamRankings } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Рейтинг команд CS2',
  description: 'TPR-рейтинг команд CS2 России и стран СНГ с confidence и формой.',
  alternates: { canonical: '/rankings/teams' },
};
export default async function TeamRankingsPage() {
  const result = await getTeamRankings({ pageSize: 20 });
  return (
    <RankingsShell active="teams" ratingRun={result.meta.ratingRun}>
      <TeamRankingTable items={result.data} />
    </RankingsShell>
  );
}
