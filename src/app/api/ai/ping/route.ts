import { jsonError } from '@/lib/auth/server';
import { providerStatus } from '@/lib/ai/providers';

/**
 * TEMPORARY deployment diagnostic: verifies AI provider connectivity from
 * the actual runtime region, one provider at a time. Protected by a
 * one-time token in the environment (AI_PING_TOKEN); returns 404 when
 * unset. Removed after QA.
 */
async function testProvider(name: string, test: (key: string) => Promise<{ status: number; body: string }>): Promise<Record<string, unknown>> {
  const keys: Record<string, string | undefined> = {
    groq: process.env.GROQ_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  };
  const key = keys[name];
  if (!key) return { provider: name, configured: false };
  const t0 = Date.now();
  try {
    const r = await test(key);
    return { provider: name, status: r.status, ok: r.status === 200, ms: Date.now() - t0, body: r.body.slice(0, 220) };
  } catch (error) {
    return { provider: name, ok: false, ms: Date.now() - t0, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function GET(req: Request) {
  const expected = process.env.AI_PING_TOKEN;
  if (!expected) return jsonError(404, 'not_found');
  if (req.headers.get('x-ping-token') !== expected) return jsonError(404, 'not_found');

  const results = await Promise.all([
    testProvider('groq', async (key) => {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env.AI_GROQ_MODEL || 'openai/gpt-oss-120b',
          messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
          max_tokens: 8,
        }),
      });
      return { status: res.status, body: await res.text() };
    }),
    testProvider('gemini', async (key) => {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: OK' }] }] }),
      });
      return { status: res.status, body: await res.text() };
    }),
    testProvider('openrouter', async (key) => {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct',
          messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
          max_tokens: 8,
        }),
      });
      return { status: res.status, body: await res.text() };
    }),
  ]);

  return Response.json({ results, configured: providerStatus() });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
