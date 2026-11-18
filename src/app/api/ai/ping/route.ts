import { aiChat, providerStatus, AiConfigurationError } from '@/lib/ai/providers';
import { jsonError } from '@/lib/auth/server';

/**
 * TEMPORARY deployment diagnostic: verifies AI provider connectivity from
 * the actual runtime region. Protected by a one-time token in the
 * environment (AI_PING_TOKEN); returns 404 when unset. Removed after QA.
 */
export async function GET(req: Request) {
  const expected = process.env.AI_PING_TOKEN;
  if (!expected) return jsonError(404, 'not_found');
  const provided = req.headers.get('x-ping-token');
  if (provided !== expected) return jsonError(404, 'not_found');

  const t0 = Date.now();
  try {
    const result = await aiChat(
      [{ role: 'user', content: 'Reply with the single word: OK' }],
      { temperature: 0, maxTokens: 8 },
    );
    return Response.json({
      ok: true,
      provider: result.provider,
      model: result.model,
      reply: result.text.slice(0, 40),
      ms: Date.now() - t0,
      configured: providerStatus(),
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        ms: Date.now() - t0,
        error: error instanceof Error ? error.message : String(error),
        isConfigError: error instanceof AiConfigurationError,
        configured: providerStatus(),
      },
      { status: 502 },
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
