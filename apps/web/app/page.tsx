import Link from 'next/link';
import { ArrowIcon, CheckIcon } from '@/components/icons';
import { MatchCard } from '@/components/match-card';
import { PlayerCard, PlayerPhoto, SectionHeading, Sparkline, TeamCard } from '@/components/ui';
import {
  getMatches,
  getPlayer,
  getPlayerRankings,
  getTeamRankings,
  getTournaments,
} from '@/lib/api';

export default async function HomePage() {
  const [playerRanking, teamRanking, matchResult, tournamentResult] = await Promise.all([
    getPlayerRankings({ pageSize: 8 }),
    getTeamRankings({ pageSize: 5 }),
    getMatches({ pageSize: 6 }),
    getTournaments({ pageSize: 3 }),
  ]);
  const players = playerRanking.data;
  const teams = teamRanking.data;
  const matches = matchResult.data;
  const tournaments = tournamentResult.data;
  const lead = players[0] ? await getPlayer(players[0].slug) : null;
  return (
    <>
      <section className="grain overflow-hidden border-b border-[var(--border)]">
        <div className="container grid min-h-[630px] items-center gap-12 py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-20">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(95,139,255,.28)] bg-[rgba(95,139,255,.08)] px-3 py-1.5 text-xs font-semibold text-[#AFC4FF]">
              <span className="size-1.5 rounded-full bg-[var(--success)]" />
              Реестр игроков России и СНГ · CS2
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-[72px]">
              Вся карьера.
              <br />
              <span className="text-[var(--text-3)]">Один профиль.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--text-2)]">
              В общий доступ попадают только игроки с подтверждением местной федерации, фотографией
              и проверенными аккаунтами Steam и FACEIT.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={lead ? `/players/${lead.slug}` : '/account'}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-[#11160a] transition hover:brightness-110"
              >
                {lead ? 'Смотреть профиль игрока' : 'Пройти верификацию'}{' '}
                <ArrowIcon className="size-4" />
              </Link>
              <Link
                href="/rankings/players"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-5 text-sm font-semibold hover:border-[var(--text-3)]"
              >
                Открыть рейтинг
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs text-[var(--text-3)]">
              <span className="flex items-center gap-2">
                <CheckIcon className="size-4 text-[var(--success)]" />
                Источники у каждого факта
              </span>
              <span className="flex items-center gap-2">
                <CheckIcon className="size-4 text-[var(--success)]" />
                Прозрачная методология
              </span>
              <span className="flex items-center gap-2">
                <CheckIcon className="size-4 text-[var(--success)]" />
                CS2 в фокусе
              </span>
            </div>
          </div>

          {lead ? (
            <Link
              href={`/players/${lead.slug}`}
              className="surface relative mx-auto w-full max-w-[520px] overflow-hidden p-5 shadow-[0_32px_90px_rgba(0,0,0,.34)] transition hover:border-[var(--text-3)] md:p-6"
            >
              <div className="absolute right-0 top-0 h-44 w-44 bg-[radial-gradient(circle,rgba(214,255,95,.12),transparent_65%)]" />
              <div className="flex items-start gap-4">
                <PlayerPhoto src={lead.avatarUrl} label={lead.nickname} size="lg" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black">{lead.nickname}</h2>
                    <CheckIcon className="size-5 text-[var(--success)]" />
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-2)]">
                    {lead.realName} · {lead.countryCode}
                  </p>
                  <p className="mt-2 text-xs text-[var(--text-3)]">
                    {lead.teamName} · {lead.roles.join(', ')}
                  </p>
                </div>
                <span className="ml-auto rounded-md bg-[var(--surface-3)] px-2 py-1 text-[10px] font-bold tracking-wider text-[var(--text-2)]">
                  DIGITAL PASSPORT
                </span>
              </div>
              <div className="mt-7 grid grid-cols-[1fr_auto] gap-5 border-y border-[var(--border)] py-5">
                <div>
                  <p className="eyebrow">Player Performance Rating</p>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="data-number text-5xl font-black">{lead.rating.score}</span>
                    <span className="text-xs font-bold text-[var(--success)]">
                      +{lead.rating.delta30d} / 30 дней
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-2)]">
                    #{lead.rating.rank} СНГ · {lead.rating.tier}
                  </p>
                </div>
                <div className="grid size-20 place-items-center rounded-full border-[6px] border-[var(--accent)] bg-[var(--surface-2)] text-center">
                  <span className="text-sm font-bold">
                    {lead.rating.confidence}%
                    <small className="block text-[8px] font-medium text-[var(--text-3)]">
                      CONFIDENCE
                    </small>
                  </span>
                </div>
              </div>
              <Sparkline values={lead.form} className="mt-5 h-20 w-full" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ['K/D', (lead.performance?.kd ?? 0).toFixed(2)],
                  ['ADR', (lead.performance?.adr ?? 0).toFixed(1)],
                  ['KAST', `${(lead.performance?.kast ?? 0).toFixed(1)}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-[var(--surface-2)] p-3">
                    <span className="text-[10px] text-[var(--text-3)]">{label}</span>
                    <strong className="data-number mt-1 block">{value}</strong>
                  </div>
                ))}
              </div>
            </Link>
          ) : (
            <div className="surface mx-auto w-full max-w-[520px] p-6 md:p-8">
              <p className="eyebrow">Закрытый PPR · доверенный реестр</p>
              <h2 className="mt-3 text-3xl font-black">Публичных игроков пока нет</h2>
              <p className="muted mt-4 leading-7">
                Профиль появится здесь только после полной проверки личности и всех обязательных
                связей.
              </p>
              <div className="mt-7 grid gap-3 text-sm">
                {[
                  'Самостоятельный Claim Profile',
                  'Подтверждение местной федерации',
                  'Проверенная фотография',
                  'Подтверждённый Steam',
                  'Подтверждённый FACEIT',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-lg bg-[var(--surface-2)] p-3"
                  >
                    <CheckIcon className="size-4 text-[var(--text-3)]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="container space-y-20 py-14 md:py-20">
        <section>
          <SectionHeading
            eyebrow="Матч-центр"
            title="Сейчас и в ближайшее время"
            action={{ label: 'Все матчи', href: '/matches' }}
          />
          <div className="grid gap-3 lg:grid-cols-3">
            {matches.slice(0, 6).map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="PPR · CS2"
              title="Сильнейшие игроки"
              action={{ label: 'Топ-100', href: '/rankings/players' }}
            />
            <div className="grid gap-2">
              {players.slice(0, 5).map((player) => (
                <PlayerCard key={player.id} player={player} compact />
              ))}
            </div>
          </div>
          <div>
            <SectionHeading
              eyebrow="TPR · CS2"
              title="Рейтинг команд"
              action={{ label: 'Все команды', href: '/rankings/teams' }}
            />
            <div className="grid gap-2">
              {teams.slice(0, 5).map((team) => (
                <TeamCard key={team.id} team={team} compact />
              ))}
            </div>
          </div>
        </section>

        <section>
          <SectionHeading
            eyebrow="Форма за 30 дней"
            title="Восходящие игроки"
            action={{ label: 'Все игроки', href: '/players?sort=rating' }}
          />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {players.slice(4, 8).map((player) => (
              <Link
                href={`/players/${player.slug}`}
                key={player.id}
                className="surface group p-5 transition hover:-translate-y-1 hover:border-[var(--text-3)]"
              >
                <div className="flex items-center gap-3">
                  <PlayerPhoto
                    src={(player as typeof player & { avatarUrl?: string | null }).avatarUrl}
                    label={player.nickname}
                  />
                  <div>
                    <strong>{player.nickname}</strong>
                    <p className="mt-1 text-xs text-[var(--text-3)]">
                      {player.age} лет · {player.roles[0]}
                    </p>
                  </div>
                </div>
                <Sparkline values={player.form} className="mt-5 h-14 w-full" />
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <span className="data-number text-2xl font-bold">{player.rating.score}</span>
                    <span className="ml-2 text-[10px] text-[var(--text-3)]">PPR</span>
                  </div>
                  <span className="text-xs font-bold text-[var(--success)]">
                    +{Math.max(7, player.rating.delta30d)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading
            eyebrow="Календарь"
            title="Ближайшие турниры"
            action={{ label: 'Все турниры', href: '/tournaments' }}
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/tournaments/${tournament.slug}`}
                className="surface p-5 transition hover:border-[var(--text-3)]"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-[var(--surface-3)] px-2 py-1 text-[10px] font-bold text-[var(--text-2)]">
                    {tournament.mode}
                  </span>
                  <span className="text-xs text-[var(--text-3)]">
                    {new Date(tournament.startsAt).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: 'short',
                      timeZone: 'Europe/Moscow',
                    })}
                  </span>
                </div>
                <h3 className="mt-10 text-xl font-bold">{tournament.name}</h3>
                <p className="mt-2 text-sm text-[var(--text-2)]">{tournament.tier} · CS2</p>
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
        </section>

        <section className="surface relative overflow-hidden p-6 md:p-10">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_right,rgba(95,139,255,.15),transparent_65%)]" />
          <div className="relative max-w-2xl">
            <p className="eyebrow">Достоверность прежде всего</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              У каждого факта есть источник
            </h2>
            <p className="mt-4 leading-7 text-[var(--text-2)]">
              Мы показываем не только цифры, но и уровень их подтверждения: игровым аккаунтом,
              организатором, командой или платформой.
            </p>
            <Link
              href="/methodology"
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--accent)]"
            >
              Как работает верификация <ArrowIcon className="size-4" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
