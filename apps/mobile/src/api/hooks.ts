import { useQuery } from '@tanstack/react-query';
import { request } from './client';

export function useApiQuery<T>(queryKey: readonly unknown[], path: string, enabled = true) {
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => request<T>(path, { signal }),
    enabled,
  });
}
