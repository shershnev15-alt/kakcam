import type { Metadata } from 'next';
import { AccountPanel } from '@/components/account-panel';

export const metadata: Metadata = { title: 'Личный кабинет' };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ claim?: string }>;
}) {
  const { claim } = await searchParams;
  return (
    <div className="container min-h-[calc(100vh-8rem)] py-12">
      <AccountPanel initialPlayerSlug={claim ?? ''} />
    </div>
  );
}
