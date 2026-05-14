import { z } from 'zod';

export const pantryItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string().min(1),
  category: z.string().optional(),
  source: z.enum(['photo', 'barcode', 'manual', 'pantry-pull']).optional(),
  photoRef: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

export type PantryItem = z.infer<typeof pantryItemSchema>;

export const pantryAddSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  source: z.enum(['photo', 'barcode', 'manual', 'pantry-pull']).optional(),
  photoRef: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const pantryBulkSchema = z.object({
  items: z.array(pantryAddSchema).min(1).max(100),
});

export const recipeIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
});

export const canonicalRecipeSchema = z.object({
  id: z.number(),
  title: z.string(),
  imageUrl: z.string().optional(),
  ingredients: z.array(recipeIngredientSchema),
  ingredientNames: z.array(z.string()),
  instructions: z.array(z.string()),
  cuisine: z.string(),
  mealType: z.string(),
  alsoWorksAs: z.array(z.string()).optional(),
  dietary: z.array(z.string()).optional(),
  primaryProtein: z.string().optional(),
  cookingMethods: z.array(z.string()).optional(),
  activeTimeMinutes: z.number().optional(),
  totalTimeMinutes: z.number().optional(),
  cookTimeBucket: z.string().optional(),
  difficulty: z.string().optional(),
  spiceLevel: z.string().optional(),
  occasion: z.array(z.string()).optional(),
  servings: z.number().optional(),
  popularityScore: z.number().optional(),
});

export type CanonicalRecipe = z.infer<typeof canonicalRecipeSchema>;

export const adaptationSchema = z.object({
  type: z.enum(['substitute', 'omit', 'scale', 'add']),
  target: z.string(),
  replacement: z.string().optional(),
  reason: z.string(),
});

export type Adaptation = z.infer<typeof adaptationSchema>;

export const adaptedRecipeSchema = canonicalRecipeSchema.extend({
  adaptations: z.array(adaptationSchema),
  viability: z.enum(['good', 'compromised', 'stretch', 'not_viable']),
  reason: z.string().optional(),
});

export type AdaptedRecipe = z.infer<typeof adaptedRecipeSchema>;

export const adaptRequestSchema = z.object({
  recipe: canonicalRecipeSchema,
  available: z.array(z.object({
    name: z.string(),
    category: z.string().optional(),
  })),
});

export const adaptResponseSchema = z.object({
  adapted: adaptedRecipeSchema,
  adaptations: z.array(adaptationSchema),
  viability: z.enum(['good', 'compromised', 'stretch', 'not_viable']),
  reason: z.string().optional(),
});

export type AdaptResponse = z.infer<typeof adaptResponseSchema>;

export const visionRequestSchema = z.object({
  image: z.string().min(1),
});

export const visionItemSchema = z.object({
  name: z.string(),
  category: z.enum(['produce', 'dairy', 'proteins', 'grains', 'pantry_staples', 'condiments', 'frozen', 'beverages', 'other']),
  confidence: z.enum(['high', 'medium', 'low']),
  note: z.string().optional(),
});

export const visionResponseSchema = z.object({
  items: z.array(visionItemSchema),
});

export type VisionItem = z.infer<typeof visionItemSchema>;
export type VisionResponse = z.infer<typeof visionResponseSchema>;

export const savedRecipeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  recipeId: z.number(),
  recipeTitle: z.string(),
  recipeImage: z.string().optional(),
  cooked: z.boolean(),
  savedAt: z.string().datetime(),
  cookedAt: z.string().datetime().optional(),
});

export type SavedRecipe = z.infer<typeof savedRecipeSchema>;

export const savedAdaptationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  recipeId: z.number(),
  recipeTitle: z.string(),
  recipeImage: z.string().optional(),
  adaptedPayload: adaptResponseSchema,
  pantrySnapshot: z.array(z.object({ name: z.string(), category: z.string().optional() })).optional(),
  savedAt: z.string().datetime(),
});

export type SavedAdaptation = z.infer<typeof savedAdaptationSchema>;
