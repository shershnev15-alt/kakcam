import Link from 'next/link';
import { ArrowIcon, CheckIcon } from '@/components/icons';
import { MatchCard } from '@/components/match-card';
import { Monogram, PlayerCard, SectionHeading, Sparkline, TeamCard } from '@/components/ui';
import {
  getMatches,
  getPlayer,
  getPlayerRankings,
  getTeamRankings,
  getTournaments,
} from '@/lib/api';

export default async function HomePage() {
  const [playerRanking, teamRanking, matchResult, tournamentResult, lead] = await Promise.all([
    getPlayerRankings({ pageSize: 8 }),
    getTeamRankings({ pageSize: 5 }),
    getMatches({ pageSize: 8 }),
    getTournaments({ pageSize: 3 }),
    getPlayer('frostbyte'),
  ]);
  const players = playerRanking.data;
  const teams = teamRanking.data;
  const matches = matchResult.data;
  const tournaments = tournamentResult.data;

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
              Рейтинги игроков и команд, подтверждённые матчи и вся карьерная история — в едином
              публичном cyberID.
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

          <Link
            href={`/players/${lead.slug}`}
            className="surface bg-[rgba(18,18,18,.84)] p-5 backdrop-blur md:p-6"
          >
            <div className="flex items-start gap-4">
              <Monogram label="FB" size="lg" />
              <div>
                <p className="eyebrow">Игрок недели</p>
                <h2 className="font-[var(--display)] text-3xl font-black uppercase tracking-[-.05em]">
                  {lead.nickname}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-2)]">{lead.realName} · RU · AWP</p>
              </div>
              <span className="data-number ml-auto text-5xl font-black text-[var(--brand)]">
                #2
              </span>
            </div>
            <div className="mt-6 grid grid-cols-3 border-y border-[var(--border)]">
              {[
                ['PPR', '541'],
                ['Confidence', '19%'],
                ['Матчей', '5'],
              ].map(([label, value]) => (
                <div
                  className="border-r border-[var(--border)] px-3 py-4 last:border-r-0"
                  key={label}
                >
                  <span className="text-[10px] uppercase tracking-[.12em] text-[var(--text-3)]">
                    {label}
                  </span>
                  <strong className="data-number mt-1 block text-2xl">{value}</strong>
                </div>
              ))}
            </div>
            <Sparkline values={lead.form} className="mt-5 h-20 w-full" />
            <div className="mt-3 flex justify-between text-xs text-[var(--text-3)]">
              <span>Northern Lights</span>
              <span className="text-[var(--brand)]">Смотреть профиль →</span>
            </div>
          </Link>
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
