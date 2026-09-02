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
    getMatches({ pageSize: 8 }),
    getTournaments({ pageSize: 3 }),
  ]);
  const players = playerRanking.data;
  const teams = teamRanking.data;
  const matches = matchResult.data;
  const tournaments = tournamentResult.data;
  const lead = players[0] ? await getPlayer(players[0].slug) : null;
  return (
    <>
      <section className="signal-stage border-b border-[var(--border)]">
        <div className="container grid min-h-[610px] items-end gap-10 py-12 lg:grid-cols-[1.15fr_.85fr] lg:py-16">
          <div>
            <p className="eyebrow mb-5">CS2 · РОССИЯ И СНГ · LIVE DATA</p>
            <h1 className="display-title max-w-[820px] text-[64px] sm:text-[92px] lg:text-[116px]">
              КИБЕРСПОРТ
              <br />В ЦИФРАХ
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[var(--text-2)] md:text-lg">
              В общий доступ попадают только игроки с подтверждением местной федерации, фотографией
              и проверенными аккаунтами Steam и FACEIT.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-12 items-center gap-2 bg-[var(--brand)] px-5 text-sm font-black text-[#101512]"
                href="/rankings/players"
              >
                Открыть рейтинг <ArrowIcon className="size-4" />
              </Link>
              <Link
                className="inline-flex h-12 items-center border border-[var(--border)] bg-[rgba(18,18,18,.7)] px-5 text-sm font-semibold hover:border-[var(--brand)]"
                href="/players"
              >
                Найти игрока
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
              <div className="absolute right-0 top-0 h-44 w-44 bg-[radial-gradient(circle,rgba(126,249,178,.12),transparent_65%)]" />
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
                <div className="grid size-20 place-items-center rounded-full border-[6px] border-[var(--brand)] bg-[var(--surface-2)] text-center">
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

      <section className="border-b border-[var(--border)] bg-[#0f0f0f]">
        <div className="container grid grid-cols-2 md:grid-cols-4">
          {[
            ['ИГРОКОВ', playerRanking.meta.total.toLocaleString('ru-RU')],
            ['КОМАНД', teamRanking.meta.total.toLocaleString('ru-RU')],
            ['МАТЧЕЙ', matchResult.meta.total.toLocaleString('ru-RU')],
            ['ТУРНИРОВ', tournamentResult.meta.total.toLocaleString('ru-RU')],
          ].map(([label, value]) => (
            <div key={label} className="border-r border-[var(--border)] px-5 py-6 last:border-r-0">
              <strong className="data-number text-3xl">{value}</strong>
              <p className="mt-1 text-[10px] tracking-[.14em] text-[var(--text-3)]">
                {label} В РЕЕСТРЕ
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="container space-y-16 py-12 md:py-16">
        <section>
          <SectionHeading
            eyebrow="Матч-центр"
            title="Прямо сейчас"
            action={{ label: 'Все матчи', href: '/matches' }}
          />
          <div className="grid gap-2 lg:grid-cols-4">
            {matches.slice(0, 4).map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="PPR · CS2"
              title="Рейтинг игроков"
              action={{ label: 'Полный рейтинг', href: '/rankings/players' }}
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
              action={{ label: 'Полный рейтинг', href: '/rankings/teams' }}
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
            title="Турниры"
            action={{ label: 'Все турниры', href: '/tournaments' }}
          />
          <div className="grid gap-3 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <Link
                key={tournament.id}
                href={`/tournaments/${tournament.slug}`}
                className="surface group p-5 hover:border-[var(--brand)]"
              >
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-[.12em]">
                  <span className="text-[var(--brand)]">{tournament.status}</span>
                  <span className="text-[var(--text-3)]">{tournament.mode}</span>
                </div>
                <h3 className="font-[var(--display)] mt-12 text-3xl font-black uppercase tracking-[-.05em]">
                  {tournament.name}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-2)]">
                  {tournament.tier} · {tournament.participantCount} команд
                </p>
                <div className="mt-5 flex items-end justify-between border-t border-[var(--border)] pt-4">
                  <div>
                    <span className="text-[10px] text-[var(--text-3)]">ПРИЗОВОЙ ФОНД</span>
                    <strong className="data-number mt-1 block text-lg">
                      ${tournament.prizePool.toLocaleString('en-US')}
                    </strong>
                  </div>
                  <ArrowIcon className="size-5 text-[var(--brand)]" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="surface grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-9">
          <div>
            <p className="eyebrow">Данные, которым доверяют</p>
            <h2 className="font-[var(--display)] mt-3 text-4xl font-black uppercase tracking-[-.05em]">
              Каждая цифра имеет источник
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-2)]">
              Показываем confidence, размер выборки, версию формулы и уровень проверки рядом с
              рейтингом.
            </p>
          </div>
          <div className="flex gap-5 text-xs text-[var(--text-2)]">
            <span className="inline-flex items-center gap-2">
              <CheckIcon className="size-4 text-[var(--brand)]" /> PPR / TPR
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckIcon className="size-4 text-[var(--brand)]" /> Verification
            </span>
          </div>
        </section>
      </div>
    </>
  );
}
