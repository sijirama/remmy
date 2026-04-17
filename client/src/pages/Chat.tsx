import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { sendMessage, getChatHistory } from '../lib/chat';
import type { ChatMessage } from '../lib/chat';

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>r</div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm" style={{ background: '#fff', border: '1px solid rgba(139,92,246,0.1)' }}>
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ background: '#c4b5fd', animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Message({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>r</div>
      )}
      <div
        className="max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
        style={isUser ? {
          background: '#8b5cf6',
          color: '#fff',
          borderRadius: '18px 18px 4px 18px',
        } : {
          background: '#fff',
          color: '#1a1a1a',
          border: '1px solid rgba(139,92,246,0.1)',
          borderRadius: '18px 18px 18px 4px',
        }}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getChatHistory()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const submit = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await sendMessage(text, history);
      setHistory(prev => [...prev, { role: 'model', content: response }]);
    } catch {
      toast.error('something went wrong');
      setHistory(prev => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8f7ff' }}>

      {/* bg orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-120px] left-[-80px] w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: 'rgba(139,92,246,0.08)' }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-[380px] h-[380px] rounded-full blur-[100px]" style={{ background: 'rgba(167,139,250,0.07)' }} />
      </div>

      {/* Header */}
      <div
        className="sticky top-0 z-20 px-5 py-4 flex items-center justify-between flex-shrink-0"
        style={{ background: 'rgba(248,247,255,0.88)', backdropFilter: 'blur(12px)' }}
      >
        <button
          onClick={() => navigate('/me')}
          className="flex items-center gap-1 transition-opacity active:opacity-60"
          style={{ color: '#8b5cf6' }}
        >
          <ChevronLeft size={18} />
          <span className="text-sm font-medium">feed</span>
        </button>
        <span className="text-sm font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif", color: '#1a1a1a' }}>
          remmy
        </span>
        <div className="w-16" />
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-5 py-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">

          {historyLoading ? (
            <div className="flex items-center justify-center py-24">
              <span className="w-5 h-5 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin block" />
            </div>
          ) : history.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 gap-2"
            >
              <p className="text-sm font-medium" style={{ color: '#c4b5fd' }}>ask remmy anything about your logs</p>
              <p className="text-xs" style={{ color: '#d1d5db' }}>habits, patterns, what you did last week…</p>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {history.map((msg, i) => (
              <Message key={i} msg={msg} />
            ))}
          </AnimatePresence>

          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div
        className="relative z-20 flex-shrink-0 px-5 py-4"
        style={{ background: 'rgba(248,247,255,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(139,92,246,0.08)' }}
      >
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="ask anything…"
            rows={1}
            className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none transition-all"
            style={{
              background: '#fff',
              border: '1px solid rgba(139,92,246,0.15)',
              color: '#1a1a1a',
              maxHeight: 120,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={submit}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-40"
            style={{ background: '#8b5cf6' }}
          >
            <Send size={15} color="#fff" />
          </button>
        </div>
      </div>

    </div>
  );
}
