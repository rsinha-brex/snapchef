import { anthropic } from '@/lib/anthropic';
import { algolia, RECIPE_INDEX } from '@/lib/algolia';

const SYSTEM_PROMPT = `You are a recipe search assistant. The user will describe what they want to cook in natural language. Your job is to produce 1-3 Algolia search queries that would find relevant recipes.

Consider:
- Extract cuisine types, ingredients, cooking methods, time constraints
- Generate multiple queries if the request is broad (e.g., "quick weeknight pasta" → ["quick pasta", "easy pasta dinner"])
- Keep queries concise — 2-4 words work best for text search

Use the search_recipes tool to return your queries.`;

const SEARCH_TOOL = {
  name: 'search_recipes',
  description: 'Return search queries to find matching recipes',
  input_schema: {
    type: 'object' as const,
    properties: {
      queries: {
        type: 'array',
        items: { type: 'string' },
        description: '1-3 search queries to run against the recipe index',
      },
      filters: {
        type: 'object',
        properties: {
          cuisine: { type: 'string' },
          maxTime: { type: 'number' },
          difficulty: { type: 'string' },
          diet: { type: 'string' },
        },
      },
    },
    required: ['queries'],
  },
};

export async function POST(request: Request) {
  const body = await request.json();
  const { query } = body;

  if (!query || typeof query !== 'string') {
    return Response.json({ error: 'query is required' }, { status: 400 });
  }

  try {
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await anthropic.messages.create({
          model: 'anthropic/claude-sonnet-4-6',
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          tools: [SEARCH_TOOL],
          tool_choice: { type: 'tool', name: 'search_recipes' },
          messages: [{ role: 'user', content: query }],
        });
        break;
      } catch (e: any) {
        if (e?.status === 429 && attempt < 2) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
        throw e;
      }
    }

    if (!response) {
      return Response.json({ error: 'AI search failed after retries' }, { status: 503 });
    }

    const toolBlock = response.content.find((b) => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return Response.json({ error: 'AI search failed' }, { status: 500 });
    }

    const { queries, filters } = toolBlock.input as { queries: string[]; filters?: any };

    const algoliaFilters: string[] = [];
    if (filters?.cuisine) algoliaFilters.push(`cuisine:${filters.cuisine}`);
    if (filters?.maxTime) algoliaFilters.push(`total_time_minutes <= ${filters.maxTime}`);
    if (filters?.difficulty) algoliaFilters.push(`difficulty:${filters.difficulty}`);
    if (filters?.diet) algoliaFilters.push(`dietary:${filters.diet}`);

    const allHits: any[] = [];
    const seenIds = new Set<string>();

    for (const q of queries.slice(0, 3)) {
      const result = await algolia.searchSingleIndex({
        indexName: RECIPE_INDEX,
        searchParams: {
          query: q,
          filters: algoliaFilters.join(' AND '),
          hitsPerPage: 10,
          attributesToRetrieve: ['id', 'title', 'cuisine', 'total_time_minutes', 'difficulty', 'ingredient_names', 'ingredients', 'instructions', 'servings', 'meal_type', 'dietary', 'image_url'],
        },
      });
      for (const hit of result.hits as any[]) {
        const id = hit.objectID || hit.id;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          allHits.push(hit);
        }
      }
    }

    if (allHits.length === 0 && algoliaFilters.length > 0) {
      for (const q of queries.slice(0, 2)) {
        const result = await algolia.searchSingleIndex({
          indexName: RECIPE_INDEX,
          searchParams: {
            query: q,
            hitsPerPage: 10,
            attributesToRetrieve: ['id', 'title', 'cuisine', 'total_time_minutes', 'difficulty', 'ingredient_names', 'ingredients', 'instructions', 'servings', 'meal_type', 'dietary', 'image_url'],
          },
        });
        for (const hit of result.hits as any[]) {
          const id = hit.objectID || hit.id;
          if (!seenIds.has(id)) { seenIds.add(id); allHits.push(hit); }
        }
      }
    }

    if (allHits.length === 0) {
      const words = query.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 3);
      if (words.length > 0) {
        const result = await algolia.searchSingleIndex({
          indexName: RECIPE_INDEX,
          searchParams: {
            query: words.join(' '),
            hitsPerPage: 10,
            attributesToRetrieve: ['id', 'title', 'cuisine', 'total_time_minutes', 'difficulty', 'ingredient_names', 'ingredients', 'instructions', 'servings', 'meal_type', 'dietary', 'image_url'],
          },
        });
        for (const hit of result.hits as any[]) {
          allHits.push(hit);
        }
      }
    }

    return Response.json({ recipes: allHits.slice(0, 15) });
  } catch (error: any) {
    if (error?.status === 429) {
      return Response.json({ error: 'Rate limited, try again shortly' }, { status: 429 });
    }
    console.error('AI search error:', error);
    return Response.json({ error: 'AI search failed' }, { status: 500 });
  }
}
