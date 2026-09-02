import { teams } from '@arena/demo-data';
import type { Metadata } from 'next';
import { TeamRankingTable } from '@/components/ranking-table';
import { RankingsShell } from '@/components/rankings-shell';

export const metadata: Metadata = {
  title: 'Рейтинг команд CS2',
  description: 'TPR-рейтинг команд CS2 России и стран СНГ с confidence и формой.',
};
export default function TeamRankingsPage() {
  return (
    <RankingsShell active="teams">
      <TeamRankingTable items={teams} />
    </RankingsShell>
  );
}
