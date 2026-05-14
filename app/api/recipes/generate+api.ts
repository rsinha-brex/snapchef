import { anthropic } from '@/lib/anthropic';
import { z } from 'zod';

const inputSchema = z.object({
  ingredients: z.array(z.string()).min(1),
  excludeTitles: z.array(z.string()).optional(),
});

const SYSTEM_PROMPT = `You are a creative home chef. Given a list of ingredients the user has on their counter, generate 5 distinct recipe ideas that use ONLY these ingredients (or a subset). Do not introduce ingredients the user doesn't have.

Each recipe should:
- Use only the listed ingredients (assume basic salt, pepper, water are available)
- Be realistic and cookable
- Have a clear, descriptive title
- Include cuisine, total time, difficulty
- Have proper ingredients list with quantities and 4-8 instruction steps
- Be different from the others (vary cuisine, technique, meal type)

If excludeTitles are provided, do NOT generate recipes with those titles or very similar ones.`;

const GEN_TOOL = {
  name: 'generate_recipes',
  description: 'Return 5 unique recipes that use only the user\'s ingredients',
  input_schema: {
    type: 'object' as const,
    properties: {
      recipes: {
        type: 'array',
        minItems: 5,
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            cuisine: { type: 'string' },
            total_time_minutes: { type: 'number' },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            servings: { type: 'number' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'string' },
                },
                required: ['name'],
              },
            },
            instructions: {
              type: 'array',
              items: { type: 'string' },
              minItems: 4,
              maxItems: 8,
            },
            description: { type: 'string', description: 'One-sentence description' },
          },
          required: ['title', 'cuisine', 'total_time_minutes', 'difficulty', 'servings', 'ingredients', 'instructions', 'description'],
        },
      },
    },
    required: ['recipes'],
  },
};

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
  }

  const { ingredients, excludeTitles = [] } = parsed.data;
  const excludeText = excludeTitles.length > 0
    ? `\n\nDO NOT generate any of these recipes (already shown):\n${excludeTitles.map(t => `- ${t}`).join('\n')}`
    : '';

  const userMessage = `My counter has: ${ingredients.join(', ')}.\n\nGenerate 5 different recipes I can make right now using only these ingredients.${excludeText}`;

  try {
    const response = await anthropic.messages.create({
      model: 'anthropic/claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [GEN_TOOL],
      tool_choice: { type: 'tool', name: 'generate_recipes' },
      messages: [{ role: 'user', content: userMessage }],
    });

    const toolBlock = response.content.find((b) => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return Response.json({ error: 'Generation failed' }, { status: 500 });
    }

    const result = toolBlock.input as { recipes: any[] };
    const recipes = result.recipes.map((r, i) => ({
      objectID: `claude-${Date.now()}-${i}`,
      id: `claude-${Date.now()}-${i}`,
      title: r.title,
      cuisine: r.cuisine,
      total_time_minutes: r.total_time_minutes,
      difficulty: r.difficulty,
      servings: r.servings,
      ingredients: r.ingredients,
      ingredient_names: r.ingredients.map((ing: any) => ing.name.toLowerCase()),
      instructions: r.instructions,
      description: r.description,
      isClaudeGenerated: true,
      usedCount: r.ingredients.length,
      missedCount: 0,
    }));

    return Response.json({ recipes });
  } catch (error: any) {
    if (error?.status === 429) {
      return Response.json({ error: 'Rate limited, try again shortly' }, { status: 429 });
    }
    console.error('Generation error:', error);
    return Response.json({ error: 'Failed to generate recipes' }, { status: 500 });
  }
}
