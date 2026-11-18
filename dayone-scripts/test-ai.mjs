/**
 * Quick credential smoke test for the three AI providers.
 * Run WITHOUT keys printed in logs:
 *   AI_PROVIDER=groq GROQ_API_KEY=... GEMINI_API_KEY=... OPENROUTER_API_KEY=... \
 *   node dayone-scripts/test-ai.mjs
 */
const tests = [
  {
    name: 'groq',
    run: async (key) => {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env.AI_GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
          max_tokens: 8,
        }),
      });
      return { status: res.status, ok: res.ok, body: res.ok ? (await res.json()).choices?.[0]?.message?.content : (await res.text()).slice(0, 200) };
    },
  },
  {
    name: 'gemini',
    run: async (key) => {
      const model = process.env.AI_GEMINI_MODEL || 'gemini-3.8-flash';
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: OK' }] }] }),
      });
      return { status: res.status, ok: res.ok, body: res.ok ? JSON.stringify((await res.json()).candidates?.[0]?.content?.parts?.[0]?.text) : (await res.text()).slice(0, 200) };
    },
  },
  {
    name: 'openrouter',
    run: async (key) => {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env.AI_OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct',
          messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
          max_tokens: 8,
        }),
      });
      return { status: res.status, ok: res.ok, body: res.ok ? (await res.json()).choices?.[0]?.message?.content : (await res.text()).slice(0, 200) };
    },
  },
];

const keys = {
  groq: process.env.GROQ_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
};

for (const test of tests) {
  const key = keys[test.name];
  if (!key) {
    console.log(`[${test.name}] SKIP — no key configured`);
    continue;
  }
  try {
    const result = await test.run(key);
    console.log(`[${test.name}] HTTP ${result.status} — ${result.ok ? 'OK' : 'FAILED'} ${result.ok ? result.body : result.body}`);
  } catch (error) {
    console.log(`[${test.name}] ERROR — ${error.message}`);
  }
}
