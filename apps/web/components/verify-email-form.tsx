'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export function VerifyEmailForm() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const preview = sessionStorage.getItem('cyberid-preview-email-token');
    if (preview) setToken(preview);
  }, []);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/auth/verify-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const result = (await response.json()) as { message?: string | string[] };
      if (!response.ok) {
        throw new Error(
          Array.isArray(result.message)
            ? result.message[0]
            : (result.message ?? 'Не удалось подтвердить email'),
        );
      }
      sessionStorage.removeItem('cyberid-preview-email-token');
      router.push('/account');
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Сервис временно недоступен');
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiUrl}/auth/resend-email`, {
        method: 'POST',
        credentials: 'include',
      });
      const result = (await response.json()) as {
        data?: { previewToken?: string; alreadyVerified?: boolean };
        message?: string;
      };
      if (!response.ok) throw new Error(result.message ?? 'Не удалось отправить письмо');
      if (result.data?.previewToken) {
        sessionStorage.setItem('cyberid-preview-email-token', result.data.previewToken);
        setToken(result.data.previewToken);
      }
      setMessage(
        result.data?.alreadyVerified ? 'Email уже подтверждён.' : 'Новое письмо отправлено.',
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Сервис временно недоступен');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="container grid min-h-[calc(100vh-8rem)] place-items-center py-12">
      <section className="surface w-full max-w-lg p-6 sm:p-8" aria-labelledby="verify-title">
        <p className="eyebrow">cyberID · шаг 2 из 6</p>
        <h1 id="verify-title" className="display-title mt-4 text-5xl">
          Подтвердите email
        </h1>
        <p className="muted mt-4 text-sm leading-6">
          Код действует 24 часа. Без подтверждённой почты нельзя отправить профиль на ручную
          проверку.
        </p>
        <form className="mt-7 grid gap-4" onSubmit={verify}>
          <label className="grid gap-2 text-sm font-semibold">
            Код из письма
            <input
              className="focus-ring min-h-12 w-full border border-[var(--border)] bg-[var(--surface-2)] px-4 font-mono [overflow-wrap:anywhere]"
              maxLength={128}
              minLength={32}
              onChange={(event) => setToken(event.target.value)}
              required
              value={token}
            />
          </label>
          <button
            className="focus-ring min-h-12 bg-[var(--brand)] px-5 text-sm font-black text-[#101512] disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending ? 'Проверяем…' : 'Подтвердить email'}
          </button>
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <button
            className="focus-ring text-[var(--brand)] underline underline-offset-4 disabled:opacity-50"
            disabled={pending}
            onClick={resend}
            type="button"
          >
            Отправить код повторно
          </button>
          <Link href="/account" className="text-[var(--text-2)]">
            В кабинет →
          </Link>
        </div>
        {message ? (
          <p
            className="mt-5 border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm"
            role="status"
          >
            {message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
