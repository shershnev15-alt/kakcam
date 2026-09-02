import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MatchCard } from '@/components/match-card';
import { Monogram, SectionHeading } from '@/components/ui';
import { ApiError, getTournament } from '@/lib/api';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const tournament = await getTournament((await params).slug);
    return {
      title: `${tournament.name} — матчи, участники и результаты`,
      description: `${tournament.tier} турнир CS2: ${tournament.participantCount} команд, призовой фонд $${tournament.prizePool}.`,
      alternates: { canonical: `/tournaments/${tournament.slug}` },
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { title: 'Турнир не найден' };
    throw error;
  }
}

export default async function TournamentPage({ params }: Props) {
  let tournament;
  try {
    tournament = await getTournament((await params).slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return (
    <div className="container space-y-14 py-8 md:py-12">
      <div className="text-xs text-[var(--text-3)]">
        <Link href="/tournaments">Турниры</Link> / {tournament.name}
      </div>
      <header className="signal-stage surface p-6 md:p-10">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded bg-[var(--surface-3)] px-2 py-1">{tournament.mode}</span>
          <span className="text-[var(--success)]">{tournament.status}</span>
        </div>
        <h1 className="display-title mt-8 text-[56px] md:text-[88px]">
          {tournament.name}
        </h1>
        <p className="mt-4 text-[var(--text-2)]">
          {tournament.tier} · {tournament.participantCount} команд · $
          {tournament.prizePool.toLocaleString('en-US')}
        </p>
      </header>
      <section>
        <SectionHeading eyebrow="Teams" title="Участники" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {tournament.participants.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.slug}`}
              className="surface flex items-center gap-3 p-4"
            >
              <Monogram label={team.shortName} size="sm" />
              <strong>{team.name}</strong>
            </Link>
          ))}
        </div>
      </section>
      {tournament.placements.length ? (
        <section>
          <SectionHeading eyebrow="Official standings" title="Итоговые места" />
          <div className="surface overflow-hidden">
            {tournament.placements.map((placement) => (
              <Link
                key={placement.team.id}
                href={`/teams/${placement.team.slug}`}
                className="grid grid-cols-[52px_1fr_auto] items-center gap-4 border-b border-[var(--border)] px-5 py-4 last:border-0"
              >
                <span className="data-number text-center text-lg font-bold">
                  #{placement.placeFrom}
                </span>
                <strong>{placement.team.name}</strong>
                <span className="data-number text-sm">
                  ${(placement.prizeAmount ?? 0).toLocaleString('en-US')}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <section>
        <SectionHeading eyebrow="Match center" title="Матчи турнира" />
        <div className="grid gap-3 lg:grid-cols-3">
          {tournament.matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>
    </div>
  );
}
