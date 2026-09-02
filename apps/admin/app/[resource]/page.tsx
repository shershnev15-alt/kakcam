import { notFound } from 'next/navigation';
import { AdminConsole } from '@/components/admin-console';
import { resources } from '@/lib/resources';

export default async function AdminResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  if (!resources.some((item) => item.slug === resource)) notFound();
  return <AdminConsole resource={resource} />;
}
