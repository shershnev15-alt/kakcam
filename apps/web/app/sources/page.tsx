import type { Metadata } from 'next';
import { InfoCard, InfoPage } from '@/components/info-page';

export const metadata: Metadata = {
  title: 'Источники данных',
  description: 'Источники, уровни доверия и деморежим CYBER ID.',
  alternates: { canonical: '/sources' },
};

export default function SourcesPage() {
  return (
    <InfoPage
      eyebrow="Provenance"
      title="Источники и доверие к данным"
      intro="Публичная цифра не должна появляться из ниоткуда. Матчи, статистика, переходы и достижения хранят ссылку на источник, время наблюдения и статус проверки."
    >
      <InfoCard title="Деморежим">
        <p>
          Все имена, команды, турниры и результаты в локальном seed вымышлены. Два демонстрационных
          CS2-адаптера показывают staging, preview, conflict review и apply без вызова внешних API.
        </p>
      </InfoCard>
      <InfoCard title="Steam и FACEIT">
        <p>
          Без API-ключей аккаунты не помечаются как реально подтверждённые. Подготовленный слой
          адаптеров явно возвращает статус DEMO, пока секреты не настроены.
        </p>
      </InfoCard>
      <InfoCard title="Уровни проверки">
        <p>
          Уровень растёт от непроверенного факта к игровому аккаунту, подтверждению команды,
          организатора и платформы. В профиле показывается только итог, а закрытое evidence доступно
          модератору.
        </p>
      </InfoCard>
      <InfoCard title="Конфликты">
        <p>
          Импорт не перезаписывает канонический факт при расхождении. Он создаёт assertion для
          очереди модерации; каждое решение попадает в журнал аудита.
        </p>
      </InfoCard>
    </InfoPage>
  );
}
