'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type User = {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export function AccountPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${apiUrl}/auth/me`, { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) throw new Error('AUTH_REQUIRED');
        if (!response.ok) throw new Error('Не удалось загрузить профиль');
        return (await response.json()) as { data: User };
      })
      .then((result) => setUser(result.data))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'Не удалось загрузить профиль');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  async function logout() {
    await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
    setError('AUTH_REQUIRED');
  }

  if (loading) {
    return <p className="muted py-16 text-center">Загружаем сессию…</p>;
  }

  if (error === 'AUTH_REQUIRED' || !user) {
    return (
      <section className="surface mx-auto max-w-xl p-8 text-center">
        <p className="eyebrow">Arena ID</p>
        <h1 className="mt-3 text-3xl font-black">Требуется вход</h1>
        <p className="muted mt-3">Ваша сессия не найдена или завершена.</p>
        <Link
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-[#0b1016]"
          href="/login"
        >
          Войти
        </Link>
      </section>
    );
  }

  if (error) return <p className="text-center text-[var(--danger)]">{error}</p>;

  return (
    <section className="surface mx-auto max-w-2xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Личный кабинет</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-.04em]">
            {user.displayName ?? 'Участник Arena'}
          </h1>
          <p className="muted mt-2">{user.email}</p>
        </div>
        <button
          className="focus-ring rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]"
          onClick={logout}
          type="button"
        >
          Выйти
        </button>
      </div>
      <div className="surface-soft mt-7 p-5">
        <p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--text-3)]">
          Роли доступа
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {user.roles.map((role) => (
            <span
              className="rounded-full border border-[var(--border)] bg-[var(--surface-3)] px-3 py-1.5 text-xs font-semibold"
              key={role}
            >
              {role}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
