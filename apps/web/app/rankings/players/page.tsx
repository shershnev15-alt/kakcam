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
    <RankingsShell active="players" ratingRun={result.meta.ratingRun}>
      {result.data.length ? (
        <PlayerRankingTable items={result.data} />
      ) : (
        <div className="surface py-16 text-center">
          <h2 className="text-xl font-bold">Публичный PPR пока пуст</h2>
          <p className="muted mx-auto mt-2 max-w-xl text-sm">
            Рейтинг показывает только игроков с self-claim, подтвержденным профилем, фотографией,
            Steam и FACEIT.
          </p>
        </div>
      )}
    </RankingsShell>
  );
}
