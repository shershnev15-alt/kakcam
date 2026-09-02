import type { Metadata } from 'next';
import { InfoCard, InfoPage } from '@/components/info-page';

export const metadata: Metadata = {
  title: 'Конфиденциальность',
  description: 'Принципы защиты данных и приватности игроков в CYBER ID.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Privacy by design"
      title="Приватность профиля"
      intro="Публичный киберспортивный профиль не даёт права раскрывать лишние персональные данные. Даже в MVP публичная и модерационная части разделены."
    >
      <InfoCard title="Дата рождения">
        <p>
          Полная дата в публичном API не возвращается. Интерфейс может показать только рассчитанный
          возраст, если это допустимо для профиля.
        </p>
      </InfoCard>
      <InfoCard title="Несовершеннолетние">
        <p>
          Частные контакты, доказательства владения профилем и другие чувствительные сведения не
          публикуются. Политика скрытия имени должна иметь приорит над импортом.
        </p>
      </InfoCard>
      <InfoCard title="Учётные данные">
        <p>
          Пароли хешируются Argon2id, сессии хранятся как отзываемые HttpOnly cookie, а токены —
          только в виде хешей. Секреты в репозиторий не коммитятся.
        </p>
      </InfoCard>
      <InfoCard title="Доказательства">
        <p>
          Ссылки и материалы из claim-заявок имеют статус RESTRICTED. Публичный профиль показывает
          тип и уровень проверки, но не само доказательство.
        </p>
      </InfoCard>
    </InfoPage>
  );
}
