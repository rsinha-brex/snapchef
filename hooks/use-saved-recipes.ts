import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

async function fetchWithAuth(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

export function useSavedRecipes(token: string | null) {
  return useQuery({
    queryKey: ['saved-recipes'],
    queryFn: () => fetchWithAuth('/api/me/recipes/saved', token!),
    enabled: !!token,
    select: (data) => data.saved,
  });
}

export function useSaveRecipe(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { recipeId: number; title: string; image?: string }) =>
      fetchWithAuth('/api/me/recipes/saved', token!, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-recipes'] }),
  });
}

export function useUnsaveRecipe(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipeId: number) =>
      fetch(`${API_URL}/api/me/recipes/saved?recipeId=${recipeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-recipes'] }),
  });
}

export function useSavedAdaptations(token: string | null) {
  return useQuery({
    queryKey: ['saved-adaptations'],
    queryFn: () => fetchWithAuth('/api/me/adaptations', token!),
    enabled: !!token,
    select: (data) => data.adaptations,
  });
}

export function useSaveAdaptation(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetchWithAuth('/api/me/adaptations', token!, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-adaptations'] }),
  });
}
