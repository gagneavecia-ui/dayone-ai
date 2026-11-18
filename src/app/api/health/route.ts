import { isFirebaseConfigured } from '@/lib/firebase/client';
import { isFirebaseAdminConfigured } from '@/lib/firebase/admin';
import { providerStatus } from '@/lib/ai/providers';

export async function GET() {
  return Response.json({
    ok: true,
    service: 'dayone-ai',
    time: new Date().toISOString(),
    firebaseClient: isFirebaseConfigured(),
    firebaseAdmin: isFirebaseAdminConfigured(),
    ai: providerStatus(),
  });
}
