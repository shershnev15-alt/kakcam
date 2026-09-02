import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowIcon } from '@/components/icons';
import { Pagination } from '@/components/pagination';
import { getTournaments } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Турниры CS2 России и СНГ',
  description: 'Календарь турниров, участники, призовые и подтвержденные места.',
  alternates: { canonical: '/tournaments' },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function TournamentsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const status = typeof raw.status === 'string' ? raw.status : undefined;
  const page = typeof raw.page === 'string' ? raw.page : '1';
  const result = await getTournaments({ status, page, pageSize: 12 });
  return (
    <div className="container min-h-[70vh] py-10 md:py-14">
      <p className="eyebrow">cyberID tournament calendar</p>
      <h1 className="display-title mt-5 text-[72px] md:text-[104px]">Турниры</h1>
      <p className="muted mt-4 max-w-2xl leading-7">
        Календарь событий, состав участников, сетка матчей и подтвержденные результаты.
      </p>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {result.data.map((tournament) => (
          <Link
            key={tournament.id}
            href={`/tournaments/${tournament.slug}`}
            className="surface p-5 transition hover:border-[var(--brand)]"
          >
            <div className="flex items-center justify-between">
              <span className="border border-[var(--border)] bg-[var(--surface-3)] px-2 py-1 text-[10px] font-bold text-[var(--text-2)]">
                {tournament.mode}
              </span>
              <span className="text-[10px] font-bold text-[var(--success)]">
                {tournament.status}
              </span>
            </div>
            <h2 className="font-[var(--display)] mt-10 text-3xl font-black uppercase tracking-[-.045em]">{tournament.name}</h2>
            <p className="mt-2 text-sm text-[var(--text-2)]">{tournament.tier} · CS2</p>
            <p className="mt-4 text-xs text-[var(--text-3)]">
              {tournament.participantCount} команд · {tournament.matchCount} матчей
            </p>
            <div className="mt-5 flex items-end justify-between border-t border-[var(--border)] pt-4">
              <div>
                <span className="text-[10px] text-[var(--text-3)]">ПРИЗОВОЙ ФОНД</span>
                <strong className="data-number mt-1 block text-lg">
                  ${tournament.prizePool.toLocaleString('en-US')}
                </strong>
              </div>
              <ArrowIcon className="size-5 text-[var(--text-3)]" />
            </div>
          </Link>
        ))}
      </div>
      <Pagination
        page={result.meta.page}
        totalPages={result.meta.totalPages}
        pathname="/tournaments"
        params={{ status, page }}
      />
    </div>
  );
}
