import type { PlayerSummary, RatingSnapshot, TeamSummary, VerificationLevel } from '@arena/types';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CheckIcon, TrendIcon } from './icons';

export function VerificationBadge({
  level,
  compact = false,
}: {
  level: VerificationLevel;
  compact?: boolean;
}) {
  const labels = [
    'Не подтвержден',
    'Аккаунт',
    'Личность',
    'Организатор',
    'Официально',
    'Платформа',
  ];
  return (
    <span className="inline-flex items-center gap-1.5 border border-[rgba(69,255,166,.28)] bg-[rgba(69,255,166,.06)] px-2 py-1 text-[11px] font-semibold text-[var(--success)]">
      <CheckIcon className="size-3.5" />
      {compact ? `V${level}` : labels[level]}
    </span>
  );
}

export function Monogram({
  label,
  size = 'md',
}: {
  label: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizes = {
    sm: 'size-9 text-xs',
    md: 'size-12 text-sm',
    lg: 'size-16 text-lg',
    xl: 'size-24 text-3xl md:size-32 md:text-4xl',
  };
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden border border-[rgba(69,255,166,.5)] bg-[var(--surface-2)] font-black uppercase tracking-tight text-[var(--text-1)] shadow-[inset_0_0_24px_rgba(69,255,166,.04)] ${sizes[size]}`}
    >
      {label.slice(0, 2)}
    </span>
  );
}

export function PlayerPhoto({
  src,
  label,
  size = 'md',
}: {
  src?: string | null | undefined;
  label: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  if (!src) return <Monogram label={label} size={size} />;
  const sizes = {
    sm: 'size-9 rounded-lg',
    md: 'size-12 rounded-xl',
    lg: 'size-16 rounded-2xl',
    xl: 'size-28 rounded-3xl md:size-36',
  };
  return (
    <img
      src={src}
      alt={`Фото игрока ${label}`}
      className={`${sizes[size]} shrink-0 border border-[var(--border)] object-cover`}
    />
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h2 className="font-[var(--display)] text-2xl font-black uppercase tracking-[-.045em] md:text-[30px]">
          {title}
        </h2>
      </div>
      {action ? (
        <Link
          className="text-sm font-semibold text-[var(--text-2)] hover:text-[var(--text-1)]"
          href={action.href}
        >
          {action.label} →
        </Link>
      ) : null}
    </div>
  );
}

export function Delta({ value, period }: { value: number; period?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${positive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}
    >
      <TrendIcon className={`size-3.5 ${positive ? '' : 'rotate-180'}`} />
      {positive ? '+' : ''}
      {value}
      {period ? ` / ${period}` : ''}
    </span>
  );
}

export function Sparkline({ values, className = '' }: { values: number[]; className?: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const points = values
    .map(
      (value, index) =>
        `${(index / Math.max(1, values.length - 1)) * 100},${38 - ((value - min) / range) * 32}`,
    )
    .join(' ');
  return (
    <svg
      className={className}
      viewBox="0 0 100 42"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Динамика: от ${values[0]} до ${values.at(-1)}`}
    >
      <defs>
        <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#45FFA6" stopOpacity=".24" />
          <stop offset="1" stopColor="#45FFA6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M0,42 L${points} L100,42 Z`} fill="url(#chart-fill)" />
      <polyline
        points={points}
        fill="none"
        stroke="#45FFA6"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function RatingRing({
  score,
  confidence,
  label = 'PPR',
}: {
  score: number;
  confidence: number;
  label?: string;
}) {
  return (
    <div
      className="relative grid size-32 shrink-0 place-items-center rounded-full p-[7px]"
      style={{ background: `conic-gradient(var(--accent) ${score / 10}%, var(--surface-3) 0)` }}
    >
      <div className="grid size-full place-items-center rounded-full bg-[var(--surface-1)] text-center">
        <div>
          <span className="data-number block text-3xl font-bold">{score}</span>
          <span className="text-[10px] font-bold tracking-[.18em] text-[var(--text-3)]">
            {label}
          </span>
          <span className="mt-1 block text-[10px] text-[var(--text-2)]">
            {confidence}% confidence
          </span>
        </div>
      </div>
    </div>
  );
}

export function CyberLevelBadge({
  rating,
  compact = false,
}: {
  rating: RatingSnapshot;
  compact?: boolean;
}) {
  const status = rating.levelStatus ?? 'CALIBRATING';
  const visible = rating.levelVisible ?? rating.confidence >= 25;
  const level = rating.level ?? Math.max(1, Math.min(100, Math.floor(rating.score / 10)));
  const label =
    status === 'OFFICIAL'
      ? 'официальный'
      : status === 'PROVISIONAL'
        ? 'предварительный'
        : 'калибруется';
  return (
    <span
      className={`inline-flex shrink-0 items-center border border-[rgba(69,255,166,.36)] bg-[rgba(69,255,166,.08)] font-black uppercase text-[var(--brand)] ${compact ? 'min-h-7 gap-1 px-2 text-[10px]' : 'min-h-10 gap-2 px-3 text-xs'}`}
      aria-label={`Cyber Level ${level}, ${label}`}
    >
      <span className="text-[var(--text-3)]">LVL</span>
      <span className="data-number text-[var(--text-1)]">{visible ? level : `~${level}`}</span>
    </span>
  );
}

export function CyberLevelPanel({ rating }: { rating: RatingSnapshot }) {
  const visible = rating.levelVisible ?? rating.confidence >= 25;
  const level = rating.level ?? Math.max(1, Math.min(100, Math.floor(rating.score / 10)));
  const progress = rating.levelProgress ?? (rating.score % 10) * 10;
  const points = rating.pointsToNextLevel ?? Math.max(0, (level + 1) * 10 - rating.score);
  const statusLabel =
    rating.levelStatus === 'OFFICIAL'
      ? 'Официальный уровень'
      : rating.levelStatus === 'PROVISIONAL'
        ? 'Предварительный уровень'
        : 'Идёт калибровка';
  return (
    <div className="border border-[rgba(69,255,166,.32)] bg-[linear-gradient(135deg,rgba(69,255,166,.12),rgba(12,18,16,.35)_55%)] p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[var(--brand)]">
            Cyber Level
          </p>
          <p className="data-number mt-1 text-6xl font-black leading-none text-[var(--text-1)]">
            {visible ? level : `~${level}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-[var(--text-2)]">{statusLabel}</p>
          <p className="mt-1 text-[10px] text-[var(--text-3)]">{rating.confidence}% confidence</p>
        </div>
      </div>
      {!visible ? (
        <p className="mt-5 text-xs leading-5 text-[var(--text-2)]">
          Оценочный уровень отмечен знаком ~ и может заметно измениться до 25% confidence.
        </p>
      ) : null}
      <div className="mt-5">
        <div className="mb-2 flex justify-between gap-3 text-[10px] font-semibold text-[var(--text-3)]">
          <span>Level {level}</span>
          <span className="text-right">
            {level >= 100 ? 'Максимальный уровень' : `${points} PPR до Level ${level + 1}`}
          </span>
        </div>
        <div className="h-2 overflow-hidden bg-[var(--surface-3)]">
          <div
            className="h-full bg-[var(--brand)]"
            style={{ width: `${level >= 100 ? 100 : progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  note,
  children,
}: {
  label: string;
  value: string;
  note?: string;
  children?: ReactNode;
}) {
  return (
    <div className="surface-soft min-w-0 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--text-3)]">
        {label}
      </p>
      <p className="data-number mt-2 text-2xl font-bold">{value}</p>
      {note ? <p className="mt-1 text-xs text-[var(--text-2)]">{note}</p> : null}
      {children}
    </div>
  );
}

export function PlayerCard({
  player,
  compact = false,
}: {
  player: PlayerSummary & { avatarUrl?: string | null };
  compact?: boolean;
}) {
  return (
    <Link
      href={`/players/${player.slug}`}
      className={`group surface flex items-center gap-3 p-3 transition hover:border-[var(--brand)] ${compact ? '' : 'md:p-4'}`}
    >
      <span className="data-number w-7 text-center text-xs text-[var(--text-3)]">
        #{player.rating.rank}
      </span>
      <PlayerPhoto src={player.avatarUrl} label={player.nickname} size={compact ? 'sm' : 'md'} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <strong className="truncate text-sm">{player.nickname}</strong>
          {player.verificationLevel >= 3 ? (
            <CheckIcon className="size-3.5 text-[var(--success)]" />
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-[var(--text-3)]">
          {player.countryCode}
          {player.city ? `, ${player.city}` : ''} · {player.roles[0]} · {player.teamShortName}
        </p>
      </div>
      <div className="text-right">
        <CyberLevelBadge rating={player.rating} compact />
        <p className="data-number font-bold">{player.rating.score}</p>
        <Delta value={player.rating.delta30d} />
      </div>
    </Link>
  );
}

export function TeamCard({ team, compact = false }: { team: TeamSummary; compact?: boolean }) {
  return (
    <Link
      href={`/teams/${team.slug}`}
      className="group surface flex items-center gap-3 p-3 transition hover:border-[var(--brand)] md:p-4"
    >
      <span className="data-number w-7 text-center text-xs text-[var(--text-3)]">
        #{team.rating.rank}
      </span>
      <Monogram label={team.shortName} size={compact ? 'sm' : 'md'} />
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-sm">{team.name}</strong>
        <p className="mt-1 text-xs text-[var(--text-3)]">
          {team.countryCode}
          {team.city ? `, ${team.city}` : ''} ·{' '}
          {team.form
            .map((item, index) => (
              <span
                key={index}
                className={item === 'W' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}
              >
                {item}
              </span>
            ))
            .reduce<ReactNode[]>((all, item, index) => [...all, index ? ' ' : '', item], [])}
        </p>
      </div>
      <div className="text-right">
        <p className="data-number font-bold">{team.rating.score}</p>
        <p className="text-[10px] font-bold tracking-wider text-[var(--text-3)]">TPR</p>
      </div>
    </Link>
  );
}
