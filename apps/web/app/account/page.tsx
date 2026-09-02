import type { Metadata } from 'next';
import { AccountPanel } from '@/components/account-panel';

export const metadata: Metadata = { title: 'Личный кабинет' };

export default function AccountPage() {
  return (
    <div className="container min-h-[calc(100vh-8rem)] py-12">
      <AccountPanel />
    </div>
  );
}
