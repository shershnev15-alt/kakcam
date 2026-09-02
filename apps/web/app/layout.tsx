import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AnalyticsBeacon } from '@/components/analytics-beacon';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { siteUrl, twitterCard } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Arena Passport',
  title: {
    default: 'Arena Passport — цифровой паспорт киберспортсмена',
    template: '%s · Arena Passport',
  },
  description: 'Статистика, достижения и вся история выступлений игроков и команд России и СНГ.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Arena Passport',
    description: 'Вся киберспортивная карьера — в одном профиле.',
    locale: 'ru_RU',
    type: 'website',
    url: '/',
  },
  twitter: {
    ...twitterCard,
    title: 'Arena Passport',
    description: 'Вся киберспортивная карьера — в одном профиле.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru">
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
