import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { sendMessage, getChatHistory } from '../lib/chat';
import type { ChatMessage, SearchContext } from '../lib/chat';

/* ── Typing Indicator ── */

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold"
        style={{ background: '#F0EDFF', color: '#6C5CE7' }}
      >
        r
      </div>
      <div
        className="px-4 py-3.5 rounded-[18px] rounded-bl-[5px]"
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
      >
        <div className="flex gap-[5px] items-center" style={{ height: 16 }}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-[7px] h-[7px] rounded-full animate-bounce"
              style={{ background: '#C4BEFE', animationDelay: `${i * 0.15}s`, display: 'block' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Search Table ── */

function SearchTable({ contexts }: { contexts: SearchContext[] }) {
  const [open, setOpen] = useState(false);
  const total = contexts.reduce((s, c) => s + (c.results?.length ?? 0), 0);
  if (total === 0) return null;

  return (
    <div className="mt-2 ml-11">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-[11px] font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-60"
        style={{ color: '#A29BFE' }}
      >
        <span style={{ fontSize: 9 }}>{open ? '▾' : '▸'}</span>
        {contexts.length === 1
          ? `searched "${contexts[0].query}" · ${total} result${total !== 1 ? 's' : ''}`
          : `${contexts.length} searches · ${total} results`}
      </button>
      {open && (
        <div
          className="mt-2 rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(0,0,0,0.07)' }}
        >
          <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F7F5FF' }}>
                <th className="text-left px-3.5 py-2.5 font-semibold" style={{ color: '#6C5CE7' }}>query</th>
                <th className="text-left px-3.5 py-2.5 font-semibold" style={{ color: '#6C5CE7' }}>chunk</th>
                <th className="text-right px-3.5 py-2.5 font-semibold" style={{ color: '#6C5CE7' }}>score</th>
              </tr>
            </thead>
            <tbody>
              {contexts.flatMap((ctx, ci) =>
                (ctx.results ?? []).map((r, ri) => (
                  <tr key={`${ci}-${ri}`} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <td className="px-3.5 py-2.5 align-top" style={{ color: '#6C5CE7', whiteSpace: 'nowrap' }}>
                      {ri === 0 ? `"${ctx.query}"` : ''}
                    </td>
                    <td className="px-3.5 py-2.5" style={{ color: '#636E72', maxWidth: 220 }}>
                      <span className="line-clamp-2">{r.chunk_text}</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono align-top" style={{ color: '#00B894', whiteSpace: 'nowrap' }}>
                      {(r.similarity * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Message ── */

interface DisplayMessage extends ChatMessage {
  searchContext?: SearchContext[];
}

function Message({ msg }: { msg: DisplayMessage }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex items-end gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {!isUser && (
        <div
          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold"
          style={{ background: '#F0EDFF', color: '#6C5CE7' }}
        >
          r
        </div>
      )}
      <div
        className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}
        style={{ maxWidth: '75%' }}
      >
        <div
          className="text-[14px] leading-[1.7] whitespace-pre-wrap"
          style={isUser ? {
            background: '#111',
            color: '#fff',
            borderRadius: '20px 20px 5px 20px',
            padding: '12px 18px',
          } : {
            background: '#fff',
            color: '#1a1a1a',
            border: '1px solid rgba(0,0,0,0.07)',
            borderRadius: '20px 20px 20px 5px',
            padding: '12px 18px',
          }}
        >
          {msg.content}
        </div>
        {!isUser && msg.searchContext && msg.searchContext.length > 0 && (
          <SearchTable contexts={msg.searchContext} />
        )}
      </div>
    </motion.div>
  );
}

/* ── Chat Page ── */

export default function Chat() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const prevScrollHeightRef = useRef(0);
  const isPrependingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isPrependingRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, loading]);

  useLayoutEffect(() => {
    if (isPrependingRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
      isPrependingRef.current = false;
    }
  }, [history]);

  useEffect(() => {
    getChatHistory()
      .then(page => {
        setHistory(page.messages);
        setHasOlder(page.hasMore);
      })
      .catch(() => { })
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!sentinelRef.current || !hasOlder || loadingOlder || historyLoading) return;
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadOlderMessages();
    }, { threshold: 0.1 });
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOlder, loadingOlder, historyLoading, history]);

  const loadOlderMessages = async () => {
    if (loadingOlder || !hasOlder || history.length === 0) return;
    const oldestId = history[0].id;
    if (!oldestId) return;
    setLoadingOlder(true);
    try {
      const page = await getChatHistory(oldestId);
      if (page.messages.length === 0) { setHasOlder(false); return; }
      prevScrollHeightRef.current = scrollContainerRef.current?.scrollHeight ?? 0;
      isPrependingRef.current = true;
      setHistory(prev => [...page.messages, ...prev]);
      setHasOlder(page.hasMore);
    } catch {
      toast.error('failed to load older messages');
    } finally {
      setLoadingOlder(false);
    }
  };

  const submit = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: DisplayMessage = { role: 'user', content: text };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);
    try {
      const context = history.slice(-40).map(({ role, content }) => ({ role, content }));
      const res = await sendMessage(text, context);
      setHistory(prev => [...prev, {
        role: 'model',
        content: res.response,
        searchContext: res.search_context,
      }]);
    } catch {
      toast.error('something went wrong');
      setHistory(prev => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  }, [input, loading, history]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="flex flex-col items-center"
      style={{ height: '100dvh', background: 'var(--bg, #F8F7F5)' }}
    >
      <div className="w-full max-w-xl flex flex-col" style={{ height: '100dvh' }}>

        {/* ── Navbar ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-5 sm:px-8"
          style={{
            height: 60,
            background: 'rgba(248,247,245,0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {/* Back */}
          <button
            onClick={() => navigate('/me')}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 transition-colors hover:bg-black/[0.05] active:bg-black/[0.08]"
            style={{ color: '#636E72', marginLeft: -8 }}
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
            <span className="text-[13px] font-semibold">feed</span>
          </button>

          {/* Logo */}
          <span
            className="text-[17px] font-extrabold"
            style={{ color: '#111', letterSpacing: '-0.04em' }}
          >
            remmy
          </span>

          {/* Spacer to balance back button */}
          <div style={{ width: 72 }} />
        </div>

        {/* ── Messages ── */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="flex flex-col gap-4 px-5 sm:px-8 py-8">

            {/* Older messages sentinel */}
            {hasOlder && (
              <div ref={sentinelRef} className="flex justify-center pb-2">
                {loadingOlder && (
                  <span
                    className="w-4 h-4 rounded-full border-[1.5px] border-transparent animate-spin block"
                    style={{ borderTopColor: '#6C5CE7', borderRightColor: 'rgba(108,92,231,0.2)' }}
                  />
                )}
              </div>
            )}

            {/* History loading */}
            {historyLoading ? (
              <div className="flex items-center justify-center" style={{ paddingTop: 80 }}>
                <span
                  className="w-5 h-5 rounded-full border-[1.5px] border-transparent animate-spin block"
                  style={{ borderTopColor: '#6C5CE7', borderRightColor: 'rgba(108,92,231,0.2)' }}
                />
              </div>
            ) : history.length === 0 && !loading ? (
              /* Empty state */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center gap-4"
                style={{ paddingTop: 80 }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-[20px] font-black"
                  style={{ background: '#F0EDFF', color: '#6C5CE7' }}
                >
                  r
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-[14px] font-semibold" style={{ color: '#2d3436' }}>
                    ask remmy anything
                  </p>
                  <p className="text-[13px] text-center" style={{ color: '#b2bec3', maxWidth: 220 }}>
                    habits, patterns, what you logged last week…
                  </p>
                </div>

                {/* Suggestion chips */}
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {[
                    'how am i doing this week?',
                    'what habits did i miss?',
                    'summarise my logs',
                  ].map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="text-[12px] font-medium px-3.5 py-2 rounded-full transition-colors hover:bg-[#E8E4FF]"
                      style={{ background: '#F0EDFF', color: '#7C6DD8' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : null}

            {/* Messages list */}
            <AnimatePresence initial={false}>
              {history.map((msg, i) => (
                <Message key={msg.id ?? `local-${i}`} msg={msg} />
              ))}
            </AnimatePresence>

            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Input bar ── */}
        <div
          className="flex-shrink-0 px-5 sm:px-8 pb-6 pt-3"
          style={{
            background: 'rgba(248,247,245,0.97)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <div
            className="flex items-end gap-3 rounded-2xl px-4 py-3"
            style={{
              background: '#fff',
              border: '1.5px solid rgba(0,0,0,0.08)',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocusCapture={e => {
              const el = e.currentTarget;
              el.style.borderColor = '#A29BFE';
              el.style.boxShadow = '0 0 0 3px rgba(108,92,231,0.08)';
            }}
            onBlurCapture={e => {
              const el = e.currentTarget;
              el.style.borderColor = 'rgba(0,0,0,0.08)';
              el.style.boxShadow = 'none';
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="ask anything…"
              rows={1}
              className="flex-1 resize-none outline-none bg-transparent text-[14px] leading-[1.6]"
              style={{
                color: '#111',
                maxHeight: 140,
                minHeight: 24,
                paddingTop: 2,
              }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 140) + 'px';
              }}
            />
            <button
              onClick={submit}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{
                background: input.trim() && !loading ? '#111' : 'rgba(0,0,0,0.08)',
                transition: 'background 0.15s, opacity 0.15s',
              }}
            >
              {loading ? (
                <span
                  className="w-3.5 h-3.5 rounded-full border-[1.5px] border-transparent animate-spin block"
                  style={{ borderTopColor: '#fff', borderRightColor: 'rgba(255,255,255,0.3)' }}
                />
              ) : (
                <ArrowUp size={14} color={input.trim() ? '#fff' : '#aaa'} strokeWidth={2.5} />
              )}
            </button>
          </div>
          <p className="text-center text-[11px] mt-2.5" style={{ color: '#dfe6e9' }}>
            shift + enter for new line
          </p>
        </div>

      </div>
    </div>
  );
}