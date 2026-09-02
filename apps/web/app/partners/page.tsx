import type { Metadata } from 'next';
import Link from 'next/link';
import { adPlacements } from '@/lib/plans';

export const metadata: Metadata = {
  title: 'Партнёрам и рекламодателям',
  description: 'Рекламные форматы и B2B-возможности cyberID.',
};

export default function PartnersPage() {
  return (
    <div className="container py-10 md:py-16">
      <header className="signal-stage surface overflow-hidden p-7 md:p-11">
        <p className="eyebrow">Media kit · CS2</p>
        <h1 className="display-title mt-5 max-w-4xl text-[56px] md:text-[88px]">Партнёрам</h1>
        <p className="mt-5 max-w-2xl text-[var(--text-2)] leading-7">
          Реклама отделена от рейтинговой формулы и верификации. Партнёр не может купить место в
          рейтинге или изменить данные игрока.
        </p>
      </header>

      <section className="mt-10">
        <p className="eyebrow">Прайс-лист</p>
        <h2 className="mt-2 text-3xl font-black">Стартовые размещения</h2>
        <div className="mt-5 overflow-x-auto border border-[var(--border)]">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-[var(--surface-2)] text-[var(--text-3)]">
              <tr>
                <th className="p-4">Размещение</th>
                <th className="p-4">Стоимость</th>
                <th className="p-4">Формат</th>
              </tr>
            </thead>
            <tbody>
              {adPlacements.map(([placement, price, format]) => (
                <tr className="border-t border-[var(--border)]" key={placement}>
                  <td className="p-4 font-semibold">{placement}</td>
                  <td className="data-number p-4 text-[var(--brand)]">{price}</td>
                  <td className="p-4 text-[var(--text-2)]">{format}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface mt-10 grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-9">
        <div>
          <p className="eyebrow">Правила размещения</p>
          <h2 className="mt-2 text-2xl font-black">Прозрачная маркировка и отчёт</h2>
          <p className="muted mt-3 max-w-2xl text-sm leading-6">
            Все материалы проходят модерацию, получают метку «Реклама», UTM и итоговый отчёт по
            показам. Азартные игры, скины и серые схемы не принимаются без отдельной юридической
            проверки.
          </p>
        </div>
        <Link
          className="inline-flex min-h-12 items-center justify-center border border-[var(--brand)] px-5 text-sm font-bold text-[var(--brand)]"
          href="/pricing"
        >
          Тарифы B2B
        </Link>
      </section>
    </div>
  );
}
