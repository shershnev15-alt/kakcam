import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = { title: 'Вход', robots: { index: false, follow: false } };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
