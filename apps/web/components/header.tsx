import Link from 'next/link';
import { MenuIcon, SearchIcon } from './icons';

const navigation = [
  ['Игроки', '/players'],
  ['Команды', '/teams'],
  ['Рейтинги', '/rankings/players'],
  ['Матчи', '/matches'],
  ['Турниры', '/tournaments'],
  ['Трансферы', '/transfers'],
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-soft)] bg-[rgba(18,18,18,.94)] backdrop-blur-xl">
      <div className="container flex h-[62px] items-center gap-7">
        <Link
          href="/"
          className="shrink-0 text-[24px] font-black tracking-[-.08em]"
          aria-label="cyberID — главная"
        >
          <span>cyber</span>
          <span className="text-[var(--brand)]">ID</span>
        </Link>
        <nav className="hidden items-center gap-1 xl:flex" aria-label="Основная навигация">
          {navigation.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="border-b border-transparent px-3 py-5 text-[13px] font-semibold text-[var(--text-2)] transition hover:border-[var(--brand)] hover:text-[var(--text-1)]"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/search"
            className="flex h-9 items-center gap-2 border-l border-[var(--border)] px-4 text-sm text-[var(--text-3)] hover:text-[var(--text-1)]"
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
            className="hidden h-9 items-center border border-[var(--border)] px-4 text-sm font-semibold transition hover:border-[var(--brand)] hover:text-[var(--brand)] sm:flex"
          >
            Войти
          </Link>
          <button
            className="grid size-9 place-items-center border border-[var(--border)] xl:hidden"
            aria-label="Открыть меню"
          >
            <MenuIcon className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
