import { requireAuth, handleAuthError } from '@/lib/auth';
import { db } from '@/lib/db';
import { pantryItems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(request: Request, { id }: { id: string }) {
  try {
    const { userId } = await requireAuth(request);
    const body = await request.json();

    const [existing] = await db.select().from(pantryItems)
      .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
      .limit(1);

    if (!existing) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const [updated] = await db.update(pantryItems)
      .set(body)
      .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
      .returning();

    return Response.json({ item: updated });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(request: Request, { id }: { id: string }) {
  try {
    const { userId } = await requireAuth(request);

    const [existing] = await db.select().from(pantryItems)
      .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
      .limit(1);

    if (!existing) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    await db.delete(pantryItems)
      .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleAuthError(error);
  }
}
