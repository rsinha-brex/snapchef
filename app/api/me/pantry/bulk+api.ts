import { requireAuth, handleAuthError } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { pantryBulkSchema } from '@/lib/schemas';

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const body = await request.json();
    const parsed = pantryBulkSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const added: any[] = [];
    const skipped: { name: string; reason: string }[] = [];

    for (const item of parsed.data.items) {
      const normalized = item.name.toLowerCase().trim();
      const { data: existing } = await supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', userId)
        .eq('name', normalized)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped.push({ name: normalized, reason: 'duplicate' });
        continue;
      }

      const { data: inserted, error } = await supabase
        .from('pantry_items')
        .insert({
          user_id: userId,
          name: normalized,
          category: item.category || null,
          source: item.source || null,
          photo_ref: item.photoRef || null,
        })
        .select()
        .single();

      if (error) {
        skipped.push({ name: normalized, reason: error.message });
        continue;
      }
      added.push(inserted);
    }

    return Response.json({ added, skipped });
  } catch (error) {
    return handleAuthError(error);
  }
}
