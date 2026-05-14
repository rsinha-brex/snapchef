import { algolia, RECIPE_INDEX } from '@/lib/algolia';

export async function GET(request: Request, { id }: { id: string }) {
  try {
    const result = await algolia.getObject({
      indexName: RECIPE_INDEX,
      objectID: id,
      attributesToRetrieve: ['id', 'title', 'cuisine', 'total_time_minutes', 'difficulty', 'ingredient_names', 'ingredients', 'instructions', 'servings', 'meal_type', 'dietary', 'image_url'],
    });

    if (!result) {
      return Response.json({ error: 'Recipe not found' }, { status: 404 });
    }

    return Response.json({ recipe: result });
  } catch (error: any) {
    if (error?.status === 404) {
      return Response.json({ error: 'Recipe not found' }, { status: 404 });
    }
    console.error('Algolia get error:', error);
    return Response.json({ error: 'Failed to fetch recipe' }, { status: 500 });
  }
}
