'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

type AuthMode = 'login' | 'register';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegistration = mode === 'register';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
      ...(isRegistration ? { displayName: String(form.get('displayName') ?? '') } : {}),
    };

    try {
      const response = await fetch(`${apiUrl}/auth/${isRegistration ? 'register' : 'login'}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { message?: string | string[] };
      if (!response.ok) {
        const message = Array.isArray(result.message) ? result.message[0] : result.message;
        throw new Error(message ?? 'Не удалось выполнить запрос');
      }
      router.push('/account');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Сервис временно недоступен');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="container grid min-h-[calc(100vh-8rem)] place-items-center py-12">
      <section
        className="surface grain w-full max-w-md overflow-hidden p-6 sm:p-8"
        aria-labelledby="auth-title"
      >
        <p className="eyebrow">Arena ID</p>
        <h1 id="auth-title" className="mt-3 text-3xl font-black tracking-[-.04em]">
          {isRegistration ? 'Создать аккаунт' : 'С возвращением'}
        </h1>
        <p className="muted mt-2 text-sm leading-6">
          {isRegistration
            ? 'Сохраняйте избранное и участвуйте в развитии киберспортивного реестра.'
            : 'Войдите, чтобы продолжить работу с Arena Passport.'}
        </p>

        <form className="mt-7 grid gap-5" onSubmit={submit}>
          {isRegistration ? (
            <label className="grid gap-2 text-sm font-semibold">
              Имя
              <input
                className="focus-ring h-12 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 font-normal"
                name="displayName"
                autoComplete="name"
                minLength={2}
                maxLength={60}
                required
              />
            </label>
          ) : null}
          <label className="grid gap-2 text-sm font-semibold">
            Email
            <input
              className="focus-ring h-12 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 font-normal"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Пароль
            <input
              className="focus-ring h-12 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 font-normal"
              name="password"
              type="password"
              autoComplete={isRegistration ? 'new-password' : 'current-password'}
              minLength={isRegistration ? 12 : 1}
              maxLength={128}
              required
            />
            {isRegistration ? (
              <span className="text-xs font-normal text-[var(--text-3)]">Не менее 12 символов</span>
            ) : null}
          </label>

          {error ? (
            <p
              className="rounded-lg border border-[rgba(241,105,117,.35)] bg-[rgba(241,105,117,.08)] p-3 text-sm text-[var(--danger)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            className="focus-ring h-12 rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-[#0b1016] transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending ? 'Подождите…' : isRegistration ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>

        <p className="muted mt-6 text-center text-sm">
          {isRegistration ? 'Уже есть аккаунт?' : 'Ещё нет аккаунта?'}{' '}
          <Link
            className="font-semibold text-[var(--text-1)] underline underline-offset-4"
            href={isRegistration ? '/login' : '/register'}
          >
            {isRegistration ? 'Войти' : 'Зарегистрироваться'}
          </Link>
        </p>
      </section>
    </div>
  );
}
