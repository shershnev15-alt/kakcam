import { product } from '@arena/config';
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin/', '/settings/'] },
    sitemap: `${product.publicUrl}/sitemap.xml`,
  };
}
