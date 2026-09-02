import Link from 'next/link';
import type { ReactNode } from 'react';

export function RankingsShell({
  active,
  children,
  ratingRun,
}: {
  active: 'players' | 'teams';
  children: ReactNode;
  ratingRun:
    | {
        formulaVersion: string;
        inputCutoff: string;
        checksum: string;
      }
    | undefined;
}) {
  return (
    <>
      <section className="signal-stage border-b border-[var(--border)]">
        <div className="container py-10 md:py-14">
          <p className="eyebrow">cyberID index · CS2</p>
          <h1 className="display-title mt-5 text-[64px] md:text-[92px]">
            Рейтинг {active === 'players' ? 'игроков' : 'команд'}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-[var(--text-2)]">
            Прозрачная оценка формы с учетом силы соперников, уровня турниров, свежести результатов
            и достоверности данных.
          </p>
          <div className="mt-8 flex w-fit border border-[var(--border)] bg-[var(--surface-1)] p-1">
            <Link
              href="/rankings/players"
              className={`px-4 py-2 text-sm font-semibold ${active === 'players' ? 'bg-[var(--brand)] text-[#101512]' : 'text-[var(--text-3)]'}`}
            >
              Игроки
            </Link>
            <Link
              href="/rankings/teams"
              className={`px-4 py-2 text-sm font-semibold ${active === 'teams' ? 'bg-[var(--brand)] text-[#101512]' : 'text-[var(--text-3)]'}`}
            >
              Команды
            </Link>
          </div>
        </div>
      </section>
      <div className="container py-8 md:py-10">
        <div className="mb-5 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="border border-[var(--brand)] bg-[rgba(69,255,166,.06)] px-3 py-2.5 text-[var(--brand)]">
            CS2
          </span>
          <span className="border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-[var(--text-2)]">
            СНГ
          </span>
          <span className="border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-[var(--text-2)]">
            90 дней
          </span>
          <span className="border border-[rgba(69,255,166,.35)] bg-[rgba(69,255,166,.06)] px-3 py-2.5 text-[var(--success)]">
            Источник: PostgreSQL
          </span>
          {ratingRun ? (
            <span className="border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-[var(--text-2)]">
              Формула: {ratingRun.formulaVersion}
            </span>
          ) : null}
        </div>
        {children}
        <div className="mt-5 flex flex-col gap-3 border border-[var(--border)] bg-[var(--surface-1)] p-4 text-xs text-[var(--text-3)] sm:flex-row sm:items-center">
          <span>
            {ratingRun
              ? `Cutoff: ${new Date(ratingRun.inputCutoff).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} · checksum ${ratingRun.checksum.slice(0, 10)}`
              : 'Опубликованный рейтинг пока недоступен'}
          </span>
          <Link href="/methodology" className="font-bold text-[var(--accent)] sm:ml-auto">
            Как рассчитывается рейтинг →
          </Link>
        </div>
      </div>
    </>
  );
}
