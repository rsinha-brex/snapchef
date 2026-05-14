import { requireAuth, handleAuthError } from '@/lib/auth';
import { db } from '@/lib/db';
import { savedAdaptations } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const adaptations = await db.select().from(savedAdaptations)
      .where(eq(savedAdaptations.userId, userId))
      .orderBy(desc(savedAdaptations.savedAt));
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

    const [adaptation] = await db.insert(savedAdaptations).values({
      userId,
      recipeId,
      recipeTitle,
      recipeImage,
      adaptedPayload,
      pantrySnapshot,
    }).returning();

    return Response.json({ adaptation }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
