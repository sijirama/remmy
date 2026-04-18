import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { sendMessage, getChatHistory } from '../lib/chat';
import type { ChatMessage, SearchContext } from '../lib/chat';

/* ── Typing Indicator ── */

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <div className="remmy-avatar w-8 h-8 rounded-full flex-shrink-0" />
      <div
        className="px-4 py-3.5"
        style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.05)',
          borderRadius: '18px 18px 18px 4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <div className="flex gap-[5px] items-center" style={{ height: 14 }}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-[6px] h-[6px] rounded-full animate-bounce"
              style={{ background: '#9a9aa4', animationDelay: `${i * 0.15}s`, display: 'block' }}
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
        className="search-toggle"
      >
        <ChevronDown
          size={11}
          strokeWidth={2.5}
          style={{
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.15s ease',
          }}
        />
        {contexts.length === 1
          ? `searched "${contexts[0].query}" · ${total} result${total !== 1 ? 's' : ''}`
          : `${contexts.length} searches · ${total} results`}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div
              className="rounded-[10px] overflow-hidden"
              style={{ border: '1px solid rgba(0,0,0,0.06)', background: '#fff' }}
            >
              <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: '#9a9aa4', fontSize: 10, letterSpacing: '0.08em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>query</th>
                    <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: '#9a9aa4', fontSize: 10, letterSpacing: '0.08em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>chunk</th>
                    <th className="text-right px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: '#9a9aa4', fontSize: 10, letterSpacing: '0.08em', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>score</th>
                  </tr>
                </thead>
                <tbody>
                  {contexts.flatMap((ctx, ci) =>
                    (ctx.results ?? []).map((r, ri) => (
                      <tr key={`${ci}-${ri}`} style={{ borderTop: ri === 0 && ci === 0 ? 'none' : '1px solid rgba(0,0,0,0.04)' }}>
                        <td className="px-3 py-2.5 align-top" style={{ color: '#7C6DD8', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {ri === 0 ? `"${ctx.query}"` : ''}
                        </td>
                        <td className="px-3 py-2.5 max-w-[140px] sm:max-w-[220px]" style={{ color: '#52525b' }}>
                          <span className="line-clamp-2">{r.chunk_text}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono align-top tabular-nums" style={{ color: '#16a34a', whiteSpace: 'nowrap', fontSize: 10.5 }}>
                          {(r.similarity * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
      className={`flex items-end gap-2 sm:gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {!isUser && (
        <div className="remmy-avatar w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0" />
      )}
      <div
        className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}
        style={{ maxWidth: '85%' }}
      >
        <div
          className="text-[11.5px] sm:text-[13px] leading-[1.6] whitespace-pre-wrap"
          style={isUser ? {
            background: 'linear-gradient(135deg, #3B4252 0%, #2E3440 100%)',
            color: '#ECEFF4',
            borderRadius: '16px 16px 4px 16px',
            padding: '9px 13px',
            boxShadow: '0 1px 3px rgba(46, 52, 64, 0.22)',
          } : {
            background: '#fff',
            color: '#1a1a1a',
            border: '1px solid rgba(0,0,0,0.05)',
            borderRadius: '16px 16px 16px 4px',
            padding: '9px 13px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
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

const SUGGESTIONS: { text: string; tone: 'lavender' | 'pink' | 'mint' | 'sky' | 'butter' }[] = [
  { text: 'how am i doing this week?', tone: 'lavender' },
  { text: 'what habits did i miss?', tone: 'pink' },
  { text: 'summarise my logs', tone: 'mint' },
];

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

  const canSubmit = input.trim().length > 0 && !loading;

  return (
    <div
      className="relative flex flex-col items-center overflow-x-hidden overflow-y-hidden"
      style={{ height: '100dvh', background: 'var(--bg, #fafafa)' }}
    >
      {/* Blurred gradient blobs — decorative */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: '20%',
          right: -100,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(162,155,254,0.35) 0%, rgba(162,155,254,0) 70%)',
          filter: 'blur(60px)',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: '45%',
          left: -140,
          width: 340,
          height: 340,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,67,147,0.22) 0%, rgba(232,67,147,0) 70%)',
          filter: 'blur(70px)',
          zIndex: 0,
        }}
      />

      <div className="relative w-full max-w-xl flex flex-col" style={{ height: '100dvh' }}>

        {/* ── Navbar ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 sm:px-8"
          style={{
            height: 56,
            background: 'rgba(250,250,250,0.92)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            position: 'relative',
            zIndex: 20,
          }}
        >
          <button
            onClick={() => navigate('/me')}
            className="flex items-center gap-1 transition-opacity hover:opacity-60 active:opacity-40"
            style={{ color: '#3a3a42', marginLeft: -2, padding: '6px 6px 6px 0' }}
          >
            <ChevronLeft size={16} strokeWidth={2.2} />
            <span className="text-[13px] font-medium" style={{ letterSpacing: '-0.01em' }}>feed</span>
          </button>

          <button
            onClick={() => navigate('/me')}
            className="text-[17px] font-extrabold transition-opacity hover:opacity-70"
            style={{ color: '#111', letterSpacing: '-0.04em' }}
          >
            remmy
          </button>

          <div style={{ width: 56 }} />
        </div>

        {/* ── Messages ── */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto hide-scrollbar"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="flex flex-col gap-4 px-6 sm:px-8 pt-5 sm:pt-8 pb-4 sm:pb-12">

            {hasOlder && (
              <div ref={sentinelRef} className="flex justify-center pb-2">
                {loadingOlder && (
                  <span
                    className="w-4 h-4 rounded-full border-[1.5px] border-transparent animate-spin block"
                    style={{ borderTopColor: '#111', borderRightColor: 'rgba(0,0,0,0.15)' }}
                  />
                )}
              </div>
            )}

            {historyLoading ? (
              <div className="flex items-center justify-center" style={{ paddingTop: 80 }}>
                <span
                  className="w-5 h-5 rounded-full border-[1.5px] border-transparent animate-spin block"
                  style={{ borderTopColor: '#111', borderRightColor: 'rgba(0,0,0,0.15)' }}
                />
              </div>
            ) : history.length === 0 && !loading ? (
              /* Empty state */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center gap-5"
                style={{ paddingTop: 72 }}
              >
                <div
                  className="remmy-avatar w-11 h-11 sm:w-14 sm:h-14"
                  style={{ borderRadius: 18 }}
                />
                <div className="flex flex-col items-center gap-1.5">
                  <p
                    className="text-[15px] sm:text-[18px] font-semibold"
                    style={{
                      color: '#111',
                      letterSpacing: '-0.02em',
                      fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
                    }}
                  >
                    ask remmy anything
                  </p>
                  <p className="text-[11.5px] sm:text-[13px] text-center" style={{ color: '#9a9aa4', maxWidth: 240, letterSpacing: '-0.01em' }}>
                    habits, patterns, what you logged last week…
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 mt-1">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s.text}
                      onClick={() => setInput(s.text)}
                      className="suggestion-pill-pastel"
                      data-tone={s.tone}
                    >
                      {s.text}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : null}

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
          className="flex-shrink-0 px-6 sm:px-8 pt-2 sm:pt-3"
          style={{
            position: 'relative',
            zIndex: 20,
            paddingBottom: 16,
            background: 'linear-gradient(to top, rgba(250,250,250,1) 60%, rgba(250,250,250,0))',
          }}
        >
          <div className="chat-input-shell">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="ask anything…"
              rows={1}
              className="w-full resize-none outline-none bg-transparent text-[16px] sm:text-[13.5px] leading-[1.55] placeholder:text-[#b8b8c0] hide-scrollbar block"
              style={{
                color: '#111',
                maxHeight: 160,
                minHeight: 22,
                padding: '14px 18px 2px 18px',
                letterSpacing: '-0.005em',
              }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 160) + 'px';
              }}
            />
            <div
              className="flex items-center justify-between"
              style={{ padding: '6px 8px 8px 18px' }}
            >
              <span
                className="text-[10.5px] leading-none"
                style={{ color: '#c4c4ca', letterSpacing: '0.02em' }}
              >
                shift + enter for new line
              </span>
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="chat-send flex-shrink-0 rounded-full flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8"
                aria-label="send message"
              >
                {loading ? (
                  <span
                    className="w-3 h-3 rounded-full border-[1.5px] border-transparent animate-spin block"
                    style={{ borderTopColor: '#fff', borderRightColor: 'rgba(255,255,255,0.3)' }}
                  />
                ) : (
                  <ArrowUp size={14} strokeWidth={2.8} />
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
