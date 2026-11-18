import 'server-only';

/**
 * Provider-agnostic AI adapter. The active provider comes from AI_PROVIDER
 * (groq | gemini | openrouter) but the adapter transparently falls back to
 * any OTHER provider that has a key configured — and never pretends a
 * provider works when no credentials exist for it.
 */

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiChatOptions {
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface AiChatResult {
  text: string;
  provider: string;
  model: string;
}

export class AiConfigurationError extends Error {
  constructor(message = 'No AI provider is configured. Set AI_PROVIDER and the matching API key.') {
    super(message);
    this.name = 'AiConfigurationError';
  }
}

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiProviderError';
  }
}

type ProviderName = 'groq' | 'gemini' | 'openrouter';

const PROVIDER_ORDER: ProviderName[] = ['groq', 'gemini', 'openrouter'];

function modelFor(name: ProviderName): string {
  switch (name) {
    case 'groq':
      return process.env.AI_GROQ_MODEL || 'openai/gpt-oss-120b';
    case 'gemini':
      return process.env.AI_GEMINI_MODEL || 'gemini-3.8-flash';
    case 'openrouter':
      return process.env.AI_OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct';
  }
}

function keyFor(name: ProviderName): string {
  switch (name) {
    case 'groq':
      return process.env.GROQ_API_KEY || '';
    case 'gemini':
      return process.env.GEMINI_API_KEY || '';
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY || '';
  }
}

/** Ordered list of usable providers: preferred first, then the others. */
function providerChain(): ProviderName[] {
  const preferred = (process.env.AI_PROVIDER || 'groq').trim().toLowerCase() as ProviderName;
  const chain: ProviderName[] = [];
  if (PROVIDER_ORDER.includes(preferred)) chain.push(preferred);
  for (const name of PROVIDER_ORDER) {
    if (!chain.includes(name)) chain.push(name);
  }
  return chain.filter((name) => Boolean(keyFor(name)));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 45_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAiCompatible(
  name: ProviderName,
  url: string,
  extraHeaders: Record<string, string>,
  messages: AiChatMessage[],
  opts: AiChatOptions,
): Promise<string> {
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${keyFor(name)}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model: modelFor(name),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1200,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new AiProviderError(`${name} API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new AiProviderError(`${name} returned an empty response.`);
  return text;
}

async function callGemini(messages: AiChatMessage[], opts: AiChatOptions): Promise<string> {
  const model = modelFor('gemini');
  const systemParts = messages.filter((m) => m.role === 'system').map((m) => ({ text: m.content }));
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': keyFor('gemini'),
      },
      body: JSON.stringify({
        ...(systemParts.length > 0 ? { systemInstruction: { parts: systemParts } } : {}),
        contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.7,
          maxOutputTokens: opts.maxTokens ?? 1200,
          ...(opts.json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new AiProviderError(`gemini API error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!text) throw new AiProviderError('gemini returned an empty response.');
  return text;
}

/**
 * Sends a chat completion request through the configured provider, with one
 * controlled retry, then transparent fallback to any other configured
 * provider. The response always states which provider/model answered.
 */
export async function aiChat(messages: AiChatMessage[], opts: AiChatOptions = {}): Promise<AiChatResult> {
  const chain = providerChain();
  if (chain.length === 0) throw new AiConfigurationError();

  const payload: AiChatMessage[] = opts.json
    ? [
        { role: 'system', content: 'You must respond with a single valid JSON value and nothing else.' },
        ...messages,
      ]
    : messages;

  let lastError: Error | null = null;
  for (const name of chain) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const text =
          name === 'gemini'
            ? await callGemini(payload, opts)
            : await callOpenAiCompatible(
                name,
                name === 'groq'
                  ? 'https://api.groq.com/openai/v1/chat/completions'
                  : 'https://openrouter.ai/api/v1/chat/completions',
                name === 'openrouter'
                  ? {
                      'HTTP-Referer': process.env.APP_PUBLIC_URL || 'https://dayone.ai',
                      'X-Title': 'DAYONE AI',
                    }
                  : {},
                payload,
                opts,
              );
        return { text, provider: name, model: modelFor(name) };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const status = /\b(4[0-9]{2})\b/.exec(lastError.message)?.[1];
        // Do not retry client-side errors (except 429 rate limits).
        if (status && status !== '429' && status !== '408') break;
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }
  throw new AiProviderError(
    `All configured AI providers failed. Last error: ${lastError?.message ?? 'unknown'}`,
  );
}

/** Extracts the first JSON value from a model response (fence-tolerant). */
export function extractJson<T>(text: string): T | null {
  const cleaned = text.replace(/```(?:json)?/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    /* fall through to bracket scanning */
  }
  for (const [open, close] of [
    ['{', '}'],
    ['[', ']'],
  ] as const) {
    const start = cleaned.indexOf(open);
    const end = cleaned.lastIndexOf(close);
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        /* keep scanning */
      }
    }
  }
  return null;
}

export function providerStatus(): { provider: string; configured: boolean; model: string }[] {
  return PROVIDER_ORDER.map((name) => ({
    provider: name,
    configured: Boolean(keyFor(name)),
    model: modelFor(name),
  }));
}
