import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="container grid min-h-[65vh] place-items-center py-16 text-center">
      <div>
        <p className="data-number text-7xl font-black text-[var(--border)]">404</p>
        <h1 className="mt-4 text-3xl font-black">Профиль не найден</h1>
        <p className="muted mx-auto mt-3 max-w-md">
          Запись отсутствует, была архивирована или ссылка устарела.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            className="rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-bold text-[#0b1016]"
            href="/search"
          >
            Найти в реестре
          </Link>
          <Link
            className="rounded-lg border border-[var(--border)] px-5 py-3 text-sm font-semibold"
            href="/"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
