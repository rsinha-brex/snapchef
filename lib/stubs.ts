import { MOCK_RECIPES, MOCK_VISION_RESULT, MOCK_PANTRY, getMatchedRecipes } from '@/lib/mock-data';
import type { CanonicalRecipe, AdaptResponse, VisionResponse } from '@/lib/schemas';

export function mockAdapt(recipe: CanonicalRecipe, available: { name: string }[]): AdaptResponse {
  const availableNames = new Set(available.map(a => a.name.toLowerCase()));
  const adaptations = recipe.ingredients
    .filter(ing => !availableNames.has(ing.name.toLowerCase()))
    .slice(0, 3)
    .map(ing => ({
      type: 'substitute' as const,
      target: ing.name,
      replacement: available[0]?.name || 'pantry staple',
      reason: `${ing.name} not available — substituting with what you have`,
    }));

  const missingCount = recipe.ingredients.filter(ing => !availableNames.has(ing.name.toLowerCase())).length;
  const viability = missingCount === 0 ? 'good' as const
    : missingCount <= 2 ? 'compromised' as const
    : missingCount <= 4 ? 'stretch' as const
    : 'not_viable' as const;

  return {
    adapted: {
      ...recipe,
      adaptations,
      viability,
    },
    adaptations,
    viability,
    reason: viability === 'not_viable' ? 'Too many key ingredients are missing to make a reasonable version of this dish.' : undefined,
  };
}

export function mockVision(): VisionResponse {
  return { items: MOCK_VISION_RESULT };
}

export function mockSearch(params: { cuisine?: string; mealType?: string; difficulty?: string; maxTime?: number }) {
  let results = [...MOCK_RECIPES];
  if (params.cuisine) results = results.filter(r => r.cuisine === params.cuisine);
  if (params.mealType) results = results.filter(r => r.mealType === params.mealType);
  if (params.difficulty) results = results.filter(r => r.difficulty === params.difficulty);
  if (params.maxTime) results = results.filter(r => (r.totalTimeMinutes || 999) <= params.maxTime!);
  return { recipes: results, totalResults: results.length, offset: 0 };
}

export function mockMatch(ingredients: string[], seen: number[] = []) {
  const matches = getMatchedRecipes(ingredients).filter(r => !seen.includes(r.id));
  return { recipes: matches.slice(0, 5) };
}

export function mockPantry() {
  return MOCK_PANTRY.map((item, i) => ({
    id: `mock-${i}`,
    userId: 'mock-user',
    ...item,
    createdAt: new Date().toISOString(),
  }));
}

export function mockSavedRecipes() {
  return [
    { id: 'sr-1', userId: 'mock-user', recipeId: 1001, recipeTitle: 'Lemon Garlic Chicken Pasta', recipeImage: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600', cooked: false, savedAt: new Date().toISOString() },
    { id: 'sr-2', userId: 'mock-user', recipeId: 1002, recipeTitle: 'Shakshuka', recipeImage: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?w=600', cooked: true, savedAt: new Date().toISOString(), cookedAt: new Date().toISOString() },
  ];
}

export function mockSavedAdaptations() {
  return [
    {
      id: 'sa-1',
      userId: 'mock-user',
      recipeId: 1003,
      recipeTitle: 'Spinach & Garlic Butter Pasta (Your Version)',
      recipeImage: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600',
      adaptedPayload: { viability: 'good', adaptations: [{ type: 'substitute', target: 'red pepper flakes', replacement: 'black pepper', reason: 'Not available' }] },
      savedAt: new Date().toISOString(),
    },
  ];
}
