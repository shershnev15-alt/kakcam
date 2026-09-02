import { product } from '@arena/config';

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? product.publicUrl;

export const siteUrl = configuredSiteUrl.replace(/\/$/, '');

export function absoluteUrl(path: string): string {
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export const twitterCard = {
  card: 'summary_large_image' as const,
  site: '@cyberid',
};
