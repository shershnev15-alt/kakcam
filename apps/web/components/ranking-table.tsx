import type { PlayerSummary, TeamSummary } from '@arena/types';
import Link from 'next/link';
import { CyberLevelBadge, Delta, Monogram, Sparkline, VerificationBadge } from './ui';

export function PlayerRankingTable({ items }: { items: PlayerSummary[] }) {
  return (
    <div className="surface overflow-hidden">
      <div className="hidden grid-cols-[56px_1.5fr_.8fr_.7fr_90px_120px_90px] gap-4 border-b border-[var(--border)] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] md:grid">
        <span>Место</span>
        <span>Игрок</span>
        <span>Команда</span>
        <span>Форма</span>
        <span>Level</span>
        <span>PPR</span>
        <span>Confidence</span>
      </div>
      {items.map((player, index) => (
        <Link
          href={`/players/${player.slug}`}
          key={player.id}
          className={`grid grid-cols-[40px_1fr_auto] items-center gap-3 px-4 py-4 transition hover:bg-[rgba(69,255,166,.04)] md:grid-cols-[56px_1.5fr_.8fr_.7fr_90px_120px_90px] md:gap-4 md:px-5 ${index ? 'border-t border-[var(--border)]' : ''} ${player.slug === 'frostbyte' ? 'bg-[rgba(69,255,166,.035)] shadow-[inset_3px_0_var(--brand)]' : ''}`}
        >
          <span className="data-number text-center text-sm text-[var(--text-3)]">
            {player.rating.rank}
          </span>
          <div className="flex min-w-0 items-center gap-3">
            <Monogram label={player.nickname} size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <strong className="truncate text-sm">{player.nickname}</strong>
                {player.verificationLevel >= 3 ? (
                  <VerificationBadge level={player.verificationLevel} compact />
                ) : null}
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-3)] md:hidden">
                {player.teamShortName} · {player.roles[0]}
              </p>
              <div className="mt-2 md:hidden">
                <CyberLevelBadge rating={player.rating} compact />
              </div>
            </div>
          </div>
          <span className="hidden text-sm text-[var(--text-2)] md:block">
            {player.teamShortName}
          </span>
          <Sparkline values={player.form} className="hidden h-8 w-24 md:block" />
          <div className="hidden md:block">
            <CyberLevelBadge rating={player.rating} compact />
          </div>
          <div className="text-right md:text-left">
            <strong className="data-number block text-lg">{player.rating.score}</strong>
            <Delta value={player.rating.delta30d} />
          </div>
          <span className="data-number hidden text-sm text-[var(--text-2)] md:block">
            {player.rating.confidence}%
          </span>
        </Link>
      ))}
    </div>
  );
}

export function TeamRankingTable({ items }: { items: TeamSummary[] }) {
  return (
    <div className="surface overflow-hidden">
      <div className="hidden grid-cols-[56px_1.5fr_.7fr_.7fr_120px_90px] gap-4 border-b border-[var(--border)] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] md:grid">
        <span>Место</span>
        <span>Команда</span>
        <span>Страна</span>
        <span>Форма</span>
        <span>TPR</span>
        <span>Confidence</span>
      </div>
      {items.map((team, index) => (
        <Link
          href={`/teams/${team.slug}`}
          key={team.id}
          className={`grid grid-cols-[40px_1fr_auto] items-center gap-3 px-4 py-4 transition hover:bg-[rgba(69,255,166,.04)] md:grid-cols-[56px_1.5fr_.7fr_.7fr_120px_90px] md:gap-4 md:px-5 ${index ? 'border-t border-[var(--border)]' : ''}`}
        >
          <span className="data-number text-center text-sm text-[var(--text-3)]">
            {team.rating.rank}
          </span>
          <div className="flex min-w-0 items-center gap-3">
            <Monogram label={team.shortName} size="sm" />
            <div>
              <strong className="text-sm">{team.name}</strong>
              <p className="mt-1 text-[11px] text-[var(--text-3)] md:hidden">{team.countryCode}</p>
            </div>
          </div>
          <span className="hidden text-sm text-[var(--text-2)] md:block">{team.countryName}</span>
          <div className="hidden gap-1 md:flex">
            {team.form.map((result, i) => (
              <span
                key={i}
                className={`grid size-6 place-items-center rounded text-[9px] font-bold ${result === 'W' ? 'bg-[rgba(67,209,125,.1)] text-[var(--success)]' : 'bg-[rgba(241,105,117,.1)] text-[var(--danger)]'}`}
              >
                {result}
              </span>
            ))}
          </div>
          <div className="text-right md:text-left">
            <strong className="data-number block text-lg">{team.rating.score}</strong>
            <Delta value={team.rating.delta30d} />
          </div>
          <span className="data-number hidden text-sm text-[var(--text-2)] md:block">
            {team.rating.confidence}%
          </span>
        </Link>
      ))}
    </div>
  );
}
