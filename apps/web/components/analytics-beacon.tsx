'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

function surface(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return 'home';
  return new Set([
    'players',
    'teams',
    'matches',
    'tournaments',
    'rankings',
    'search',
    'transfers',
    'account',
  ]).has(segment)
    ? segment
    : 'other';
}

export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
    const body = JSON.stringify({ name: 'page_view', surface: surface(pathname) });
    const url = `${api}/analytics/events`;
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
