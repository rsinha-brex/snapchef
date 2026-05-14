import { algolia, RECIPE_INDEX } from '@/lib/algolia';

export async function POST(request: Request) {
  const body = await request.json();
  const { ingredients } = body;

  if (!ingredients || !Array.isArray(ingredients)) {
    return Response.json({ error: 'ingredients array required' }, { status: 400 });
  }

  const results = await Promise.all(
    ingredients.map(async (item: { name: string; confidence?: string }) => {
      try {
        const result = await algolia.searchSingleIndex({
          indexName: RECIPE_INDEX,
          searchParams: {
            query: item.name,
            hitsPerPage: 5,
            attributesToRetrieve: ['ingredient_names'],
          },
        });

        const allIngredients: string[] = [];
        for (const hit of result.hits as any[]) {
          for (const ing of (hit.ingredient_names || [])) {
            if (!allIngredients.includes(ing)) allIngredients.push(ing);
          }
        }

        const nameLower = item.name.toLowerCase();
        const exactMatch = allIngredients.find(i => i.toLowerCase() === nameLower);
        if (exactMatch) {
          return { original: item.name, normalized: exactMatch, confidence: 'high', alternatives: [] };
        }

        const containsMatch = allIngredients
          .filter(i => i.toLowerCase().includes(nameLower) || nameLower.includes(i.toLowerCase()))
          .slice(0, 5);

        if (containsMatch.length > 0) {
          const best = containsMatch.sort((a, b) => a.length - b.length)[0];
          return {
            original: item.name,
            normalized: best,
            confidence: item.confidence === 'low' ? 'low' : 'medium',
            alternatives: containsMatch.slice(0, 4),
          };
        }

        return { original: item.name, normalized: item.name, confidence: 'low', alternatives: [] };
      } catch {
        return { original: item.name, normalized: item.name, confidence: 'low', alternatives: [] };
      }
    })
  );

  return Response.json({ ingredients: results });
}
