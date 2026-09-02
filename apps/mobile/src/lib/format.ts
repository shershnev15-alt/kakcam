export function formatDateTime(value: string, locale = 'ru-RU') {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatPercent(value: number) {
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}

export function initials(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function score(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : String(value);
}
