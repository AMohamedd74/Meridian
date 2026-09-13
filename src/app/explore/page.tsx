"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AssistantMessage, AssistantTyping, UserMessage } from "@/components/chat";
import { ArrowRightIcon } from "@/components/ui/icons";
import { ErrorState } from "@/components/ui/states";
import type { ConversationView, Message } from "@/domain/types";
import { api, errorMessage } from "@/lib/api";
import { pendingOpening } from "@/lib/session";

const SEGMENTS = 8;

type Pending = Pick<Message, "id" | "role" | "content">;

export default function ExplorePage() {
  const router = useRouter();
  const [view, setView] = useState<ConversationView | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initStarted = useRef(false);

  const init = useCallback(async () => {
    setInitError(null);
    const opening = pendingOpening.get();
    try {
      if (opening) {
        setPending({ id: "opening", role: "user", content: opening });
        const started = await api.startConversation(opening);
        pendingOpening.clear();
        setView(started);
        return;
      }
      const latest = await api.latestConversation();
      if (latest?.conversation.status === "completed") {
        router.replace("/paths");
        return;
      }
      setView(latest ?? (await api.startConversation()));
    } catch (e) {
      setInitError(errorMessage(e));
    } finally {
      setPending(null);
    }
  }, [router]);

  useEffect(() => {
    // Guard against StrictMode double-invocation creating two conversations.
    if (initStarted.current) return;
    initStarted.current = true;
    void init();
  }, [init]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [view?.messages.length, pending, sendError]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const send = async () => {
    const content = input.trim();
    if (!content || !view || sending) return;
    setSending(true);
    setSendError(null);
    setInput("");
    setPending({ id: "pending", role: "user", content });
    try {
      setView(await api.sendMessage(view.conversation.id, content));
    } catch (e) {
      setInput(content);
      setSendError(errorMessage(e));
    } finally {
      setPending(null);
      setSending(false);
    }
  };

  const loading = !view && !initError;
  const coverage = view?.conversation.coverage ?? 0;
  const filled = Math.max(1, Math.round(coverage * SEGMENTS));
  const ready = view?.conversation.ready_to_complete ?? false;
  const canSend = input.trim().length > 0 && !sending && Boolean(view);

  return (
    <main className="flex min-h-screen flex-col bg-background pt-14">
      {/* Progress: reflects how complete the coach's picture is, not a fixed question count. */}
      <div className="fixed top-14 right-0 left-0 z-40 flex items-center justify-end border-b border-white/4 bg-background/80 px-5 py-3 backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: SEGMENTS }).map((_, i) => (
              <div
                key={i}
                className="h-0.5 w-5 rounded-full transition-all duration-500"
                style={{
                  background: i < filled ? "#00A8FF" : "rgba(255,255,255,0.08)",
                  boxShadow: i < filled ? "0 0 4px rgba(0,168,255,0.4)" : "none",
                }}
              />
            ))}
          </div>
          <span className="text-xs text-ink-subtle">{ready ? "Ready when you are" : "Getting to know you"}</span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-6 pt-14 pb-56">
        <div className="flex flex-col gap-6 py-8" aria-live="polite">
          {view?.messages.map((m) =>
            m.role === "assistant" ? (
              <AssistantMessage key={m.id} content={m.content} />
            ) : (
              <UserMessage key={m.id} content={m.content} />
            ),
          )}
          {pending && <UserMessage content={pending.content} />}
          {(loading || sending) && <AssistantTyping />}
          {initError && (
            <ErrorState message={initError} onRetry={() => void init()} />
          )}
          <div ref={bottomRef} className="scroll-mb-72" />
        </div>
      </div>

      <div
        className="fixed right-0 bottom-0 left-0 px-6 pt-4 pb-6"
        style={{ background: "linear-gradient(to top, #050505 80%, transparent)" }}
      >
        <div className="mx-auto max-w-2xl">
          {ready && !sending && (
            <div className="mb-3 flex animate-fade-in-up flex-col items-start justify-between gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-3 sm:flex-row sm:items-center">
              <p className="text-sm text-ink-soft">I have enough to suggest a few directions worth testing.</p>
              <button
                onClick={() => router.push(`/analysis?c=${view!.conversation.id}`)}
                className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-black shadow-[0_0_16px_rgba(0,168,255,0.3)]"
              >
                See my directions <ArrowRightIcon size={12} />
              </button>
            </div>
          )}
          {sendError && (
            <p className="mb-2 px-1 text-xs text-ink-muted" role="alert">
              {sendError}
            </p>
          )}
          <div
            className="rounded-2xl bg-surface transition-all duration-300"
            style={{
              border: focused ? "1px solid rgba(0,168,255,0.35)" : "1px solid rgba(255,255,255,0.07)",
              boxShadow: focused ? "0 0 0 3px rgba(0,168,255,0.06)" : "none",
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Share whatever comes to mind..."
              rows={2}
              maxLength={4000}
              disabled={!view}
              className="w-full resize-none bg-transparent px-5 pt-4 pb-3 text-sm leading-relaxed text-white caret-primary outline-none placeholder:text-ink-subtle focus-visible:outline-none"
              aria-label="Your response"
            />
            <div className="flex items-center justify-between gap-3 px-4 pb-3">
              <p className="text-xs text-ink-faint">Take your time. There are no right answers.</p>
              <button
                onClick={() => void send()}
                disabled={!canSend}
                className="rounded-lg px-4 py-1.5 text-xs font-semibold transition-all duration-200"
                style={{
                  background: canSend ? "#00A8FF" : "rgba(255,255,255,0.05)",
                  color: canSend ? "#000" : "#3A3A52",
                  cursor: canSend ? "pointer" : "not-allowed",
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
