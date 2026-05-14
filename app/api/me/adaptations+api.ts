import { requireAuth, handleAuthError } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { data, error } = await supabase
      .from('saved_adaptations')
      .select('*')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });

    if (error) throw error;
    const adaptations = (data || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      recipeId: r.recipe_id,
      recipeTitle: r.recipe_title,
      recipeImage: r.recipe_image,
      adaptedPayload: r.adapted_payload,
      pantrySnapshot: r.pantry_snapshot,
      savedAt: r.saved_at,
    }));
    return Response.json({ adaptations });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { recipeId, recipeTitle, recipeImage, adaptedPayload, pantrySnapshot } = await request.json();

    if (!recipeId || !recipeTitle || !adaptedPayload) {
      return Response.json({ error: 'recipeId, recipeTitle, and adaptedPayload required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('saved_adaptations')
      .insert({
        user_id: userId,
        recipe_id: recipeId,
        recipe_title: recipeTitle,
        recipe_image: recipeImage || null,
        adapted_payload: adaptedPayload,
        pantry_snapshot: pantrySnapshot || null,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ adaptation: data }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
