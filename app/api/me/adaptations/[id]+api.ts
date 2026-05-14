import { requireAuth, handleAuthError } from '@/lib/auth';
import { db } from '@/lib/db';
import { savedAdaptations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request, { id }: { id: string }) {
  try {
    const { userId } = await requireAuth(request);
    const [adaptation] = await db.select().from(savedAdaptations)
      .where(and(eq(savedAdaptations.id, id), eq(savedAdaptations.userId, userId)))
      .limit(1);

    if (!adaptation) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    return Response.json({ adaptation });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(request: Request, { id }: { id: string }) {
  try {
    const { userId } = await requireAuth(request);
    const [existing] = await db.select().from(savedAdaptations)
      .where(and(eq(savedAdaptations.id, id), eq(savedAdaptations.userId, userId)))
      .limit(1);

    if (!existing) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    await db.delete(savedAdaptations)
      .where(and(eq(savedAdaptations.id, id), eq(savedAdaptations.userId, userId)));

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleAuthError(error);
  }
}
