import type { Metadata } from 'next';
import { DirectoryForm } from '@/components/directory-form';
import { Pagination } from '@/components/pagination';
import { PlayerCard, Sparkline } from '@/components/ui';
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
    <div className="container py-9 md:py-12">
      <header className="grid gap-6 border-b border-[var(--border)] pb-8 lg:grid-cols-[1fr_420px] lg:items-end">
        <div>
          <p className="eyebrow">cyberID directory · CS2</p>
          <h1 className="display-title mt-5 text-[72px] md:text-[104px]">Игроки</h1>
          <p className="muted mt-5 max-w-2xl leading-7">
            В общий доступ попадают только игроки с self-claim, подтверждением местной федерации,
            обязательным фото и проверенными аккаунтами Steam и FACEIT.
          </p>
        </div>
        <div className="surface p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[.12em] text-[var(--text-3)]">
                Средняя динамика PPR
              </p>
              <strong className="data-number mt-2 block text-3xl text-[var(--brand)]">+6.1%</strong>
            </div>
            <span className="text-xs text-[var(--text-3)]">30 дней</span>
          </div>
          <Sparkline values={result.data[0]?.form ?? [0, 0]} className="mt-3 h-16 w-full" />
        </div>
      </header>
      <div className="mt-8">
        <DirectoryForm action="/players" kind="players" values={params} />
        <div className="mb-4 flex items-center justify-between text-sm text-[var(--text-3)]">
          <span>Найдено: {result.meta.total}</span>
          <span>Страница {result.meta.page}</span>
        </div>
        {result.data.length ? (
          <>
            <div className="mb-5 grid gap-2 lg:grid-cols-3">
              {result.data.slice(0, 3).map((player) => (
                <PlayerCard key={`top-${player.id}`} player={player} />
              ))}
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              {result.data.slice(3).map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </div>
          </>
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
