import { product } from '@arena/config';
import type { Metadata } from 'next';
import { InfoCard, InfoPage } from '@/components/info-page';

export const metadata: Metadata = {
  title: 'О проекте',
  description: `Зачем создан ${product.name} и как устроен цифровой паспорт игрока и команды.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="О платформе"
      title={`${product.name} — карьера, которую можно проверить`}
      intro="Единый реестр помогает игрокам, командам, тренерам и скаутам видеть не разрозненные цифры, а целостную историю выступлений."
    >
      <InfoCard title="Цифровой паспорт">
        <p>
          Никнейм, роль, команда, матчи, турниры, рейтинг, карьера и достижения собраны в одном
          постоянном URL.
        </p>
      </InfoCard>
      <InfoCard title="Кому полезно">
        <p>
          Игрокам и командам — для самопрезентации; тренерам и скаутам — для поиска; организаторам и
          медиа — для проверяемых фактов.
        </p>
      </InfoCard>
      <InfoCard title="Статус MVP">
        <p>
          Сейчас платформа работает в деморежиме на вымышленных данных CS2. Они позволяют проверить
          весь продуктовый цикл без реальных API-ключей.
        </p>
      </InfoCard>
      <InfoCard title="Принципы">
        <p>
          Источник у каждого факта, объяснимый рейтинг, отделение публичных данных от закрытых
          доказательств и обязательная модерация спорных изменений.
        </p>
      </InfoCard>
    </InfoPage>
  );
}
