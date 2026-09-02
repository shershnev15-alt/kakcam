import Link from 'next/link';
import { MenuIcon, SearchIcon } from './icons';

const navigation = [
  ['Матчи', '/matches'],
  ['Игроки', '/players'],
  ['Команды', '/teams'],
  ['Рейтинги', '/rankings/players'],
  ['Турниры', '/tournaments'],
  ['Трансферы', '/transfers'],
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(9,12,18,.88)] backdrop-blur-xl">
      <div className="container flex h-16 items-center gap-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2"
          aria-label="Arena Passport — главная"
        >
          <span className="grid size-8 place-items-center rounded-lg border border-[rgba(214,255,95,.35)] bg-[rgba(214,255,95,.08)] font-black text-[var(--accent)]">
            A
          </span>
          <span className="hidden text-sm font-bold tracking-[.08em] sm:inline">
            ARENA <span className="text-[var(--text-3)]">PASSPORT</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 xl:flex" aria-label="Основная навигация">
          {navigation.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-sm font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/search"
            className="flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm text-[var(--text-2)] hover:border-[var(--text-3)]"
            aria-label="Поиск"
          >
            <SearchIcon className="size-4" />
            <span className="hidden xl:inline">Найти игрока, команду…</span>
            <kbd className="hidden rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-3)] 2xl:inline">
              ⌘K
            </kbd>
          </Link>
          <Link
            href="/login"
            className="hidden h-10 items-center rounded-lg bg-[var(--text-1)] px-4 text-sm font-semibold transition hover:bg-white sm:flex"
            style={{ color: '#090c12' }}
          >
            Войти
          </Link>
          <button
            className="grid size-10 place-items-center rounded-lg border border-[var(--border)] xl:hidden"
            aria-label="Открыть меню"
          >
            <MenuIcon className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
