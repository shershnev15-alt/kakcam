import { product } from '@arena/config';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AnalyticsBeacon } from '@/components/analytics-beacon';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { twitterCard } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(product.publicUrl),
  applicationName: product.name,
  title: {
    default: `${product.name} — киберспорт в цифрах`,
    template: `%s · ${product.name}`,
  },
  description: 'Статистика, достижения и вся история выступлений игроков и команд России и СНГ.',
  alternates: { canonical: '/' },
  openGraph: {
    title: product.name,
    description: 'Рейтинги, матчи и вся киберспортивная карьера — в одном ID.',
    locale: 'ru_RU',
    type: 'website',
    url: '/',
  },
  twitter: {
    ...twitterCard,
    title: product.name,
    description: 'Вся киберспортивная карьера — в одном профиле.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body>
        <a
          href="#content"
          className="focus-ring fixed left-3 top-3 z-50 -translate-y-20 rounded bg-[var(--brand)] px-4 py-2 text-sm text-white focus:translate-y-0"
        >
          К содержимому
        </a>
        <Header />
        <main id="content">{children}</main>
        <Footer />
        <AnalyticsBeacon />
      </body>
    </html>
  );
}
