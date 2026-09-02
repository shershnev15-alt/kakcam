import type { Metadata } from 'next';
import { DirectoryForm } from '@/components/directory-form';
import { Pagination } from '@/components/pagination';
import { Sparkline, TeamCard } from '@/components/ui';
import { getTeams } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Команды CS2 России и СНГ',
  description: 'Каталог команд с составами, формой, верификацией и рейтингом TPR.',
  alternates: { canonical: '/teams' },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const value = (input: string | string[] | undefined) =>
  typeof input === 'string' ? input : undefined;

export default async function TeamsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const params = {
    q: value(raw.q),
    country: value(raw.country),
    city: value(raw.city),
    discipline: value(raw.discipline) ?? 'cs2',
    sort: value(raw.sort) ?? 'rating',
    page: value(raw.page) ?? '1',
  };
  const result = await getTeams({ ...params, pageSize: 20 });

  return (
    <div className="container py-9 md:py-12">
      <header className="grid gap-6 border-b border-[var(--border)] pb-8 lg:grid-cols-[1fr_420px] lg:items-end">
        <div>
          <p className="eyebrow">cyberID directory · CS2</p>
          <h1 className="display-title mt-5 text-[72px] md:text-[104px]">Команды</h1>
          <p className="muted mt-5 max-w-2xl leading-7">
            TPR, форма и стабильность состава в одном рейтинговом контуре.
          </p>
        </div>
        <div className="surface p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[.12em] text-[var(--text-3)]">
                Динамика TPR региона
              </p>
              <strong className="data-number mt-2 block text-3xl text-[var(--brand)]">+4.8%</strong>
            </div>
            <span className="text-xs text-[var(--text-3)]">30 дней</span>
          </div>
          <Sparkline
            values={
              result.data[0]?.form.map((item, index) =>
                item === 'W' ? 70 + index * 5 : 48 + index * 3,
              ) ?? [0, 0]
            }
            className="mt-3 h-16 w-full"
          />
        </div>
      </header>
      <div className="mt-8">
        <DirectoryForm action="/teams" kind="teams" values={params} />
        <div className="mb-4 flex items-center justify-between text-sm text-[var(--text-3)]">
          <span>Найдено: {result.meta.total}</span>
          <span>Страница {result.meta.page}</span>
        </div>
        {result.data.length ? (
          <div className="grid gap-2 lg:grid-cols-2">
            {result.data.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        ) : (
          <div className="surface py-16 text-center">
            <h2 className="text-xl font-bold">Команды не найдены</h2>
            <p className="muted mt-2 text-sm">Измените поиск или фильтр страны.</p>
          </div>
        )}
        <Pagination
          page={result.meta.page}
          totalPages={result.meta.totalPages}
          pathname="/teams"
          params={params}
        />
      </div>
    </div>
  );
}
