'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

type User = {
  id: string;
  email: string;
  displayName: string | null;
  emailVerifiedAt: string | null;
  subscriptionPlan: string;
  roles: string[];
};

type Onboarding = {
  emailVerified: boolean;
  claimSubmitted: boolean;
  claimStatus: string | null;
  playerSlug: string | null;
  photoSubmitted: boolean;
  identityApproved: boolean;
  identityStatus: string | null;
  steamVerified: boolean;
  faceitVerified: boolean;
  federationApproved: boolean;
  manualApproval: boolean;
  federationName: string | null;
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
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [playerSlug, setPlayerSlug] = useState(initialPlayerSlug);
  const [method, setMethod] = useState('SOCIAL_CHALLENGE');
  const [statement, setStatement] = useState('');
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadKind, setUploadKind] = useState('PROFILE_PHOTO');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

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
        const [claimsResponse, onboardingResponse] = await Promise.all([
          fetch(`${apiUrl}/claims/me`, { credentials: 'include', signal: controller.signal }),
          fetch(`${apiUrl}/claims/onboarding`, {
            credentials: 'include',
            signal: controller.signal,
          }),
        ]);
        if (claimsResponse.ok) {
          const claimsResult = (await claimsResponse.json()) as { data: Claim[] };
          setClaims(claimsResult.data);
        }
        if (onboardingResponse.ok) {
          const onboardingResult = (await onboardingResponse.json()) as { data: Onboarding };
          setOnboarding(onboardingResult.data);
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
        }),
      });
      const result = (await response.json()) as { data?: Claim; message?: string };
      if (!response.ok || !result.data)
        throw new Error(result.message ?? 'Не удалось отправить заявку');
      setClaims((current) => [result.data!, ...current]);
      setStatement('');
      setClaimMessage('Заявка создана. Теперь загрузите фото и пройдите обязательные привязки.');
    } catch (cause) {
      setClaimMessage(cause instanceof Error ? cause.message : 'Не удалось отправить заявку');
    } finally {
      setSubmitting(false);
    }
  }

  async function startAccountLink(provider: 'steam' | 'faceit') {
    const slug = onboarding?.playerSlug ?? playerSlug;
    if (!slug) return setClaimMessage('Сначала создайте заявку на профиль.');
    setSubmitting(true);
    setClaimMessage(null);
    try {
      const response = await fetch(
        `${apiUrl}/integrations/${provider}/start?playerSlug=${encodeURIComponent(slug)}`,
        { method: 'POST', credentials: 'include' },
      );
      const result = (await response.json()) as {
        data?: { authorizeUrl?: string };
        message?: string;
      };
      if (!response.ok || !result.data?.authorizeUrl) {
        throw new Error(result.message ?? `Интеграция ${provider.toUpperCase()} не настроена`);
      }
      window.location.assign(result.data.authorizeUrl);
    } catch (cause) {
      setClaimMessage(cause instanceof Error ? cause.message : 'Не удалось начать привязку');
      setSubmitting(false);
    }
  }

  async function uploadEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const claim = claims.find((item) =>
      ['SUBMITTED', 'EVIDENCE_REQUESTED', 'IN_REVIEW'].includes(item.status),
    );
    if (!claim || !uploadFile) return setClaimMessage('Выберите файл и активную заявку.');
    setSubmitting(true);
    setClaimMessage(null);
    try {
      const form = new FormData();
      form.set('kind', uploadKind);
      form.set('file', uploadFile);
      const response = await fetch(`${apiUrl}/claims/${claim.id}/evidence/upload`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const result = (await response.json()) as { data?: { id: string }; message?: string };
      if (!response.ok || !result.data) throw new Error(result.message ?? 'Файл не загружен');
      setUploadFile(null);
      setClaimMessage('Файл зашифрован, очищен и добавлен в заявку.');
      window.location.reload();
    } catch (cause) {
      setClaimMessage(cause instanceof Error ? cause.message : 'Файл не загружен');
    } finally {
      setSubmitting(false);
    }
  }

  async function startIdentityCheck() {
    const claim = claims.find((item) =>
      ['SUBMITTED', 'EVIDENCE_REQUESTED', 'IN_REVIEW'].includes(item.status),
    );
    if (!claim) return setClaimMessage('Сначала создайте активную заявку.');
    setSubmitting(true);
    setClaimMessage(null);
    try {
      const response = await fetch(`${apiUrl}/identity/session`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId: claim.id }),
      });
      const result = (await response.json()) as {
        data?: { webSdkUrl?: string };
        message?: string;
      };
      if (!response.ok || !result.data?.webSdkUrl) {
        throw new Error(result.message ?? 'Проверка личности не настроена');
      }
      window.location.assign(result.data.webSdkUrl);
    } catch (cause) {
      setClaimMessage(cause instanceof Error ? cause.message : 'Проверка личности недоступна');
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="muted py-16 text-center">Загружаем сессию…</p>;
  }

  if (error === 'AUTH_REQUIRED' || !user) {
    return (
      <section className="surface mx-auto max-w-xl p-8 text-center">
        <p className="eyebrow">CYBER ID</p>
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

  const onboardingSteps = [
    ['Подтвердить email', onboarding?.emailVerified ?? Boolean(user.emailVerifiedAt)],
    ['Отправить self-claim и фото', onboarding?.claimSubmitted && onboarding.photoSubmitted],
    ['Подтвердить Steam', onboarding?.steamVerified],
    ['Подтвердить FACEIT', onboarding?.faceitVerified],
    ['Документ, лицо и liveness', onboarding?.identityApproved],
    ['Проверка местной федерацией', onboarding?.federationApproved],
    ['Ручное одобрение публикации', onboarding?.manualApproval],
  ] as const;
  const activeClaim = claims.find((item) =>
    ['SUBMITTED', 'EVIDENCE_REQUESTED', 'IN_REVIEW'].includes(item.status),
  );

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Личный кабинет</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-.04em]">
              {user.displayName ?? 'Участник CYBER ID'}
            </h1>
            <p className="muted mt-2">{user.email}</p>
            <p className="mt-2 text-xs text-[var(--text-3)]">
              Тариф: <span className="font-bold text-[var(--brand)]">{user.subscriptionPlan}</span>
            </p>
          </div>
          <button
            className="focus-ring rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]"
            onClick={logout}
            type="button"
          >
            Выйти
          </button>
        </div>
        <div className="mt-7 border-t border-[var(--border)] pt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Допуск в публичный рейтинг</p>
              <h2 className="mt-2 text-2xl font-black">Проверка профиля</h2>
            </div>
            <span className="data-number text-sm text-[var(--text-2)]">
              {onboardingSteps.filter(([, complete]) => complete).length}/{onboardingSteps.length}
            </span>
          </div>
          <ol className="mt-5 grid gap-2 sm:grid-cols-2">
            {onboardingSteps.map(([label, complete], index) => (
              <li className="surface-soft flex min-w-0 items-center gap-3 p-3 text-sm" key={label}>
                <span
                  className={`grid size-7 shrink-0 place-items-center border text-xs font-black ${
                    complete
                      ? 'border-[var(--brand)] bg-[var(--brand)] text-[#101512]'
                      : 'border-[var(--border)] text-[var(--text-3)]'
                  }`}
                >
                  {complete ? '✓' : index + 1}
                </span>
                <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
              </li>
            ))}
          </ol>
          {!user.emailVerifiedAt ? (
            <Link
              className="mt-4 inline-flex min-h-11 items-center bg-[var(--brand)] px-4 text-sm font-black text-[#101512]"
              href="/verify-email"
            >
              Подтвердить email
            </Link>
          ) : null}
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

      <div className="surface grid gap-5 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
        <div>
          <p className="eyebrow">Статистика и архив</p>
          <h2 className="mt-2 text-2xl font-black">Управление подпиской</h2>
          <p className="muted mt-2 text-sm leading-6">
            Бесплатно доступны текущий рейтинг и короткие периоды. Полный архив, сравнения и
            выгрузки открываются по подписке.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center border border-[var(--brand)] px-5 text-sm font-bold text-[var(--brand)]"
          href="/pricing"
        >
          Сравнить тарифы
        </Link>
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
            'Пройти документ, лицо и liveness',
          ].map((requirement, index) => (
            <div className="surface-soft flex items-center gap-3 p-3 text-sm" key={requirement}>
              <span className="data-number text-xs font-black text-[var(--accent)]">
                {index + 1}/6
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
            Комментарий
            <textarea
              className="focus-ring min-h-24 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
              onChange={(event) => setStatement(event.target.value)}
              value={statement}
            />
          </label>
          <button
            className="h-11 rounded-lg bg-[var(--accent)] px-5 text-sm font-black text-[#0b1016] disabled:opacity-50"
            disabled={submitting || !user.emailVerifiedAt || Boolean(activeClaim)}
            type="submit"
          >
            {activeClaim
              ? 'Активная заявка уже создана'
              : submitting
                ? 'Отправляем…'
                : 'Отправить на проверку'}
          </button>
          {claimMessage ? (
            <p className="text-sm text-[var(--text-2)]" role="status">
              {claimMessage}
            </p>
          ) : null}
        </form>
      </div>

      <div className="surface p-6 sm:p-8">
        <p className="eyebrow">Защищённые доказательства</p>
        <h2 className="mt-2 text-2xl font-black">Фото, аккаунты и проверка личности</h2>
        <p className="muted mt-2 text-sm leading-6">
          Файлы шифруются и доступны только проверяющим. Документ и биометрия проходят напрямую
          через Sumsub; cyberID получает только итог проверки.
        </p>
        {!activeClaim ? (
          <p className="mt-4 border border-[var(--warning)]/35 bg-[var(--warning)]/10 p-3 text-xs leading-5 text-[var(--warning)]">
            Сначала подтвердите email и создайте заявку на профиль — после этого откроются загрузка
            и привязки.
          </p>
        ) : null}
        <form
          className="mt-6 grid gap-4 sm:grid-cols-[180px_1fr_auto] sm:items-end"
          onSubmit={uploadEvidence}
        >
          <label className="grid gap-2 text-sm font-semibold">
            Назначение файла
            <select
              className="focus-ring h-11 border border-[var(--border)] bg-[var(--surface-2)] px-3"
              disabled={!activeClaim}
              onChange={(event) => setUploadKind(event.target.value)}
              value={uploadKind}
            >
              <option value="PROFILE_PHOTO">Фото профиля</option>
              <option value="IDENTITY_DOCUMENT">Документ</option>
            </select>
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold">
            JPEG, PNG, WebP или PDF
            <input
              accept={
                uploadKind === 'PROFILE_PHOTO'
                  ? 'image/jpeg,image/png,image/webp'
                  : 'image/jpeg,image/png,image/webp,application/pdf'
              }
              className="focus-ring min-h-11 min-w-0 border border-[var(--border)] bg-[var(--surface-2)] p-2 text-xs"
              disabled={!activeClaim}
              onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          <button
            className="min-h-11 bg-[var(--brand)] px-5 text-sm font-black text-[#101512] disabled:opacity-50"
            disabled={submitting || !uploadFile || !activeClaim}
            type="submit"
          >
            Загрузить
          </button>
        </form>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <button
            className="min-h-12 border border-[var(--border)] px-4 text-sm font-black hover:border-[var(--brand)] disabled:opacity-50"
            disabled={submitting || !activeClaim || onboarding?.steamVerified}
            onClick={() => startAccountLink('steam')}
            type="button"
          >
            {onboarding?.steamVerified ? '✓ Steam подтверждён' : 'Подключить Steam'}
          </button>
          <button
            className="min-h-12 border border-[var(--border)] px-4 text-sm font-black hover:border-[var(--brand)] disabled:opacity-50"
            disabled={submitting || !activeClaim || onboarding?.faceitVerified}
            onClick={() => startAccountLink('faceit')}
            type="button"
          >
            {onboarding?.faceitVerified ? '✓ FACEIT подтверждён' : 'Подключить FACEIT'}
          </button>
          <button
            className="min-h-12 border border-[var(--brand)] px-4 text-sm font-black text-[var(--brand)] disabled:opacity-50"
            disabled={submitting || !activeClaim || onboarding?.identityApproved}
            onClick={startIdentityCheck}
            type="button"
          >
            {onboarding?.identityApproved ? '✓ Личность подтверждена' : 'Документ + liveness'}
          </button>
        </div>
        {onboarding?.identityStatus && !onboarding.identityApproved ? (
          <p className="mt-4 text-xs text-[var(--warning)]">
            Статус проверки личности: {onboarding.identityStatus}
          </p>
        ) : null}
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
