import { requireAuth, handleAuthError } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { data, error } = await supabase
      .from('saved_recipes')
      .select('*')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });

    if (error) throw error;
    const saved = (data || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      recipeId: r.recipe_id,
      recipeTitle: r.recipe_title,
      recipeImage: r.recipe_image,
      cooked: r.cooked,
      savedAt: r.saved_at,
      cookedAt: r.cooked_at,
    }));
    return Response.json({ saved });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { recipeId, title, image } = await request.json();

    if (!recipeId || !title) {
      return Response.json({ error: 'recipeId and title required' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('saved_recipes')
      .select('*')
      .eq('user_id', userId)
      .eq('recipe_id', recipeId)
      .limit(1);

    if (existing && existing.length > 0) {
      return Response.json({ saved: existing[0] });
    }

    const { data, error } = await supabase
      .from('saved_recipes')
      .insert({
        user_id: userId,
        recipe_id: recipeId,
        recipe_title: title,
        recipe_image: image || null,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ saved: data }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const url = new URL(request.url);
    const recipeId = parseInt(url.searchParams.get('recipeId') || '');

    if (!recipeId) {
      return Response.json({ error: 'recipeId required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('saved_recipes')
      .delete()
      .eq('user_id', userId)
      .eq('recipe_id', recipeId);

    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleAuthError(error);
  }
}
