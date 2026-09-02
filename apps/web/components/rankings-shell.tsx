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
      <section className="border-b border-[var(--border)]">
        <div className="container py-10 md:py-14">
          <p className="eyebrow">Arena Index · CS2</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-.04em] md:text-6xl">
            Рейтинг {active === 'players' ? 'игроков' : 'команд'}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-[var(--text-2)]">
            Прозрачная оценка формы с учетом силы соперников, уровня турниров, свежести результатов
            и достоверности данных.
          </p>
          <div className="mt-8 flex w-fit rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-1">
            <Link
              href="/rankings/players"
              className={`rounded-md px-4 py-2 text-sm font-semibold ${active === 'players' ? 'bg-[var(--surface-3)] text-white' : 'text-[var(--text-3)]'}`}
            >
              Игроки
            </Link>
            <Link
              href="/rankings/teams"
              className={`rounded-md px-4 py-2 text-sm font-semibold ${active === 'teams' ? 'bg-[var(--surface-3)] text-white' : 'text-[var(--text-3)]'}`}
            >
              Команды
            </Link>
          </div>
        </div>
      </section>
      <div className="container py-8 md:py-10">
        <div className="mb-5 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-lg border border-[var(--brand)] bg-[rgba(95,139,255,.1)] px-3 py-2.5 text-[#AFC4FF]">
            CS2
          </span>
          <span className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-[var(--text-2)]">
            СНГ
          </span>
          <span className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-[var(--text-2)]">
            90 дней
          </span>
          <span className="rounded-lg border border-[rgba(67,209,125,.35)] bg-[rgba(67,209,125,.08)] px-3 py-2.5 text-[var(--success)]">
            Источник: PostgreSQL
          </span>
          {ratingRun ? (
            <span className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-[var(--text-2)]">
              Формула: {ratingRun.formulaVersion}
            </span>
          ) : null}
        </div>
        {children}
        <div className="mt-5 flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 text-xs text-[var(--text-3)] sm:flex-row sm:items-center">
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
