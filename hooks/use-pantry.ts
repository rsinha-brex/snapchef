import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PantryItem } from '@/lib/schemas';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

export function usePantry(token: string | null) {
  return useQuery({
    queryKey: ['pantry'],
    queryFn: () => fetchWithAuth('/api/me/pantry', {
      headers: { Authorization: `Bearer ${token}` },
    }),
    enabled: !!token,
    select: (data) => data.items as PantryItem[],
  });
}

export function useAddPantryItem(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: { name: string; category?: string; source?: string }) =>
      fetchWithAuth('/api/me/pantry', {
        method: 'POST',
        body: JSON.stringify(item),
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pantry'] }),
  });
}

export function useBulkAddPantry(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: { name: string; category?: string; source?: string }[]) =>
      fetchWithAuth('/api/me/pantry/bulk', {
        method: 'POST',
        body: JSON.stringify({ items }),
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pantry'] }),
  });
}

export function useDeletePantryItem(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`${API_URL}/api/me/pantry/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pantry'] }),
  });
}
