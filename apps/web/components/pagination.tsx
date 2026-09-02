import Link from 'next/link';

export function Pagination({
  page,
  totalPages,
  pathname,
  params,
}: {
  page: number;
  totalPages: number;
  pathname: string;
  params: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function href(target: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    query.set('page', String(target));
    return `${pathname}?${query.toString()}`;
  }

  return (
    <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Пагинация">
      {page > 1 ? (
        <Link
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]"
          href={href(page - 1)}
        >
          ← Назад
        </Link>
      ) : (
        <span />
      )}
      <span className="data-number text-sm text-[var(--text-3)]">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]"
          href={href(page + 1)}
        >
          Далее →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
