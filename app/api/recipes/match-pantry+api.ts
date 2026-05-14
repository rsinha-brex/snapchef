import { algolia, RECIPE_INDEX } from '@/lib/algolia';

const STAPLES = new Set(['salt', 'pepper', 'black pepper', 'oil', 'olive oil', 'water', 'sugar', 'flour', 'butter']);
const RETRIEVE = ['id', 'title', 'cuisine', 'total_time_minutes', 'difficulty', 'ingredient_names', 'ingredients', 'instructions', 'servings', 'meal_type', 'dietary', 'image_url'];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ingredients = url.searchParams.get('ingredients') || '';
  const seen = url.searchParams.get('seen') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 40);

  if (!ingredients) {
    return Response.json({ error: 'ingredients param required' }, { status: 400 });
  }

  const ingredientList = ingredients.toLowerCase().split(',').map(i => i.trim()).filter(Boolean);
  const seenIds = new Set(seen ? seen.split(',').map(id => id.trim()) : []);
  const notFilter = seenIds.size > 0
    ? [...seenIds].map(id => `NOT objectID:${id}`).join(' AND ')
    : '';

  const nonStaples = ingredientList.filter(i => !STAPLES.has(i));
  const searchPool = nonStaples.length > 0 ? nonStaples : ingredientList;

  // Run multiple searches with different ingredient combos for broader results
  const queries: string[] = [];
  if (searchPool.length >= 2) queries.push(searchPool.slice(0, 2).join(' '));
  if (searchPool.length >= 4) queries.push(searchPool.slice(2, 4).join(' '));
  if (searchPool.length >= 1) queries.push(searchPool[0]);
  if (searchPool.length >= 3) queries.push(searchPool.slice(0, 3).join(' '));
  if (searchPool.length >= 5) queries.push(searchPool.slice(3, 6).join(' '));
  // Always add a broad single-ingredient search as fallback
  for (const term of searchPool.slice(0, 3)) {
    queries.push(term);
  }

  try {
    const allHits: any[] = [];
    const hitIds = new Set<string>();

    for (const q of queries) {
      if (allHits.length >= limit) break;
      const result = await algolia.searchSingleIndex({
        indexName: RECIPE_INDEX,
        searchParams: {
          query: q,
          filters: notFilter,
          hitsPerPage: 20,
          attributesToRetrieve: RETRIEVE,
        },
      });
      for (const hit of result.hits as any[]) {
        const id = String(hit.objectID || hit.id);
        if (!hitIds.has(id) && !seenIds.has(id)) {
          hitIds.add(id);
          allHits.push(hit);
        }
      }
    }

    const recipes = allHits.map((hit: any) => {
      const recipeIngredients: string[] = hit.ingredient_names || [];
      const matched = recipeIngredients.filter(ri => ingredientList.some(ui => ri.includes(ui) || ui.includes(ri)));
      const missed = recipeIngredients.filter(ri => !ingredientList.some(ui => ri.includes(ui) || ui.includes(ri)));

      return {
        ...hit,
        usedCount: matched.length,
        missedCount: missed.length,
        missedIngredients: missed.slice(0, 5),
      };
    });

    recipes.sort((a: any, b: any) => b.usedCount - a.usedCount);

    return Response.json({ recipes: recipes.slice(0, limit) });
  } catch (error: any) {
    console.error('Algolia match error:', error);
    return Response.json({ error: 'Match failed' }, { status: 500 });
  }
}
