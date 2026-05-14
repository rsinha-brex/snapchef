import { algolia, RECIPE_INDEX } from '@/lib/algolia';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query') || '';
  const cuisine = url.searchParams.get('cuisine');
  const mealType = url.searchParams.get('mealType');
  const maxReadyTime = url.searchParams.get('maxReadyTime');
  const diet = url.searchParams.get('diet');
  const difficulty = url.searchParams.get('difficulty');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const number = Math.min(parseInt(url.searchParams.get('number') || '20'), 50);

  const filters: string[] = [];
  if (cuisine) filters.push(`cuisine:${cuisine}`);
  if (mealType) filters.push(`meal_type:${mealType}`);
  if (difficulty) filters.push(`difficulty:${difficulty}`);
  if (diet) filters.push(`dietary:${diet}`);
  if (maxReadyTime) filters.push(`total_time_minutes <= ${maxReadyTime}`);

  try {
    const result = await algolia.searchSingleIndex({
      indexName: RECIPE_INDEX,
      searchParams: {
        query,
        filters: filters.join(' AND '),
        offset,
        length: number,
        attributesToRetrieve: ['id', 'title', 'cuisine', 'total_time_minutes', 'difficulty', 'ingredient_names', 'ingredients', 'instructions', 'servings', 'meal_type', 'dietary', 'image_url'],
      },
    });

    return Response.json({
      recipes: result.hits,
      totalResults: result.nbHits,
      offset,
    });
  } catch (error: any) {
    console.error('Algolia search error:', error);
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }
}
