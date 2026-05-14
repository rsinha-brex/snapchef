import { useMutation } from '@tanstack/react-query';
import type { CanonicalRecipe, AdaptResponse } from '@/lib/schemas';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

export function useAdaptRecipe(token: string | null) {
  return useMutation({
    mutationFn: async ({ recipe, available }: {
      recipe: CanonicalRecipe;
      available: { name: string; category?: string }[];
    }): Promise<AdaptResponse> => {
      const response = await fetch(`${API_URL}/api/recipes/adapt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipe, available }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      return response.json();
    },
  });
}
