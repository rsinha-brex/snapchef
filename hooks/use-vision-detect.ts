import { useMutation } from '@tanstack/react-query';
import type { VisionResponse } from '@/lib/schemas';

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

export function useVisionDetect() {
  return useMutation({
    mutationFn: async (imageBase64: string): Promise<VisionResponse> => {
      const response = await fetch(`${API_URL}/api/vision/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      return response.json();
    },
  });
}
