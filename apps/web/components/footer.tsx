import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--border)] bg-[var(--surface-1)]/60">
      <div className="container flex flex-col gap-5 py-8 text-sm text-[var(--text-3)] md:flex-row md:items-center">
        <p>© 2026 Arena Passport · Prototype v0.1</p>
        <nav className="flex flex-wrap gap-5 md:ml-auto" aria-label="Ссылки в подвале">
          <Link href="/about">О проекте</Link>
          <Link href="/methodology">Методология</Link>
          <Link href="/sources">Источники данных</Link>
          <Link href="/privacy">Конфиденциальность</Link>
        </nav>
      </div>
    </footer>
  );
}
