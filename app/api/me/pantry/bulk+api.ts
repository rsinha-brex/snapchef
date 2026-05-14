import { requireAuth, handleAuthError } from '@/lib/auth';
import { db } from '@/lib/db';
import { pantryItems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
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
      const existing = await db.select().from(pantryItems)
        .where(and(eq(pantryItems.userId, userId), eq(pantryItems.name, normalized)))
        .limit(1);

      if (existing.length > 0) {
        skipped.push({ name: normalized, reason: 'duplicate' });
        continue;
      }

      const [inserted] = await db.insert(pantryItems).values({
        userId,
        name: normalized,
        category: item.category,
        source: item.source,
        photoRef: item.photoRef,
      }).returning();

      added.push(inserted);
    }

    return Response.json({ added, skipped });
  } catch (error) {
    return handleAuthError(error);
  }
}
