import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://cyberid.example'),
  title: {
    default: 'cyberID — киберспорт в цифрах',
    template: '%s · cyberID',
  },
  description: 'Статистика, достижения и вся история выступлений игроков и команд России и СНГ.',
  openGraph: {
    title: 'cyberID',
    description: 'Рейтинги, матчи и вся киберспортивная карьера — в одном ID.',
    locale: 'ru_RU',
    type: 'website',
  },
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
      </body>
    </html>
  );
}
