import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckIcon } from '@/components/icons';
import { MatchCard } from '@/components/match-card';
import { ApiError, getTeam } from '@/lib/api';
import { absoluteUrl, serializeJsonLd, twitterCard } from '@/lib/seo';
import {
  Delta,
  Monogram,
  PlayerCard,
  RatingRing,
  SectionHeading,
  Sparkline,
  StatCard,
  VerificationBadge,
} from '@/components/ui';

type PageProps = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const team = await getTeam((await params).slug);
    const title = `${team.name} — состав, TPR ${team.rating.score} и матчи`;
    const description = `${team.name}: #${team.rating.rank} в командном рейтинге CS2, текущий состав и история выступлений.`;
    return {
      title,
      description,
      alternates: { canonical: `/teams/${team.slug}` },
      openGraph: { title, description, type: 'website', url: `/teams/${team.slug}` },
      twitter: { ...twitterCard, title, description },
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { title: 'Команда не найдена' };
    throw error;
  }
}

export default async function TeamPage({ params }: PageProps) {
  let team;
  try {
    team = await getTeam((await params).slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const roster = team.roster;
  const performance = team.performance;
  const ratingSeries = [...team.ratingHistory].reverse().map((item) => item.score);
  const periodDelta = ratingSeries.length > 1 ? ratingSeries.at(-1)! - ratingSeries[0]! : 0;
  const recentWins = team.form.filter((result) => result === 'W').length;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: team.name,
    alternateName: team.shortName,
    sport: 'Counter-Strike 2',
    url: absoluteUrl(`/teams/${team.slug}`),
    location: { '@type': 'Country', name: team.countryName },
    athlete: team.roster.map((player) => ({
      '@type': 'Person',
      name: player.nickname,
      url: absoluteUrl(`/players/${player.slug}`),
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <section className="grain border-b border-[var(--border)] bg-[linear-gradient(180deg,rgba(214,255,95,.025),transparent)]">
        <div className="container py-8 md:py-12">
          <div className="mb-7 flex items-center gap-2 text-xs text-[var(--text-3)]">
            <Link href="/teams">Команды</Link>
            <span>/</span>
            <span>{team.name}</span>
          </div>
          <div className="grid items-center gap-8 xl:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Monogram label={team.shortName} size="xl" />
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-black tracking-[-.04em] md:text-6xl">{team.name}</h1>
                  <VerificationBadge level={team.verificationLevel} />
                </div>
                <p className="mt-3 text-[var(--text-2)]">
                  {team.countryCode} {team.countryName} · Основана в {team.foundedYear}
                </p>
                <p className="mt-3 text-sm text-[var(--text-3)]">
                  Основной состав · Counter-Strike 2
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 rounded-2xl border border-[var(--border)] bg-[rgba(16,21,30,.8)] p-5">
              <RatingRing
                score={team.rating.score}
                confidence={team.rating.confidence}
                label="TPR"
              />
              <div>
                <p className="eyebrow">Рейтинг СНГ</p>
                <p className="data-number mt-2 text-3xl font-black">#{team.rating.rank}</p>
                <div className="mt-2">
                  <Delta value={team.rating.delta30d} period="30 дней" />
                </div>
                <p className="mt-4 text-xs text-[var(--text-3)]">{team.rating.tier} · состав 86%</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="container space-y-16 py-10 md:py-14">
        <section>
          <SectionHeading eyebrow="Состав" title="Current roster" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {roster.slice(0, 5).map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        </section>
        <section>
          <SectionHeading eyebrow="Командная форма" title="Результаты за 90 дней" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Win rate"
              value={`${Math.round((performance?.winRate ?? 0) * 100)}%`}
              note={`${performance?.wins ?? 0} побед`}
            />
            <StatCard
              label="Матчи"
              value={String(performance?.sampleMatches ?? 0)}
              note="90 дней"
            />
            <StatCard
              label="Round diff"
              value={`${(performance?.roundDifference ?? 0) >= 0 ? '+' : ''}${performance?.roundDifference ?? 0}`}
              note={`${performance?.roundsWon ?? 0} выиграно`}
            />
            <StatCard
              label="Карты W"
              value={String(performance?.mapsWon ?? 0)}
              note={`${performance?.mapsLost ?? 0} поражений`}
            />
            <StatCard label="Победы" value={String(performance?.wins ?? 0)} note="Verified" />
            <StatCard label="Поражения" value={String(performance?.losses ?? 0)} note="Verified" />
          </div>
        </section>
        <section className="grid gap-5 lg:grid-cols-[1.5fr_.5fr]">
          <div className="surface p-6">
            <div className="flex justify-between">
              <div>
                <p className="eyebrow">TPR · 12 месяцев</p>
                <h2 className="mt-2 text-xl font-bold">Динамика силы</h2>
              </div>
              <span className="data-number text-2xl font-bold">
                {periodDelta > 0 ? '+' : ''}
                {periodDelta}
              </span>
            </div>
            <Sparkline
              values={
                ratingSeries.length > 1 ? ratingSeries : [team.rating.score, team.rating.score]
              }
              className="mt-8 h-52 w-full"
            />
          </div>
          <div className="surface p-6">
            <p className="eyebrow">Последние 5</p>
            <h2 className="mt-2 text-xl font-bold">Форма</h2>
            <div className="mt-8 flex gap-2">
              {team.form.map((result, index) => (
                <span
                  key={index}
                  className={`grid size-10 place-items-center rounded-lg text-sm font-black ${result === 'W' ? 'bg-[rgba(67,209,125,.1)] text-[var(--success)]' : 'bg-[rgba(241,105,117,.1)] text-[var(--danger)]'}`}
                >
                  {result}
                </span>
              ))}
            </div>
            <p className="mt-8 text-sm leading-6 text-[var(--text-2)]">
              {recentWins} побед в {team.form.length} последних подтвержденных сериях.
            </p>
            <div className="mt-5 space-y-2 border-t border-[var(--border)] pt-4">
              {team.ratingFactors.map((factor) => (
                <div key={factor.key} className="flex justify-between text-xs">
                  <span className="text-[var(--text-3)]">{factor.label}</span>
                  <strong
                    className={
                      factor.contribution >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }
                  >
                    {factor.contribution > 0 ? '+' : ''}
                    {factor.contribution}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section>
          <SectionHeading
            eyebrow="Матч-центр"
            title="Матчи команды"
            action={{ label: 'Все матчи', href: '/matches' }}
          />
          <div className="grid gap-3 lg:grid-cols-3">
            {team.matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
        <section className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="История" title="Результаты турниров" />
            <div className="surface overflow-hidden">
              {team.tournaments.map((tournament, index) => (
                <div
                  key={tournament.id}
                  className={`flex items-center gap-4 px-5 py-5 ${index ? 'border-t border-[var(--border)]' : ''}`}
                >
                  <span className="data-number grid size-10 place-items-center rounded-lg bg-[var(--surface-2)] text-lg font-bold">
                    {tournament.placeFrom}
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm">{tournament.name}</strong>
                    <p className="mt-1 text-xs text-[var(--text-3)]">
                      {tournament.mode} · {new Date(tournament.endsAt).getFullYear()}
                    </p>
                  </div>
                  <span className="data-number ml-auto text-sm font-bold">
                    ${tournament.prizeAmount.toLocaleString('en-US')}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Награды" title="Достижения команды" />
            <div className="grid grid-cols-2 gap-3">
              {team.achievements.map((achievement) => (
                <div key={achievement.code} className="surface p-4">
                  <div className="grid size-10 place-items-center rounded-lg bg-[rgba(243,182,75,.1)] text-[var(--warning)]">
                    <CheckIcon className="size-5" />
                  </div>
                  <strong className="mt-4 block text-sm">{achievement.title}</strong>
                  <p className="mt-1 text-[11px] text-[var(--text-3)]">
                    {achievement.rarity} · подтверждено
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
