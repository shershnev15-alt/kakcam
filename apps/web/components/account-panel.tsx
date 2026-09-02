'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

type User = {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
};

type Claim = {
  id: string;
  status: string;
  method: string;
  decisionReason: string | null;
  player: { slug: string; nickname: string };
  evidence: Array<{ id: string; kind: string; checksum: string }>;
  createdAt: string;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export function AccountPanel({ initialPlayerSlug = '' }: { initialPlayerSlug?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [playerSlug, setPlayerSlug] = useState(initialPlayerSlug);
  const [method, setMethod] = useState('SOCIAL_CHALLENGE');
  const [evidenceKind, setEvidenceKind] = useState('REFERENCE');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [statement, setStatement] = useState('');
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${apiUrl}/auth/me`, { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) throw new Error('AUTH_REQUIRED');
        if (!response.ok) throw new Error('Не удалось загрузить профиль');
        return (await response.json()) as { data: User };
      })
      .then(async (result) => {
        setUser(result.data);
        const claimsResponse = await fetch(`${apiUrl}/claims/me`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (claimsResponse.ok) {
          const claimsResult = (await claimsResponse.json()) as { data: Claim[] };
          setClaims(claimsResult.data);
        }
      })
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

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setClaimMessage(null);
    try {
      const response = await fetch(`${apiUrl}/claims`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerSlug,
          method,
          statement: statement || undefined,
          evidence: { kind: evidenceKind, reference: evidenceReference },
        }),
      });
      const result = (await response.json()) as { data?: Claim; message?: string };
      if (!response.ok || !result.data)
        throw new Error(result.message ?? 'Не удалось отправить заявку');
      setClaims((current) => [result.data!, ...current]);
      setEvidenceReference('');
      setStatement('');
      setClaimMessage('Заявка принята и передана модератору.');
    } catch (cause) {
      setClaimMessage(cause instanceof Error ? cause.message : 'Не удалось отправить заявку');
    } finally {
      setSubmitting(false);
    }
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
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="surface p-6 sm:p-8">
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
          {user.roles.some((role) => ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(role)) ? (
            <Link
              className="mt-4 inline-flex text-xs font-bold text-[var(--accent)]"
              href="/moderation"
            >
              Открыть очередь модерации →
            </Link>
          ) : null}
        </div>
      </div>

      <div className="surface p-6 sm:p-8">
        <p className="eyebrow">Claim Profile</p>
        <h2 className="mt-2 text-2xl font-black">Подтвердить профиль игрока</h2>
        <p className="muted mt-2 text-sm">
          Заявка подтверждает, что профиль принадлежит вам. До этого момента профиль, статистика и
          рейтинг закрыты для общего доступа.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {[
            'Самостоятельно подтвердить профиль',
            'Получить подтверждение местной федерации',
            'Предоставить обязательное фото',
            'Привязать и подтвердить Steam',
            'Привязать и подтвердить FACEIT',
          ].map((requirement, index) => (
            <div className="surface-soft flex items-center gap-3 p-3 text-sm" key={requirement}>
              <span className="data-number text-xs font-black text-[var(--accent)]">
                {index + 1}/5
              </span>
              <span>{requirement}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-[var(--text-3)]">
          Исходные доказательства и фото доступны только проверяющим. На сайт выводится отдельная
          одобренная версия фотографии и статус двух игровых аккаунтов.
        </p>
        <form className="mt-6 grid gap-4" onSubmit={submitClaim}>
          <label className="grid gap-2 text-sm font-semibold">
            Slug игрока
            <input
              className="focus-ring h-11 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3"
              onChange={(event) => setPlayerSlug(event.target.value)}
              required
              value={playerSlug}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Способ подтверждения
            <select
              className="focus-ring h-11 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3"
              onChange={(event) => setMethod(event.target.value)}
              value={method}
            >
              <option value="SOCIAL_CHALLENGE">Код в социальной сети</option>
              <option value="GAME_ACCOUNT">Подключённый игровой аккаунт</option>
              <option value="TEAM_CONFIRMATION">Подтверждение команды</option>
              <option value="ORGANIZER_CONFIRMATION">Подтверждение организатора</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Тип доказательства
            <select
              className="focus-ring h-11 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3"
              onChange={(event) => setEvidenceKind(event.target.value)}
              value={evidenceKind}
            >
              <option value="REFERENCE">Ссылка или идентификатор</option>
              <option value="PROFILE_PHOTO">Обязательное фото профиля</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Защищённая ссылка или идентификатор доказательства
            <input
              className="focus-ring h-11 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3"
              onChange={(event) => setEvidenceReference(event.target.value)}
              placeholder="https://… или secure-upload:123"
              required
              value={evidenceReference}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Комментарий
            <textarea
              className="focus-ring min-h-24 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
              onChange={(event) => setStatement(event.target.value)}
              value={statement}
            />
          </label>
          <button
            className="h-11 rounded-lg bg-[var(--accent)] px-5 text-sm font-black text-[#0b1016] disabled:opacity-50"
            disabled={submitting}
            type="submit"
          >
            {submitting ? 'Отправляем…' : 'Отправить на проверку'}
          </button>
          {claimMessage ? (
            <p className="text-sm text-[var(--text-2)]" role="status">
              {claimMessage}
            </p>
          ) : null}
        </form>
      </div>

      <div className="surface p-6 sm:p-8">
        <p className="eyebrow">История заявок</p>
        <h2 className="mt-2 text-xl font-bold">Мои claims</h2>
        <div className="mt-5 space-y-3">
          {claims.length ? (
            claims.map((claim) => (
              <article
                className="surface-soft flex flex-wrap items-center justify-between gap-3 p-4"
                key={claim.id}
              >
                <div>
                  <strong>{claim.player.nickname}</strong>
                  <p className="mt-1 text-xs text-[var(--text-3)]">
                    {claim.method} · {claim.evidence.length} evidence
                  </p>
                </div>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-bold">
                  {claim.status}
                </span>
                {claim.decisionReason ? (
                  <p className="w-full text-xs text-[var(--text-2)]">
                    Решение: {claim.decisionReason}
                  </p>
                ) : null}
              </article>
            ))
          ) : (
            <p className="muted text-sm">Заявок пока нет.</p>
          )}
        </div>
      </div>
    </section>
  );
}
