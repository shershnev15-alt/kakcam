import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckIcon } from '@/components/icons';
import { plans } from '@/lib/plans';

export const metadata: Metadata = {
  title: 'Тарифы B2C и B2B',
  description: 'Тарифы cyberID для зрителей, игроков, клубов, федераций и партнёров.',
};

export default function PricingPage() {
  return (
    <div className="container py-10 md:py-16">
      <header className="max-w-4xl border-b border-[var(--border)] pb-9">
        <p className="eyebrow">B2C & B2B</p>
        <h1 className="display-title mt-5 text-[64px] md:text-[96px]">Подписка</h1>
        <p className="muted mt-5 max-w-2xl leading-7">
          Актуальный срез остаётся открытым. Платная ценность — глубина архива, сравнения,
          совместная работа и машинный доступ к данным.
        </p>
      </header>

      {(['B2C', 'B2B'] as const).map((audience) => (
        <section className="mt-12" key={audience}>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{audience}</p>
              <h2 className="mt-2 text-3xl font-black">
                {audience === 'B2C' ? 'Для людей' : 'Для организаций'}
              </h2>
            </div>
            <span className="text-xs text-[var(--text-3)]">Цены — стартовая модель</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {plans
              .filter((plan) => plan.audience === audience)
              .map((plan) => (
                <article
                  className={`surface min-w-0 p-6 md:p-8 ${plan.featured ? 'border-[var(--brand)]' : ''}`}
                  key={plan.code}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow">{plan.code}</p>
                      <h3 className="mt-2 text-3xl font-black">{plan.name}</h3>
                    </div>
                    <p className="data-number text-right text-3xl font-black text-[var(--brand)]">
                      {plan.price}
                      <small className="mt-1 block text-[10px] font-normal text-[var(--text-3)]">
                        {plan.cadence}
                      </small>
                    </p>
                  </div>
                  <p className="muted mt-5 leading-6">{plan.description}</p>
                  <ul className="mt-6 grid gap-3 text-sm">
                    {plan.features.map((feature) => (
                      <li className="flex items-start gap-3" key={feature}>
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
                        <span className="min-w-0 [overflow-wrap:anywhere]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    className="mt-8 inline-flex min-h-12 w-full items-center justify-center bg-[var(--brand)] px-5 text-center text-sm font-black text-[#101512]"
                    href={audience === 'B2C' ? '/account' : '/partners'}
                  >
                    {audience === 'B2C' ? 'Открыть кабинет' : 'Обсудить подключение'}
                  </Link>
                </article>
              ))}
          </div>
        </section>
      ))}
      <p className="mt-8 text-xs leading-5 text-[var(--text-3)]">
        До подключения платёжного провайдера тарифы работают как продуктовая матрица. Списание и
        автопродление не включены; итоговая цена и налоги фиксируются в оферте.
      </p>
    </div>
  );
}
