import ingredients from '@/data/canonical-ingredients.json';
import { algolia, RECIPE_INDEX } from '@/lib/algolia';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('query') || '').toLowerCase().trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 20);

  if (query.length < 2) {
    return Response.json({ suggestions: [] });
  }

  const localMatches = (ingredients as any[])
    .filter((item) => item.name.toLowerCase().includes(query))
    .slice(0, limit);

  try {
    const result = await algolia.searchSingleIndex({
      indexName: RECIPE_INDEX,
      searchParams: {
        query,
        hitsPerPage: 10,
        attributesToRetrieve: ['ingredient_names'],
      },
    });

    const seenNames = new Set(localMatches.map(m => m.name.toLowerCase()));
    const algoliaIngredients: { name: string; category: string }[] = [];

    for (const hit of result.hits as any[]) {
      for (const ing of (hit.ingredient_names || [])) {
        const lower = ing.toLowerCase();
        if (lower.includes(query) && !seenNames.has(lower)) {
          seenNames.add(lower);
          algoliaIngredients.push({ name: ing, category: 'other' });
        }
      }
    }

    const merged = [...localMatches, ...algoliaIngredients].slice(0, limit);
    return Response.json({ suggestions: merged });
  } catch {
    return Response.json({ suggestions: localMatches });
  }
}
