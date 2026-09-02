import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckIcon } from '@/components/icons';
import { Monogram } from '@/components/ui';
import { getTransfers } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Трансферы игроков',
  description: 'Подтверждённые переходы киберспортсменов между командами.',
  alternates: { canonical: '/transfers' },
};

export default async function TransfersPage() {
  const result = await getTransfers({ pageSize: 40 });
  return (
    <div className="container py-10 md:py-14">
      <p className="eyebrow">cyberID career ledger</p>
      <h1 className="display-title mt-5 text-[72px] md:text-[104px]">Трансферы</h1>
      <p className="muted mt-3 max-w-2xl">
        Проверяемая лента переходов с источником, статусом и неизменяемым checksum.
      </p>
      <div className="mt-8 space-y-3">
        {result.data.map((transfer) => (
          <article
            className="surface grid items-center gap-4 p-4 sm:grid-cols-[1fr_1.4fr_auto]"
            key={transfer.id}
          >
            <Link
              className="flex items-center gap-3"
              href={`/players/${transfer.player?.slug ?? ''}`}
            >
              <Monogram label={transfer.player?.nickname ?? 'P'} />
              <div>
                <strong>{transfer.player?.nickname ?? 'Игрок'}</strong>
                <p className="text-xs text-[var(--text-3)]">
                  {new Date(transfer.transferDate).toLocaleDateString('ru-RU', { timeZone: 'UTC' })}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <span className="rounded-lg bg-[var(--surface-2)] px-3 py-2">
                {transfer.fromTeam?.shortName ?? 'FA'}
              </span>
              <span className="text-[var(--text-3)]">→</span>
              <span className="rounded-lg bg-[var(--surface-2)] px-3 py-2">
                {transfer.toTeam?.shortName ?? 'FA'}
              </span>
            </div>
            <span className="inline-flex items-center gap-2 border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--success)]">
              <CheckIcon className="size-4" />L{transfer.verificationLevel}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
