'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, MessageCircle, RotateCcw, Send, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/providers/auth-provider';
import { useI18n } from '@/lib/i18n';
import { apiFetch } from '@/lib/client-api';
import {
  createConversation,
  fetchConversation,
  fetchUsage,
  subscribeMessages,
} from '@/lib/db/services';
import type { UsageDay } from '@/types';
import { localDateFor } from '@/lib/date';
import ReactMarkdown from 'react-markdown';

interface ChatBubble {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function CoachPage() {
  const { t } = useI18n();
  const { profile, firebaseReady } = useAuth();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatBubble[] | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [usage, setUsage] = useState<UsageDay | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const timezone = profile?.timezone || 'UTC';

  // Resolve or create the current conversation.
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      const existing = await fetchConversation(profile.uid);
      if (cancelled) return;
      if (existing) {
        setConversationId(existing.id);
      } else {
        const id = await createConversation(profile.uid, profile.language, 'Coach');
        setConversationId(id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  // Live messages.
  useEffect(() => {
    if (!conversationId) return;
    const unsub = subscribeMessages(conversationId, setMessages);
    return () => unsub();
  }, [conversationId]);

  // Daily usage for the quota badge.
  useEffect(() => {
    if (!profile) return;
    fetchUsage(profile.uid, localDateFor(timezone))
      .then(setUsage)
      .catch(() => undefined);
  }, [profile, timezone, messages?.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages?.length, sending]);

  const send = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const text = input.trim();
      if (!text || !conversationId || sending) return;
      setSending(true);
      setInput('');
      try {
        await apiFetch<{ reply: string }>('/api/ai/coach', {
          method: 'POST',
          body: JSON.stringify({ message: text, conversationId }),
        });
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'quota_reached') toast.warning(t('coach.limitReached'));
        else if (code === 'firebase_not_configured' || code === 'ai_not_configured') toast.warning(t('errors.firebaseMissing'));
        else toast.error(t('errors.aiUnavailable'));
      } finally {
        setSending(false);
      }
    },
    [input, conversationId, sending, t],
  );

  async function newConversation() {
    if (!profile) return;
    try {
      const id = await createConversation(profile.uid, profile.language, 'Coach');
      setConversationId(id);
      setMessages(null);
    } catch {
      toast.error(t('errors.generic'));
    }
  }

  if (!profile) return null;

  const quotaLeft = usage ? Math.max(0, (profile.plan === 'premium' ? 30 : 5) - usage.coachMessages) : null;

  if (!firebaseReady) {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <MessageCircle className="h-6 w-6 text-primary" aria-hidden="true" />
            {t('coach.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('coach.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {quotaLeft !== null ? (
            <Badge variant="outline" className="border-primary/40 text-primary">
              {quotaLeft} {t('coach.quotaLeft')}
            </Badge>
          ) : null}
          <Button variant="outline" size="sm" onClick={newConversation}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {t('coach.newConversation')}
          </Button>
        </div>
      </header>

      <div
        role="banner"
        className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300/90"
      >
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t('coach.disclaimer')}
      </div>

      <Card className="flex min-h-[420px] flex-col">
        <CardContent className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-slim sm:p-5">
          {messages === null ? (
            <div className="flex h-full items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12">
                <MessageCircle className="h-6 w-6 text-primary" aria-hidden="true" />
              </span>
              <p className="font-medium">{t('coach.emptyTitle')}</p>
              <p className="max-w-xs text-sm text-muted-foreground">{t('coach.emptySub')}</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-bl-sm border border-border bg-secondary/60'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))
          )}
          {sending ? (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-border bg-secondary/60 px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                {t('coach.thinking')}
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </CardContent>
        <div className="border-t border-border p-3 sm:p-4">
          <form onSubmit={send} className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('coach.placeholder')}
              rows={1}
              maxLength={4000}
              className="max-h-40 min-h-11 flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={sending || !input.trim()} aria-label={t('coach.send')}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
