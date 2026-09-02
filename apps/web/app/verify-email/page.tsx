import type { Metadata } from 'next';
import { VerifyEmailForm } from '@/components/verify-email-form';

export const metadata: Metadata = {
  title: 'Подтверждение email',
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return <VerifyEmailForm />;
}
