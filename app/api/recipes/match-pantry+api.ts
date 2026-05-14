import { algolia, RECIPE_INDEX } from '@/lib/algolia';

const STAPLES = new Set(['salt', 'pepper', 'black pepper', 'oil', 'olive oil', 'water', 'sugar', 'flour', 'butter']);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ingredients = url.searchParams.get('ingredients') || '';
  const seen = url.searchParams.get('seen') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 40);

  if (!ingredients) {
    return Response.json({ error: 'ingredients param required' }, { status: 400 });
  }

  const ingredientList = ingredients.toLowerCase().split(',').map(i => i.trim()).filter(Boolean);
  const seenIds = seen ? seen.split(',').map(id => id.trim()) : [];
  const notFilter = seenIds.length > 0
    ? seenIds.map(id => `NOT objectID:${id}`).join(' AND ')
    : '';

  const nonStaples = ingredientList.filter(i => !STAPLES.has(i));
  const searchTerms = (nonStaples.length > 0 ? nonStaples : ingredientList).slice(0, 6);

  try {
    let searchTerms = (nonStaples.length > 0 ? nonStaples : ingredientList).slice(0, 6);

    let result = await algolia.searchSingleIndex({
      indexName: RECIPE_INDEX,
      searchParams: {
        query: searchTerms.join(' '),
        filters: notFilter,
        hitsPerPage: 40,
        attributesToRetrieve: ['id', 'title', 'cuisine', 'total_time_minutes', 'difficulty', 'ingredient_names', 'ingredients', 'instructions', 'servings', 'meal_type', 'dietary', 'image_url'],
      },
    });

    if (result.hits.length === 0 && searchTerms.length > 3) {
      result = await algolia.searchSingleIndex({
        indexName: RECIPE_INDEX,
        searchParams: {
          query: searchTerms.slice(0, 3).join(' '),
          filters: notFilter,
          hitsPerPage: 40,
          attributesToRetrieve: ['id', 'title', 'cuisine', 'total_time_minutes', 'difficulty', 'ingredient_names', 'ingredients', 'instructions', 'servings', 'meal_type', 'dietary', 'image_url'],
        },
      });
    }

    const recipes = result.hits.map((hit: any) => {
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
