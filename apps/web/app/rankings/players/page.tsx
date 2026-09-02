import { players } from '@arena/demo-data';
import type { Metadata } from 'next';
import { PlayerRankingTable } from '@/components/ranking-table';
import { RankingsShell } from '@/components/rankings-shell';

export const metadata: Metadata = {
  title: 'Рейтинг игроков CS2',
  description: 'PPR-рейтинг игроков CS2 России и стран СНГ с confidence и динамикой формы.',
};
export default function PlayerRankingsPage() {
  return (
    <RankingsShell active="players">
      <PlayerRankingTable items={players} />
    </RankingsShell>
  );
}
