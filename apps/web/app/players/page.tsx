import type { Metadata } from 'next';
import { DirectoryForm } from '@/components/directory-form';
import { Pagination } from '@/components/pagination';
import { PlayerCard } from '@/components/ui';
import { getPlayers } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Игроки CS2 России и СНГ',
  description: 'Каталог проверяемых профилей киберспортсменов с PPR, командами и ролями.',
  alternates: { canonical: '/players' },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const value = (input: string | string[] | undefined) =>
  typeof input === 'string' ? input : undefined;

export default async function PlayersPage({ searchParams }: Props) {
  const raw = await searchParams;
  const params = {
    q: value(raw.q),
    country: value(raw.country),
    sort: value(raw.sort) ?? 'rating',
    page: value(raw.page) ?? '1',
  };
  const result = await getPlayers({ ...params, pageSize: 20 });

  return (
    <div className="container py-10 md:py-14">
      <p className="eyebrow">Directory · PostgreSQL</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-.04em] md:text-6xl">Игроки</h1>
      <p className="muted mt-4 max-w-2xl leading-7">
        Только полностью подтверждённые профили: self-claim, местная федерация, фото, Steam и
        FACEIT.
      </p>
      <div className="mt-8">
        <DirectoryForm action="/players" values={params} />
        <div className="mb-4 flex items-center justify-between text-sm text-[var(--text-3)]">
          <span>Найдено: {result.meta.total}</span>
          <span>Страница {result.meta.page}</span>
        </div>
        {result.data.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {result.data.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        ) : (
          <div className="surface py-16 text-center">
            <h2 className="text-xl font-bold">Нет игроков с полным допуском</h2>
            <p className="muted mx-auto mt-2 max-w-xl text-sm">
              В общий доступ попадают только игроки, выполнившие все пять условий верификации.
              Измените фильтры или завершите проверку профиля.
            </p>
          </div>
        )}
        <Pagination
          page={result.meta.page}
          totalPages={result.meta.totalPages}
          pathname="/players"
          params={params}
        />
      </div>
    </div>
  );
}
