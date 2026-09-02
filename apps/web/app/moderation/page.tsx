import type { Metadata } from 'next';
import { ModerationPanel } from '@/components/moderation-panel';

export const metadata: Metadata = {
  title: 'Модерация claims',
  robots: { index: false, follow: false },
};

export default function ModerationPage() {
  return (
    <div className="container min-h-[calc(100vh-8rem)] py-10 md:py-14">
      <ModerationPanel />
    </div>
  );
}
