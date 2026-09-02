import { product } from '@arena/config';
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/account', '/login', '/moderation', '/register', '/settings/', '/verify-email'],
    },
    sitemap: `${product.publicUrl}/sitemap.xml`,
    host: product.publicUrl,
  };
}
