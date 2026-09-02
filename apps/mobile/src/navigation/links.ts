export function playerDeepLink(slug: string): string {
  return `arenapassport://players/${encodeURIComponent(slug)}`;
}

export function canonicalPlayerUrl(baseUrl: string, slug: string): string {
  return `${baseUrl.replace(/\/$/, '')}/players/${encodeURIComponent(slug)}`;
}
