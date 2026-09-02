import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckIcon } from '@/components/icons';
import { ApiError, getPlayerAchievements } from '@/lib/api';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Достижения ${slug}`,
    alternates: { canonical: `/players/${slug}/achievements` },
  };
}

export default async function PlayerAchievementsPage({ params }: PageProps) {
  let result;
  try {
    result = await getPlayerAchievements((await params).slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const achievements = [...result.achievements].sort((left, right) => {
    const order = { GRANTED: 0, PROVISIONAL: 1, REVOKED: 2, LOCKED: 3 };
    return order[left.status] - order[right.status] || left.code.localeCompare(right.code);
  });
  const granted = achievements.filter((item) => item.status === 'GRANTED').length;

  return (
    <div className="container py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            className="text-xs text-[var(--text-3)] hover:text-white"
            href={`/players/${result.player.slug}`}
          >
            ← Паспорт игрока
          </Link>
          <p className="eyebrow mt-5">Event-driven recognition</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-.04em]">
            Достижения {result.player.nickname}
          </h1>
          <p className="muted mt-3 max-w-2xl">
            Прогресс вычисляется из подтверждённых матчей, турниров, рейтинга и карьерных периодов.
          </p>
        </div>
        <div className="surface-soft px-5 py-4 text-right">
          <span className="data-number text-3xl font-black">{granted}</span>
          <p className="text-xs text-[var(--text-3)]">получено из {achievements.length}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {achievements.map((item) => {
          const percent = Math.min(
            100,
            Math.round((item.progress / Math.max(1, item.target)) * 100),
          );
          const grantedItem = item.status === 'GRANTED';
          return (
            <article
              className={`surface p-5 ${item.status === 'LOCKED' ? 'opacity-65' : ''}`}
              key={item.code}
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className={`grid size-11 place-items-center rounded-xl ${grantedItem ? 'bg-[rgba(214,255,95,.12)] text-[var(--accent)]' : 'bg-[var(--surface-3)] text-[var(--text-3)]'}`}
                >
                  <CheckIcon className="size-5" />
                </div>
                <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                  {item.status}
                </span>
              </div>
              <p className="eyebrow mt-5">
                {item.rarity} · {item.category}
              </p>
              <h2 className="mt-2 text-lg font-bold">{item.title}</h2>
              <p className="muted mt-2 min-h-10 text-sm">{item.description}</p>
              <div className="mt-5 flex items-center justify-between text-xs">
                <span>Прогресс</span>
                <strong className="data-number">
                  {item.progress}/{item.target}
                </strong>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-3)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-4 text-[10px] text-[var(--text-3)]">
                Rule v{item.ruleVersion} · verification L{item.verificationLevel}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
