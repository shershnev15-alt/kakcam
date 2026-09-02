import { achievements, matches, playerBySlug, players, teamById, teams } from '@arena/demo-data';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowIcon, CheckIcon } from '@/components/icons';
import { MatchCard } from '@/components/match-card';
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

export function generateStaticParams() {
  return players.map((player) => ({ slug: player.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const player = playerBySlug((await params).slug);
  if (!player) return { title: 'Игрок не найден' };
  const title = `${player.nickname} — профиль, PPR ${player.rating.score} и статистика`;
  const description = `${player.nickname}, ${player.teamName}: #${player.rating.rank} в рейтинге CS2, PPR ${player.rating.score}, достижения и история карьеры.`;
  return {
    title,
    description,
    alternates: { canonical: `/players/${player.slug}` },
    openGraph: { title, description, type: 'profile' },
  };
}

export default async function PlayerPage({ params }: PageProps) {
  const player = playerBySlug((await params).slug);
  if (!player) notFound();
  const team = teamById(player.teamId ?? teams[0]!.id);
  const playerMatches = matches
    .filter((match) => match.homeTeamId === team.id || match.awayTeamId === team.id)
    .slice(0, 3);
  const unlocked = achievements.filter((item) => item.progress >= item.target).slice(0, 5);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: player.realName ?? player.nickname,
    alternateName: player.nickname,
    nationality: player.countryName,
    affiliation: { '@type': 'SportsTeam', name: player.teamName },
    url: `https://arena-passport.example/players/${player.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
                  {player.age} года
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
                  <Delta value={4} period="30 дней" />
                </div>
                <p className="mt-4 text-xs text-[var(--text-3)]">{player.rating.tier} · 31 карта</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container space-y-16 py-10 md:py-14">
        <section>
          <SectionHeading eyebrow="Последние 90 дней" title="Performance snapshot" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="K/D" value="1.28" note="Топ 12%" />
            <StatCard label="ADR" value="86.4" note="+4.7 к среднему" />
            <StatCard label="KAST" value="74.2%" note="Стабильно" />
            <StatCard label="Win rate" value="64%" note="18 из 28" />
            <StatCard label="Карт" value="31" note="8 соперников" />
            <StatCard label="Форма" value="8.6" note="Растет" />
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
                <span className="data-number text-2xl font-bold">+96</span>
                <p className="text-xs text-[var(--text-3)]">за период</p>
              </div>
            </div>
            <Sparkline
              values={[746, 758, 751, 773, 780, 792, 801, 796, 815, 824, 819, 842]}
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
            <p className="eyebrow">Почему 842?</p>
            <h2 className="mt-2 text-xl font-bold">Факторы PPR</h2>
            <div className="mt-6 space-y-5">
              {[
                ['Индивидуальная форма', '+31', 82],
                ['Сила соперников', '+12', 68],
                ['Стабильность', '+8', 63],
                ['Результаты турниров', '+6', 57],
              ].map(([label, value, width]) => (
                <div key={label as string}>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-[var(--text-2)]">{label}</span>
                    <strong className="text-[var(--success)]">{value}</strong>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--surface-3)]">
                    <div
                      className="h-full rounded-full bg-[var(--brand)]"
                      style={{ width: `${width}%` }}
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
            {playerMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionHeading eyebrow="Карьера" title="История команд" />
            <div className="surface p-5 md:p-6">
              <div className="relative space-y-7 before:absolute before:bottom-3 before:left-[22px] before:top-3 before:w-px before:bg-[var(--border)]">
                {[
                  [team, '2025 — сейчас', '142 матча'],
                  [teams[2]!, '2023 — 2025', '96 матчей'],
                  [teams[7]!, '2022 — 2023', 'Дебют'],
                ].map(([careerTeam, period, note]) => {
                  const typed = careerTeam as typeof team;
                  return (
                    <div key={typed.id} className="relative flex items-center gap-4">
                      <Monogram label={typed.shortName} />
                      <div className="min-w-0 flex-1">
                        <strong>{typed.name}</strong>
                        <p className="mt-1 text-xs text-[var(--text-3)]">
                          {period as string} · {note as string}
                        </p>
                      </div>
                      {typed.id === team.id ? (
                        <span className="rounded-full bg-[rgba(67,209,125,.1)] px-2 py-1 text-[10px] font-bold text-[var(--success)]">
                          ТЕКУЩАЯ
                        </span>
                      ) : null}
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
              action={{ label: 'Все достижения', href: `/players/${player.slug}/achievements` }}
            />
            <div className="grid grid-cols-2 gap-3">
              {unlocked.slice(0, 4).map((item, index) => (
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

        <section className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Арсенал" title="Лучшее оружие" />
            <div className="surface overflow-hidden">
              {[
                ['AWP', '348', '1.42', '71%'],
                ['AK-47', '291', '1.18', '62%'],
                ['Desert Eagle', '84', '1.31', '58%'],
                ['M4A1-S', '76', '1.09', '54%'],
              ].map((row, index) => (
                <div
                  key={row[0]}
                  className={`grid grid-cols-[1fr_repeat(3,auto)] items-center gap-5 px-5 py-4 ${index ? 'border-t border-[var(--border)]' : ''}`}
                >
                  <strong className="text-sm">{row[0]}</strong>
                  <span className="data-number text-sm">
                    {row[1]} <small className="text-[9px] text-[var(--text-3)]">KILLS</small>
                  </span>
                  <span className="data-number text-sm">
                    {row[2]} <small className="text-[9px] text-[var(--text-3)]">K/D</small>
                  </span>
                  <span className="data-number text-sm">
                    {row[3]} <small className="text-[9px] text-[var(--text-3)]">ACC</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Карты" title="Лучшие площадки" />
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Ancient', '1.34', '72%'],
                ['Mirage', '1.29', '68%'],
                ['Nuke', '1.22', '64%'],
                ['Dust II', '1.18', '61%'],
              ].map(([name, rating, win]) => (
                <div key={name} className="surface p-4">
                  <strong>{name}</strong>
                  <div className="mt-5 flex items-end justify-between">
                    <span className="data-number text-2xl font-bold">{rating}</span>
                    <span className="text-xs text-[var(--success)]">{win} wins</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <SectionHeading eyebrow="Похожие профили" title="Игроки той же роли" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {players.slice(1, 5).map((item) => (
              <PlayerCard key={item.id} player={item} />
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-4 border-t border-[var(--border)] pt-6 text-xs text-[var(--text-3)] sm:flex-row sm:items-center">
          <span className="inline-flex items-center gap-2">
            <CheckIcon className="size-4 text-[var(--success)]" />
            Профиль проверен платформой
          </span>
          <span>Данные обновлены 2 сентября 2026, 12:40 МСК</span>
          <button className="sm:ml-auto hover:text-[var(--text-1)]">Сообщить об ошибке</button>
        </div>
      </div>
    </>
  );
}
