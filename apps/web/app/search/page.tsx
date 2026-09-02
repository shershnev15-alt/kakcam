import type { Metadata } from 'next';
import Link from 'next/link';
import { PlayerCard, TeamCard } from '@/components/ui';
import { searchDirectory } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Поиск по реестру',
  robots: { index: false, follow: true },
};
type Props = { searchParams: Promise<{ q?: string | string[] }> };

export default async function SearchPage({ searchParams }: Props) {
  const raw = (await searchParams).q;
  const query = typeof raw === 'string' ? raw.trim() : '';
  const result = query.length >= 2 ? await searchDirectory(query) : null;

  return (
    <div className="container min-h-[70vh] py-10 md:py-14">
      <p className="eyebrow">cyberID global search</p>
      <h1 className="display-title mt-5 text-[72px] md:text-[104px]">Поиск</h1>
      <form action="/search" className="surface mt-8 flex gap-2 p-3">
        <input
          autoFocus
          className="focus-ring h-12 min-w-0 flex-1 border border-[var(--border)] bg-[var(--surface-2)] px-4"
          defaultValue={query}
          name="q"
          placeholder="Игрок или команда"
        />
        <button
          className="bg-[var(--accent)] px-5 text-sm font-black text-[#0b1016]"
          type="submit"
        >
          Найти
        </button>
      </form>
      {!result ? (
        <p className="muted mt-8">Введите минимум два символа.</p>
      ) : result.total === 0 ? (
        <div className="surface mt-8 py-16 text-center">
          <h2 className="text-xl font-bold">Ничего не найдено</h2>
          <p className="muted mt-2 text-sm">Попробуйте другой никнейм или название.</p>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {result.players.length ? (
            <section>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-2xl font-bold">Игроки</h2>
                <Link
                  className="text-sm text-[var(--accent)]"
                  href={`/players?q=${encodeURIComponent(query)}`}
                >
                  Открыть каталог →
                </Link>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {result.players.map((player) => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>
            </section>
          ) : null}
          {result.teams.length ? (
            <section>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-2xl font-bold">Команды</h2>
                <Link
                  className="text-sm text-[var(--accent)]"
                  href={`/teams?q=${encodeURIComponent(query)}`}
                >
                  Открыть каталог →
                </Link>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {result.teams.map((team) => (
                  <TeamCard key={team.id} team={team} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
