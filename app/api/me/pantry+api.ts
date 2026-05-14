import { requireAuth, handleAuthError } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { pantryAddSchema } from '@/lib/schemas';

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { data, error } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Response.json({ items: data || [] });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const body = await request.json();
    const parsed = pantryAddSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { name, category, source, photoRef, expiresAt } = parsed.data;
    const normalized = name.toLowerCase().trim();

    // Check for existing
    const { data: existing } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', userId)
      .eq('name', normalized)
      .limit(1);

    if (existing && existing.length > 0) {
      return Response.json({ item: existing[0] });
    }

    const { data: item, error } = await supabase
      .from('pantry_items')
      .insert({
        user_id: userId,
        name: normalized,
        category: category || null,
        source: source || null,
        photo_ref: photoRef || null,
        expires_at: expiresAt || null,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
