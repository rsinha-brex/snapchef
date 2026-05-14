import { requireAuth, handleAuthError } from '@/lib/auth';
import { db } from '@/lib/db';
import { savedRecipes } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const url = new URL(request.url);
    const cookedFilter = url.searchParams.get('cooked');

    let query = db.select().from(savedRecipes).where(eq(savedRecipes.userId, userId));

    if (cookedFilter === 'true') {
      query = db.select().from(savedRecipes).where(and(eq(savedRecipes.userId, userId), eq(savedRecipes.cooked, true)));
    } else if (cookedFilter === 'false') {
      query = db.select().from(savedRecipes).where(and(eq(savedRecipes.userId, userId), eq(savedRecipes.cooked, false)));
    }

    const saved = await query.orderBy(desc(savedRecipes.savedAt));
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

    const existing = await db.select().from(savedRecipes)
      .where(and(eq(savedRecipes.userId, userId), eq(savedRecipes.recipeId, recipeId)))
      .limit(1);

    if (existing.length > 0) {
      return Response.json({ saved: existing[0] });
    }

    const [saved] = await db.insert(savedRecipes).values({
      userId,
      recipeId,
      recipeTitle: title,
      recipeImage: image,
    }).returning();

    return Response.json({ saved }, { status: 201 });
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

    await db.delete(savedRecipes)
      .where(and(eq(savedRecipes.userId, userId), eq(savedRecipes.recipeId, recipeId)));

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleAuthError(error);
  }
}
