import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckIcon } from '@/components/icons';
import { Monogram, SectionHeading } from '@/components/ui';
import { ApiError, getMatch } from '@/lib/api';
import { absoluteUrl, serializeJsonLd, twitterCard } from '@/lib/seo';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const match = await getMatch((await params).id);
    const title = `${match.homeTeam.name} — ${match.awayTeam.name}: матч и статистика`;
    const description = `${match.tournament}, ${match.stage}: состав карт, итог и подтвержденная статистика игроков.`;
    return {
      title,
      description,
      alternates: { canonical: `/matches/${match.id}` },
      openGraph: { title, description, type: 'website', url: `/matches/${match.id}` },
      twitter: { ...twitterCard, title, description },
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { title: 'Матч не найден' };
    throw error;
  }
}

export default async function MatchPage({ params }: Props) {
  let match;
  try {
    match = await getMatch((await params).id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const formatDate = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Moscow',
  }).format(new Date(match.startsAt));
  const homeStats = match.playerStatistics.filter((item) => item.teamId === match.homeTeamId);
  const awayStats = match.playerStatistics.filter((item) => item.teamId === match.awayTeamId);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${match.homeTeam.name} — ${match.awayTeam.name}`,
    sport: 'Counter-Strike 2',
    startDate: match.startsAt,
    eventStatus:
      match.status === 'FINISHED'
        ? 'https://schema.org/EventCompleted'
        : match.status === 'LIVE'
          ? 'https://schema.org/EventInProgress'
          : 'https://schema.org/EventScheduled',
    competitor: [match.homeTeam, match.awayTeam].map((team) => ({
      '@type': 'SportsTeam',
      name: team.name,
      url: absoluteUrl(`/teams/${team.slug}`),
    })),
    url: absoluteUrl(`/matches/${match.id}`),
  };

  return (
    <div className="container space-y-12 py-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <div className="flex items-center gap-2 text-xs text-[var(--text-3)]">
        <Link href="/matches">Матчи</Link>
        <span>/</span>
        <span>{match.tournament}</span>
      </div>
      <h1 className="display-title text-[56px] md:text-[84px]">Матч</h1>
      <section className="signal-stage surface overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4 text-center text-xs text-[var(--text-3)]">
          <span>{match.tournament}</span> · <span>{match.stage}</span> ·{' '}
          <span>BO{match.bestOf}</span>
        </div>
        <div className="grid items-center gap-8 p-6 md:grid-cols-[1fr_auto_1fr] md:p-10">
          {[match.homeTeam, match.awayTeam].map((team, index) => (
            <Link
              href={`/teams/${team.slug}`}
              key={team.id}
              className={`flex items-center gap-4 ${index ? 'md:flex-row-reverse md:text-right' : ''}`}
            >
              <Monogram label={team.shortName} size="lg" />
              <div>
                <strong className="text-xl md:text-2xl">{team.name}</strong>
                <p className="mt-1 text-xs text-[var(--text-3)]">{team.shortName}</p>
              </div>
            </Link>
          ))}
          <div className="row-start-2 text-center md:col-start-2 md:row-start-1">
            <p className="data-number text-4xl font-black">
              {match.status === 'UPCOMING'
                ? new Date(match.startsAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Moscow',
                  })
                : `${match.homeScore ?? 0} : ${match.awayScore ?? 0}`}
            </p>
            <p className="mt-2 text-xs font-bold text-[var(--text-3)]">{match.status}</p>
          </div>
        </div>
        <div className="border-t border-[var(--border)] px-5 py-4 text-center text-sm text-[var(--text-2)]">
          {formatDate}
        </div>
      </section>

      {match.maps.length ? (
        <section>
          <SectionHeading eyebrow="Map veto & results" title="Карты серии" />
          <div className="grid gap-3 md:grid-cols-3">
            {match.maps.map((map) => (
              <div key={map.mapOrder} className="surface p-5">
                <span className="text-xs text-[var(--text-3)]">Карта {map.mapOrder}</span>
                <div className="mt-3 flex items-center justify-between">
                  <strong className="text-lg capitalize">{map.mapKey}</strong>
                  <span className="data-number text-xl font-bold">
                    {map.homeScore ?? '—'} : {map.awayScore ?? '—'}
                  </span>
                </div>
                {map.overtime ? (
                  <span className="mt-3 block text-[10px] font-bold text-[var(--warning)]">
                    OVERTIME
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {match.playerStatistics.length ? (
        <section>
          <SectionHeading eyebrow="Verified statistics" title="Статистика игроков" />
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              [match.homeTeam, homeStats],
              [match.awayTeam, awayStats],
            ].map(([team, statistics]) => {
              const typedTeam = team as typeof match.homeTeam;
              const typedStats = statistics as typeof match.playerStatistics;
              return (
                <div key={typedTeam.id} className="surface overflow-hidden">
                  <div className="border-b border-[var(--border)] px-5 py-4 font-bold">
                    {typedTeam.name}
                  </div>
                  {typedStats.map((item) => (
                    <Link
                      href={`/players/${item.slug}`}
                      key={item.playerId}
                      className={`grid grid-cols-[1fr_repeat(4,auto)] gap-4 border-b border-[var(--border)] px-5 py-4 text-sm last:border-0 ${item.slug === 'frostbyte' ? 'bg-[rgba(69,255,166,.05)] shadow-[inset_3px_0_var(--brand)]' : ''}`}
                    >
                      <strong>{item.nickname}</strong>
                      <span className="data-number">
                        {item.kills}/{item.deaths}/{item.assists}
                      </span>
                      <span className="data-number hidden sm:block">{item.adr} ADR</span>
                      <span className="data-number hidden sm:block">{item.kast}%</span>
                      <strong className="data-number text-[var(--accent)]">{item.rating}</strong>
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-5 text-xs text-[var(--text-3)]">
        <CheckIcon className="size-4 text-[var(--success)]" />
        <span>Источник: {match.sourceCode}</span>
        <span>·</span>
        <span>Уровень подтверждения: {match.verificationLevel}</span>
      </div>
    </div>
  );
}
