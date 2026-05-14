import { anthropic } from '@/lib/anthropic';
import { visionRequestSchema } from '@/lib/schemas';

const VISION_SYSTEM_PROMPT = `You are an ingredient identification assistant. Given a photo of food ingredients on a counter, you identify each visible ingredient and report your confidence in each identification.

Rules:
- Identify ONLY raw/whole ingredients. Do NOT identify prepared dishes, cookware, packaging, or labels.
- Use canonical English names: "yellow onion" not "Spanish onion", "garlic" not "garlic cloves", "tomatoes" not "tomato".
- Confidence levels:
  * "high" — clearly visible, unambiguous identification
  * "medium" — visible but partially obscured, ambiguous variety, or could be a similar ingredient
  * "low" — significant uncertainty, multiple possibilities
- For "medium" or "low" confidence, include a brief note (e.g., "could be spinach or chard").
- Use the record_ingredients tool to return your findings. Do not include prose response.
- If the photo contains no identifiable ingredients, return an empty array.
- Categories: produce, dairy, proteins, grains, pantry_staples, condiments, frozen, beverages, other.`;

const RECORD_INGREDIENTS_TOOL = {
  name: 'record_ingredients',
  description: 'Record the ingredients identified in the photo',
  input_schema: {
    type: 'object' as const,
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Canonical English name, lowercase' },
            category: { type: 'string', enum: ['produce', 'dairy', 'proteins', 'grains', 'pantry_staples', 'condiments', 'frozen', 'beverages', 'other'] },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            note: { type: 'string', description: 'Brief uncertainty note, only for medium/low confidence' },
          },
          required: ['name', 'category', 'confidence'],
        },
      },
    },
    required: ['items'],
  },
};

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = visionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
  }

  const { image } = parsed.data;

  if (image.length > 5 * 1024 * 1024) {
    return Response.json({ error: 'Image too large (max 5MB)' }, { status: 413 });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'anthropic/claude-sonnet-4-6',
      max_tokens: 1024,
      system: VISION_SYSTEM_PROMPT,
      tools: [RECORD_INGREDIENTS_TOOL],
      tool_choice: { type: 'tool', name: 'record_ingredients' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: image },
            },
            { type: 'text', text: 'What ingredients do you see?' },
          ],
        },
      ],
    });

    const toolBlock = response.content.find((b) => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return Response.json({ items: [] });
    }

    const { items } = toolBlock.input as { items: any[] };
    return Response.json({ items: items || [] });
  } catch (error: any) {
    if (error?.status === 429) {
      return Response.json({ error: 'Rate limited, try again shortly' }, { status: 429 });
    }
    console.error('Vision detection error:', error);
    return Response.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
