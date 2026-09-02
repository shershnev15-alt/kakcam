import { product } from '@arena/config';

export type EntityRoute = 'players' | 'teams' | 'matches' | 'tournaments';

const entityRoutes = new Set<EntityRoute>(['players', 'teams', 'matches', 'tournaments']);

export function entityDeepLink(route: EntityRoute, id: string): string {
  return `${product.scheme}://${route}/${encodeURIComponent(id)}`;
}

export function canonicalEntityUrl(baseUrl: string, route: EntityRoute, id: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${route}/${encodeURIComponent(id)}`;
}

export function playerDeepLink(slug: string): string {
  return entityDeepLink('players', slug);
}

export function canonicalPlayerUrl(baseUrl: string, slug: string): string {
  return canonicalEntityUrl(baseUrl, 'players', slug);
}

export function hrefFromNotificationUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    const route = url.protocol === `${product.scheme}:` ? url.hostname : parts.shift();
    const id = parts[0];
    if (!route || !entityRoutes.has(route as EntityRoute) || !id) return null;
    return `/${route}/${encodeURIComponent(decodeURIComponent(id))}`;
  } catch {
    return null;
  }
}
