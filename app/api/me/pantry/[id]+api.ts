import { requireAuth, handleAuthError } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: Request, { id }: { id: string }) {
  try {
    const { userId } = await requireAuth(request);
    const { error } = await supabase
      .from('pantry_items')
      .delete()
      .eq('user_id', userId)
      .eq('id', id);

    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function PATCH(request: Request, { id }: { id: string }) {
  try {
    const { userId } = await requireAuth(request);
    const body = await request.json();
    const { data, error } = await supabase
      .from('pantry_items')
      .update(body)
      .eq('user_id', userId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return Response.json({ item: data });
  } catch (error) {
    return handleAuthError(error);
  }
}
