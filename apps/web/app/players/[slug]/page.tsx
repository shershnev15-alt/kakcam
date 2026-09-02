import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowIcon, CheckIcon } from '@/components/icons';
import { MatchCard } from '@/components/match-card';
import { ApiError, getPlayer, getPlayerCareer, getPlayerVerification } from '@/lib/api';
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
  let player;
  try {
    player = await getPlayer((await params).slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { title: 'Игрок не найден' };
    throw error;
  }
  const title = `${player.nickname} — профиль, PPR ${player.rating.score} и статистика`;
  const description = `${player.nickname}, ${player.teamName}: #${player.rating.rank} в рейтинге CS2, PPR ${player.rating.score}, достижения и история карьеры.`;
  return {
    title,
    description,
    alternates: { canonical: `/players/${player.slug}` },
    openGraph: { title, description, type: 'profile', url: `/players/${player.slug}` },
    twitter: { ...twitterCard, title, description },
  };
}

export default async function PlayerPage({ params }: PageProps) {
  let player;
  let career;
  let verification;
  try {
    const slug = (await params).slug;
    [player, career, verification] = await Promise.all([
      getPlayer(slug),
      getPlayerCareer(slug),
      getPlayerVerification(slug),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const team = player.currentTeam ?? {
    id: 'free-agent',
    slug: 'free-agent',
    name: 'Без команды',
    shortName: 'FA',
  };
  const performance = player.performance;
  const ratingSeries = [...player.ratingHistory].reverse().map((item) => item.score);
  const periodDelta = ratingSeries.length > 1 ? ratingSeries.at(-1)! - ratingSeries[0]! : 0;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: player.realName ?? player.nickname,
    alternateName: player.nickname,
    nationality: player.countryName,
    affiliation: { '@type': 'SportsTeam', name: player.teamName },
    url: absoluteUrl(`/players/${player.slug}`),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <section className="grain border-b border-[var(--border)] bg-[linear-gradient(180deg,rgba(95,139,255,.055),transparent)]">
        <div className="container py-8 md:py-12">
          <div className="mb-7 flex items-center gap-2 text-xs text-[var(--text-3)]">
            <Link href="/players">Игроки</Link>
            <span>/</span>
            <span>{player.nickname}</span>
            <span className="ml-auto rounded bg-[var(--surface-2)] px-2 py-1 text-[10px] font-bold tracking-wider">
              CS2
            </span>
          </div>
          <div className="grid items-center gap-8 xl:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Monogram label={player.nickname} size="xl" />
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-4xl font-black tracking-[-.04em] md:text-6xl">
                    {player.nickname}
                  </h1>
                  <VerificationBadge level={player.verificationLevel} />
                </div>
                <p className="text-base text-[var(--text-2)]">
                  {player.realName ?? 'Настоящее имя не опубликовано'}{' '}
                  <span className="mx-2 text-[var(--border)]">•</span> {player.countryCode}{' '}
                  {player.countryName} <span className="mx-2 text-[var(--border)]">•</span>{' '}
                  {player.age ?? '—'} года
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/teams/${team.slug}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm font-semibold"
                  >
                    <Monogram label={team.shortName} size="sm" />
                    {team.name}
                  </Link>
                  {player.roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-2)]"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 rounded-2xl border border-[var(--border)] bg-[rgba(16,21,30,.8)] p-5">
              <RatingRing score={player.rating.score} confidence={player.rating.confidence} />
              <div className="min-w-28">
                <p className="eyebrow">Рейтинг СНГ</p>
                <p className="data-number mt-2 text-3xl font-black">#{player.rating.rank}</p>
                <div className="mt-2">
                  <Delta value={player.rating.delta30d} period="30 дней" />
                </div>
                <p className="mt-4 text-xs text-[var(--text-3)]">
                  {player.rating.tier} · {performance?.sampleMaps ?? 0} карт
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container space-y-16 py-10 md:py-14">
        <section>
          <SectionHeading eyebrow="Последние 90 дней" title="Performance snapshot" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="K/D" value={(performance?.kd ?? 0).toFixed(2)} note="90 дней" />
            <StatCard label="ADR" value={(performance?.adr ?? 0).toFixed(1)} note="Среднее" />
            <StatCard
              label="KAST"
              value={`${(performance?.kast ?? 0).toFixed(1)}%`}
              note="Среднее"
            />
            <StatCard
              label="Win rate"
              value={`${Math.round((performance?.winRate ?? 0) * 100)}%`}
              note={`${performance?.wins ?? 0} побед`}
            />
            <StatCard
              label="Матчей"
              value={String(performance?.sampleMatches ?? 0)}
              note={`${performance?.rounds ?? 0} раундов`}
            />
            <StatCard
              label="Rating"
              value={(performance?.performanceRating ?? 0).toFixed(2)}
              note="Verified facts"
            />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.5fr_.5fr]">
          <div className="surface p-5 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">PPR · 12 месяцев</p>
                <h2 className="mt-2 text-xl font-bold">Динамика рейтинга</h2>
              </div>
              <div className="text-right">
                <span className="data-number text-2xl font-bold">
                  {periodDelta > 0 ? '+' : ''}
                  {periodDelta}
                </span>
                <p className="text-xs text-[var(--text-3)]">за период</p>
              </div>
            </div>
            <Sparkline
              values={
                ratingSeries.length > 1
                  ? ratingSeries
                  : player.form.length
                    ? player.form
                    : [player.rating.score, player.rating.score]
              }
              className="mt-7 h-52 w-full"
            />
            <div className="mt-3 flex justify-between text-[10px] text-[var(--text-3)]">
              <span>ОКТ 2025</span>
              <span>ЯНВ</span>
              <span>АПР</span>
              <span>ИЮЛ</span>
              <span>СЕН 2026</span>
            </div>
          </div>
          <aside className="surface p-5 md:p-6">
            <p className="eyebrow">Почему {player.rating.score}?</p>
            <h2 className="mt-2 text-xl font-bold">Факторы PPR</h2>
            <div className="mt-6 space-y-5">
              {player.ratingFactors.map((factor) => (
                <div key={factor.key}>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-[var(--text-2)]">{factor.label}</span>
                    <strong
                      className={
                        factor.contribution >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                      }
                    >
                      {factor.contribution > 0 ? '+' : ''}
                      {factor.contribution}
                    </strong>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--surface-3)]">
                    <div
                      className="h-full rounded-full bg-[var(--brand)]"
                      style={{ width: `${Math.min(100, Math.max(8, 50 + factor.contribution))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/methodology"
              className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-[var(--accent)]"
            >
              Полное объяснение <ArrowIcon className="size-4" />
            </Link>
          </aside>
        </section>

        <section>
          <SectionHeading
            eyebrow="Матчи"
            title="Последние игры"
            action={{ label: 'Вся история', href: '/matches' }}
          />
          <div className="grid gap-3 lg:grid-cols-3">
            {player.matches.slice(0, 3).map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionHeading
              eyebrow="Карьера"
              title="История команд"
              action={{ label: 'Полная timeline', href: `/players/${player.slug}/career` }}
            />
            <div className="surface p-5 md:p-6">
              <div className="relative space-y-7 before:absolute before:bottom-3 before:left-[22px] before:top-3 before:w-px before:bg-[var(--border)]">
                {career.periods.slice(0, 3).map((period) => {
                  const careerTeam = period.team ?? team;
                  return (
                    <div key={period.id} className="relative flex items-center gap-4">
                      <Monogram label={careerTeam.shortName} />
                      <div className="min-w-0 flex-1">
                        <strong>{careerTeam.name}</strong>
                        <p className="mt-1 text-xs text-[var(--text-3)]">
                          {new Date(period.startedAt).toLocaleDateString('ru-RU', {
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'UTC',
                          })}{' '}
                          —{' '}
                          {period.endedAt
                            ? new Date(period.endedAt).toLocaleDateString('ru-RU', {
                                month: 'short',
                                year: 'numeric',
                                timeZone: 'UTC',
                              })
                            : 'сейчас'}
                        </p>
                      </div>
                      <span className="rounded-full bg-[rgba(67,209,125,.1)] px-2 py-1 text-[10px] font-bold text-[var(--success)]">
                        L{period.verificationLevel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div>
            <SectionHeading
              eyebrow="Награды"
              title="Достижения"
              action={{
                label: 'Все достижения',
                href: `/players/${player.slug}/achievements`,
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              {player.achievements.slice(0, 4).map((item, index) => (
                <div key={item.code} className="surface p-4">
                  <div
                    className={`grid size-10 place-items-center rounded-lg ${index === 3 ? 'bg-[rgba(243,182,75,.12)] text-[var(--warning)]' : 'bg-[rgba(95,139,255,.12)] text-[#8BAAFF]'}`}
                  >
                    <CheckIcon className="size-5" />
                  </div>
                  <strong className="mt-4 block text-sm">{item.title}</strong>
                  <p className="mt-1 text-[11px] text-[var(--text-3)]">
                    {item.rarity} · подтверждено
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <SectionHeading eyebrow="Похожие профили" title="Игроки той же роли" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {player.similar.map((item) => (
              <PlayerCard key={item.id} player={item} />
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-4 border-t border-[var(--border)] pt-6 text-xs text-[var(--text-3)] sm:flex-row sm:items-center">
          <span className="inline-flex items-center gap-2">
            <CheckIcon className="size-4 text-[var(--success)]" />
            {verification.label} · {verification.verifications.length} решений
          </span>
          <span>
            Данные обновлены{' '}
            {player.ratingPublishedAt
              ? new Date(player.ratingPublishedAt).toLocaleString('ru-RU', {
                  timeZone: 'Europe/Moscow',
                })
              : '—'}
          </span>
          <Link
            className="sm:ml-auto font-semibold text-[var(--accent)] hover:text-white"
            href={`/account?claim=${player.slug}`}
          >
            Это мой профиль
          </Link>
        </div>
      </div>
    </>
  );
}
