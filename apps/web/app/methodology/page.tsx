import type { Metadata } from 'next';
import { InfoCard, InfoPage } from '@/components/info-page';

export const metadata: Metadata = {
  title: 'Методология рейтингов',
  description: 'Как рассчитываются PPR и TPR, доверие к данным и история изменений.',
  alternates: { canonical: '/methodology' },
};

export default function MethodologyPage() {
  return (
    <InfoPage
      eyebrow="PPR + TPR"
      title="Прозрачная методология"
      intro="Рейтинг не является субъективным местом в топе: каждый опубликованный запуск имеет версию формулы, дату среза и checksum."
    >
      <InfoCard title="PPR — рейтинг игрока">
        <p>
          Учитывает личную результативность, силу соперника и турнира, свежесть матчей, объём
          выборки и уровень доверия к фактам.
        </p>
      </InfoCard>
      <InfoCard title="TPR — рейтинг команды">
        <p>
          Основан на исходах серий и карт, силе соперников, коэффициенте турнира, стабильности
          состава и достаточности выборки.
        </p>
      </InfoCard>
      <InfoCard title="Confidence">
        <p>
          Уверенность показывает не силу, а качество оценки. Она растёт при большем числе свежих
          матчей и подтверждённых источниках.
        </p>
      </InfoCard>
      <InfoCard title="Воспроизводимость">
        <p>
          Одинаковый набор входных фактов и версия формулы дают одинаковый checksum. Старые запуски
          не перезаписываются, поэтому динамику можно аудировать.
        </p>
      </InfoCard>
    </InfoPage>
  );
}
