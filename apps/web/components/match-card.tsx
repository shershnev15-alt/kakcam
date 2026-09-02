import type { MatchSummary } from '@arena/types';
import Link from 'next/link';
import { Monogram } from './ui';

export function MatchCard({ match }: { match: MatchSummary }) {
  const home = match.homeTeam;
  const away = match.awayTeam;
  const live = match.status === 'LIVE';
  return (
    <Link
      href={`/matches/${match.id}`}
      className="surface block overflow-hidden transition hover:border-[var(--brand)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 text-[11px]">
        <span className={live ? 'font-bold text-[var(--danger)]' : 'text-[var(--text-3)]'}>
          {live ? '● LIVE' : match.status === 'UPCOMING' ? 'СКОРО' : 'ЗАВЕРШЕН'}
        </span>
        <span className="truncate pl-3 text-[var(--text-3)]">{match.tournament}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
        <div className="flex min-w-0 items-center gap-2">
          <Monogram label={home.shortName} size="sm" />
          <strong className="hidden truncate text-sm sm:block">{home.shortName}</strong>
        </div>
        <div className="text-center">
          <p className="data-number text-xl font-bold">
            {match.status === 'UPCOMING'
              ? new Date(match.startsAt).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Europe/Moscow',
                })
              : `${match.homeScore} : ${match.awayScore}`}
          </p>
          <p className="mt-1 text-[10px] text-[var(--text-3)]">
            BO{match.bestOf} · {match.stage}
          </p>
        </div>
        <div className="flex min-w-0 flex-row-reverse items-center gap-2">
          <Monogram label={away.shortName} size="sm" />
          <strong className="hidden truncate text-sm sm:block">{away.shortName}</strong>
        </div>
      </div>
    </Link>
  );
}
