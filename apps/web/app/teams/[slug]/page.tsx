import { matches, players, teamBySlug, teams, tournaments } from '@arena/demo-data';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckIcon } from '@/components/icons';
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
  return teams.map((team) => ({ slug: team.slug }));
}
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const team = teamBySlug((await params).slug);
  return team
    ? {
        title: `${team.name} — состав, TPR ${team.rating.score} и матчи`,
        description: `${team.name}: #${team.rating.rank} в командном рейтинге CS2, текущий состав и история выступлений.`,
        alternates: { canonical: `/teams/${team.slug}` },
      }
    : { title: 'Команда не найдена' };
}

export default async function TeamPage({ params }: PageProps) {
  const team = teamBySlug((await params).slug);
  if (!team) notFound();
  const roster = players.filter((player) => player.teamId === team.id);
  const teamMatches = matches
    .filter((match) => match.homeTeamId === team.id || match.awayTeamId === team.id)
    .slice(0, 6);
  return (
    <>
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
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
            <Monogram label="NV" size="sm" />
            <div>
              <strong className="text-sm">navius</strong>
              <p className="mt-1 text-xs text-[var(--text-3)]">Главный тренер · с марта 2025</p>
            </div>
          </div>
        </section>
        <section>
          <SectionHeading eyebrow="Командная форма" title="Результаты за 90 дней" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Win rate" value="68%" note="19 из 28" />
            <StatCard label="Maps" value="41" note="+12 за месяц" />
            <StatCard label="Round diff" value="+46" note="Топ-3 СНГ" />
            <StatCard label="LAN" value="71%" note="10 матчей" />
            <StatCard label="Серия" value="4 W" note="Текущая" />
            <StatCard label="Состав" value="86%" note="Стабильность" />
          </div>
        </section>
        <section className="grid gap-5 lg:grid-cols-[1.5fr_.5fr]">
          <div className="surface p-6">
            <div className="flex justify-between">
              <div>
                <p className="eyebrow">TPR · 12 месяцев</p>
                <h2 className="mt-2 text-xl font-bold">Динамика силы</h2>
              </div>
              <span className="data-number text-2xl font-bold">+74</span>
            </div>
            <Sparkline
              values={[798, 806, 812, 807, 821, 826, 834, 842, 839, 851, 858, 872]}
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
              4 победы в 5 последних сериях. Сильнее всего команда играет на Ancient.
            </p>
          </div>
        </section>
        <section>
          <SectionHeading
            eyebrow="Матч-центр"
            title="Матчи команды"
            action={{ label: 'Все матчи', href: '/matches' }}
          />
          <div className="grid gap-3 lg:grid-cols-3">
            {teamMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
        <section className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="История" title="Результаты турниров" />
            <div className="surface overflow-hidden">
              {tournaments.map((tournament, index) => (
                <div
                  key={tournament.id}
                  className={`flex items-center gap-4 px-5 py-5 ${index ? 'border-t border-[var(--border)]' : ''}`}
                >
                  <span className="data-number grid size-10 place-items-center rounded-lg bg-[var(--surface-2)] text-lg font-bold">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm">{tournament.name}</strong>
                    <p className="mt-1 text-xs text-[var(--text-3)]">
                      {tournament.mode} · {new Date(tournament.endsAt).getFullYear()}
                    </p>
                  </div>
                  <span className="data-number ml-auto text-sm font-bold">
                    ${[100000, 18000, 12500][index]?.toLocaleString('en-US')}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Награды" title="Достижения команды" />
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Чемпион Севера', 'Legendary'],
                ['Серия из 10 побед', 'Epic'],
                ['LAN дебют', 'Rare'],
                ['Топ-3 СНГ', 'Epic'],
              ].map(([title, rarity]) => (
                <div key={title} className="surface p-4">
                  <div className="grid size-10 place-items-center rounded-lg bg-[rgba(243,182,75,.1)] text-[var(--warning)]">
                    <CheckIcon className="size-5" />
                  </div>
                  <strong className="mt-4 block text-sm">{title}</strong>
                  <p className="mt-1 text-[11px] text-[var(--text-3)]">{rarity} · подтверждено</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
