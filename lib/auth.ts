import { verifyToken } from '@clerk/backend';
import { supabase } from '@/lib/supabase';

export async function requireAuth(request: Request): Promise<{ userId: string }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header', 401);
  }

  const token = authHeader.slice(7);
  const secretKey = process.env.CLERK_SECRET_KEY!;

  try {
    const payload = await verifyToken(token, {
      secretKey,
      clockSkewInMs: 10000,
    });
    const userId = payload.sub;

    if (!userId) {
      throw new AuthError('Invalid token payload', 401);
    }

    await ensureUser(userId);
    return { userId };
  } catch (error: any) {
    if (error instanceof AuthError) throw error;
    console.error('Auth verification failed:', error?.message || error);
    throw new AuthError('Invalid or expired token', 401);
  }
}

async function ensureUser(userId: string) {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .limit(1);

  if (!data || data.length === 0) {
    await supabase.from('users').upsert({
      id: userId,
      email: `${userId}@placeholder`,
    }, { onConflict: 'id' });
  }
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function handleAuthError(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}
