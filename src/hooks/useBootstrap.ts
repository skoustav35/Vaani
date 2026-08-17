import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import type { BootstrapPayload } from '../lib/chatTypes';

/** Sidebar source of truth: my profile + every chat I belong to. */
export function useBootstrap() {
  return useQuery({
    queryKey: ['vaani', 'bootstrap'],
    queryFn: () => apiFetch<BootstrapPayload>('/api/chat/bootstrap'),
    refetchInterval: 12_000,
    staleTime: 5_000,
  });
}
