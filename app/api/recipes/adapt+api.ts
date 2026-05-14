import { anthropic } from '@/lib/anthropic';
import { z } from 'zod';

const adaptInputSchema = z.object({
  recipe: z.object({
    title: z.string(),
    ingredients: z.array(z.object({
      name: z.string(),
      quantity: z.number().nullable().optional(),
      unit: z.string().nullable().optional(),
    })),
    instructions: z.array(z.string()),
    servings: z.number().nullable().optional(),
  }),
  available: z.array(z.object({
    name: z.string(),
    category: z.string().nullable().optional(),
  })),
});

const ADAPT_SYSTEM_PROMPT = `You are a culinary adaptation assistant. Given a canonical recipe and a list of ingredients the user has available, you produce an adapted version of the recipe that uses what the user has.

Your principles:

1. Prefer substitutions over omissions. Prefer omissions over additions. Never add new ingredients the user doesn't have unless absolutely required for the recipe to work.

2. Be honest about quality impact. If a substitution meaningfully degrades the dish (e.g., dried herbs instead of fresh in a fresh-herb-forward dish), flag it in the reason.

3. Scale proportionally when ingredient quantities don't match. If the user has 3 tomatoes and the recipe calls for 6, scale ALL ingredients by 0.5 and update servings accordingly.

4. Respect the dish's identity. If a recipe is fundamentally defined by an ingredient (e.g., saffron in saffron risotto, fish in fish tacos), DO NOT substitute it with something unrelated. Use the not_viable viability instead.

5. Update instructions to reflect changes. If you substitute or omit an ingredient, update the relevant step text.

Viability levels:
- "good" — adaptation is straightforward, dish quality is preserved
- "compromised" — works but notably different from original
- "stretch" — significant changes, may not resemble the original closely
- "not_viable" — recipe requires ingredients that can't be reasonably substituted; user should pick a different recipe

Use the adapt_recipe tool to return your adaptation. For not_viable, return the tool with viability set and a clear reason; the adapted recipe content will be ignored.`;

const ADAPT_RECIPE_TOOL = {
  name: 'adapt_recipe',
  description: 'Return the adapted recipe with substitutions and viability assessment',
  input_schema: {
    type: 'object' as const,
    properties: {
      adapted: {
        type: 'object',
        description: 'The adapted recipe with modified ingredients and instructions',
        properties: {
          title: { type: 'string' },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
              },
              required: ['name'],
            },
          },
          instructions: { type: 'array', items: { type: 'string' } },
          servings: { type: 'number' },
        },
        required: ['title', 'ingredients', 'instructions'],
      },
      adaptations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['substitute', 'omit', 'scale', 'add'] },
            target: { type: 'string', description: 'Ingredient name affected' },
            replacement: { type: 'string', description: 'For substitutions' },
            reason: { type: 'string', description: 'Human-readable explanation' },
          },
          required: ['type', 'target', 'reason'],
        },
      },
      viability: { type: 'string', enum: ['good', 'compromised', 'stretch', 'not_viable'] },
      reason: { type: 'string', description: 'When not_viable, explain why' },
    },
    required: ['adapted', 'adaptations', 'viability'],
  },
};

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = adaptInputSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
  }

  const { recipe, available } = parsed.data;

  const userMessage = `Recipe: "${recipe.title}"

Ingredients needed:
${recipe.ingredients.map((i) => `- ${i.quantity || ''} ${i.unit || ''} ${i.name}`.trim()).join('\n')}

Instructions:
${recipe.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Servings: ${recipe.servings || 'not specified'}

---

Ingredients the user has available:
${available.map((i) => `- ${i.name}${i.category ? ` (${i.category})` : ''}`).join('\n')}

Please adapt this recipe to use what the user has available.`;

  try {
    const response = await anthropic.messages.create({
      model: 'anthropic/claude-sonnet-4-6',
      max_tokens: 4096,
      system: ADAPT_SYSTEM_PROMPT,
      tools: [ADAPT_RECIPE_TOOL],
      tool_choice: { type: 'tool', name: 'adapt_recipe' },
      messages: [{ role: 'user', content: userMessage }],
    });

    const toolBlock = response.content.find((b) => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return Response.json({ error: 'Adaptation failed — no structured response' }, { status: 500 });
    }

    const result = toolBlock.input as any;
    return Response.json({
      adapted: result.adapted,
      adaptations: result.adaptations,
      viability: result.viability,
      reason: result.reason,
    });
  } catch (error: any) {
    if (error?.status === 429) {
      return Response.json({ error: 'Rate limited, try again shortly' }, { status: 429 });
    }
    console.error('Adaptation error:', error);
    return Response.json({ error: 'Failed to adapt recipe' }, { status: 500 });
  }
}
