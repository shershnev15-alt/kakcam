import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckIcon } from '@/components/icons';
import { Monogram } from '@/components/ui';
import { ApiError, getPlayerCareer } from '@/lib/api';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Карьера ${slug}`, alternates: { canonical: `/players/${slug}/career` } };
}

function date(value?: string) {
  return value
    ? new Date(value).toLocaleDateString('ru-RU', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : 'сейчас';
}

export default async function PlayerCareerPage({ params }: PageProps) {
  let career;
  try {
    career = await getPlayerCareer((await params).slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <div className="container py-10 md:py-14">
      <Link
        className="text-xs text-[var(--text-3)] hover:text-white"
        href={`/players/${career.player.slug}`}
      >
        ← Паспорт игрока
      </Link>
      <p className="eyebrow mt-5">Verified timeline</p>
      <h1 className="mt-2 text-4xl font-black tracking-[-.04em]">
        Карьера {career.player.nickname}
      </h1>
      <p className="muted mt-3 max-w-2xl">
        Периоды состава и переходы не переписывают прошлое: каждый факт хранит источник и уровень
        проверки.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
        <section>
          <h2 className="text-xl font-bold">История команд</h2>
          <div className="surface relative mt-4 space-y-8 p-6 before:absolute before:bottom-8 before:left-[46px] before:top-8 before:w-px before:bg-[var(--border)]">
            {career.periods.map((period) => (
              <article className="relative flex gap-4" key={period.id}>
                <Monogram label={period.team?.shortName ?? 'FA'} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{period.team?.name ?? 'Свободный агент'}</strong>
                    <span className="text-xs text-[var(--text-3)]">
                      L{period.verificationLevel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-2)]">
                    {period.role ?? 'Player'} · {period.game.name}
                  </p>
                  <p className="mt-2 text-xs text-[var(--text-3)]">
                    {date(period.startedAt)} — {date(period.endedAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold">Переходы</h2>
          <div className="mt-4 space-y-3">
            {career.transfers.map((transfer) => (
              <article className="surface p-5" key={transfer.id}>
                <div className="flex items-center gap-2 text-xs text-[var(--text-3)]">
                  <CheckIcon className="size-4 text-[var(--success)]" />
                  {transfer.status} · L{transfer.verificationLevel}
                </div>
                <p className="mt-3 font-semibold">
                  {transfer.fromTeam?.shortName ?? 'FA'} → {transfer.toTeam?.shortName ?? 'FA'}
                </p>
                <p className="mt-1 text-xs text-[var(--text-3)]">{date(transfer.transferDate)}</p>
                <p className="mt-4 truncate font-mono text-[10px] text-[var(--text-3)]">
                  {transfer.checksum}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
