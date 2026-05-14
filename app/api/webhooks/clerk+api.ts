import { Webhook } from 'svix';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: 'Missing svix headers' }, { status: 401 });
  }

  const body = await request.text();

  const wh = new Webhook(webhookSecret);
  let event: any;

  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (event.type === 'user.deleted') {
    const userId = event.data.id;
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
  }

  return Response.json({ received: true });
}
