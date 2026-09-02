import type { Metadata } from 'next';
import { PlayerRankingTable } from '@/components/ranking-table';
import { RankingsShell } from '@/components/rankings-shell';
import { getPlayerRankings } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Рейтинг игроков CS2',
  description: 'PPR-рейтинг игроков CS2 России и стран СНГ с confidence и динамикой формы.',
  alternates: { canonical: '/rankings/players' },
};
export default async function PlayerRankingsPage() {
  const result = await getPlayerRankings({ pageSize: 40 });
  return (
    <RankingsShell active="players">
      <PlayerRankingTable items={result.data} />
    </RankingsShell>
  );
}
