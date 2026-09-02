'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export function AdSlot({ placement }: { placement: 'HOME_AFTER_HERO' | 'PLAYER_DIRECTORY_TOP' }) {
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${apiUrl}/auth/me`, { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error('session');
        return (await response.json()) as { data: { subscriptionPlan: string } };
      })
      .then((result) => {
        const plan = result?.data.subscriptionPlan ?? 'B2C_FREE';
        setVisible(!['B2C_PREMIUM', 'B2B_START', 'B2B_PRO'].includes(plan));
      })
      .catch(() => setVisible(true));
    return () => controller.abort();
  }, []);

  if (!visible) return null;
  const wrapperClass = placement === 'HOME_AFTER_HERO' ? 'container py-5' : 'py-5';
  return (
    <aside className={wrapperClass} aria-label="Рекламное место">
      <Link
        className="flex min-h-24 min-w-0 flex-col justify-center border border-dashed border-[var(--border)] bg-[var(--surface-1)] px-5 py-4 transition hover:border-[var(--brand)] md:flex-row md:items-center md:justify-between"
        href="/partners"
      >
        <span>
          <span className="eyebrow">Реклама · {placement}</span>
          <strong className="mt-2 block [overflow-wrap:anywhere]">
            Место для проверенного партнёра
          </strong>
        </span>
        <span className="mt-3 text-xs text-[var(--text-3)] md:mt-0">Прайс и требования →</span>
      </Link>
    </aside>
  );
}
