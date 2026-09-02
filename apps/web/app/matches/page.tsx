import type { Metadata } from 'next';
import Link from 'next/link';
import { MatchCard } from '@/components/match-card';
import { Pagination } from '@/components/pagination';
import { getMatches } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Матчи CS2 России и СНГ',
  description: 'Расписание, live-матчи и подтвержденные результаты команд cyberID.',
  alternates: { canonical: '/matches' },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const value = (input: string | string[] | undefined) =>
  typeof input === 'string' ? input : undefined;

export default async function MatchesPage({ searchParams }: Props) {
  const raw = await searchParams;
  const status = value(raw.status);
  const page = value(raw.page) ?? '1';
  const result = await getMatches({ status, page, pageSize: 12 });
  const tabs = [
    ['Все', undefined],
    ['Live', 'LIVE'],
    ['Скоро', 'UPCOMING'],
    ['Завершённые', 'FINISHED'],
  ] as const;

  return (
    <div className="container min-h-[70vh] py-10 md:py-14">
      <p className="eyebrow">cyberID match center · live</p>
      <h1 className="display-title mt-5 text-[72px] md:text-[104px]">Матчи</h1>
      <p className="muted mt-4 max-w-2xl leading-7">
        Расписание, live-серии и неизменяемые подтвержденные результаты с картами и статистикой.
      </p>
      <nav aria-label="Статус матчей" className="mt-8 flex flex-wrap gap-2">
        {tabs.map(([label, tabStatus]) => {
          const active = status === tabStatus || (!status && !tabStatus);
          return (
            <Link
              key={label}
              href={tabStatus ? `/matches?status=${tabStatus}` : '/matches'}
              className={`border px-4 py-2 text-sm font-semibold ${
                active
                  ? 'border-[var(--brand)] bg-[var(--brand)] text-[#101512]'
                  : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-2)]'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mb-4 mt-8 flex justify-between text-sm text-[var(--text-3)]">
        <span>Найдено: {result.meta.total}</span>
        <span>Страница {result.meta.page}</span>
      </div>
      {result.data.length ? (
        <div className="grid gap-2 lg:grid-cols-3">
          {result.data.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : (
        <div className="surface py-16 text-center">
          <h2 className="text-xl font-bold">Матчей в этом разделе нет</h2>
          <p className="muted mt-2 text-sm">Выберите другой статус.</p>
        </div>
      )}
      <Pagination
        page={result.meta.page}
        totalPages={result.meta.totalPages}
        pathname="/matches"
        params={{ status, page }}
      />
    </div>
  );
}
