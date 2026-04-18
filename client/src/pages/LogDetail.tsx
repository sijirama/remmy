import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchLog } from '../lib/logs';
import type { Log } from '../lib/types';
import HabitChips from '../components/feed/HabitChips';
import AudioPlayer from '../components/AudioPlayer';

/* ── Helpers ── */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* ── Log Detail ── */

export default function LogDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [log, setLog] = useState<Log | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchLog(id)
      .then(setLog)
      .catch(() => { toast.error('log not found'); navigate('/me'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <span
          className="w-5 h-5 rounded-full border-[1.5px] border-transparent animate-spin block"
          style={{ borderTopColor: '#111', borderRightColor: 'rgba(0,0,0,0.15)' }}
        />
      </div>
    );
  }

  if (!log) return null;

  const title = log.title;
  const content = log.rewritten_content || log.raw_transcript || log.raw_description || '';
  const wc = content ? wordCount(content) : null;
  const rawSecondary = log.rewritten_content ? (log.raw_transcript || log.raw_description || '') : '';
  const isAudio = log.type === 'audio';

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-xl flex flex-col" style={{ minHeight: '100dvh' }}>

        {/* ── Navbar — matches Chat ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-5 sm:px-8"
          style={{
            height: 56,
            background: 'rgba(250,250,250,0.8)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 transition-opacity hover:opacity-60 active:opacity-40"
            style={{ color: '#3a3a42', marginLeft: -2, padding: '6px 6px 6px 0' }}
          >
            <ChevronLeft size={16} strokeWidth={2.2} />
            <span className="text-[13px] font-medium" style={{ letterSpacing: '-0.01em' }}>back</span>
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

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          className="px-5 sm:px-8 flex flex-col gap-5"
          style={{ marginTop: 40, marginBottom: 80, paddingBottom: 40 }}
        >
          {title && (
            <h1
              style={{
                fontFamily: 'ui-serif, Georgia, "Times New Roman", serif',
                fontSize: 'clamp(1.35rem, 3.5vw, 1.6rem)',
                fontWeight: 600,
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
                color: '#111',
              }}
            >
              {title}
            </h1>
          )}

          {/* Media at top */}
          {isAudio && log.raw_file_url && (
            <AudioPlayer src={log.raw_file_url} size="lg" />
          )}
          {!isAudio && log.raw_file_url && (
            <div
              className="rounded-[14px] overflow-hidden"
              style={{
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <img
                src={log.raw_file_url}
                alt="log"
                className="w-full object-cover block"
                style={{ maxHeight: 420 }}
              />
            </div>
          )}

          {/* Small date + metadata — below media */}
          <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: -2 }}>
            <span
              className="text-[11.5px] font-medium tabular-nums"
              style={{ color: '#9a9aa4', letterSpacing: '-0.005em' }}
            >
              {fmtDate(log.logged_at)} · {fmtTime(log.logged_at)}
            </span>
            {wc && (
              <>
                <span className="w-[3px] h-[3px] rounded-full" style={{ background: '#d4d4d8' }} />
                <span
                  className="text-[11.5px] font-medium tabular-nums"
                  style={{ color: '#9a9aa4' }}
                >
                  {wc} words
                </span>
              </>
            )}
          </div>

          {log.habit_matches?.length > 0 && (
            <div>
              <HabitChips habits={log.habit_matches} />
            </div>
          )}

          {/* Body — markdown, smaller than before */}
          {content && (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          )}

          {/* Raw (secondary) — markdown-rendered */}
          {rawSecondary && (
            <details className="mt-1 group">
              <summary
                className="text-[11.5px] cursor-pointer select-none font-semibold uppercase inline-flex items-center gap-1.5 transition-opacity hover:opacity-60"
                style={{ color: '#9a9aa4', letterSpacing: '0.12em' }}
              >
                <ChevronLeft
                  size={11}
                  strokeWidth={2.5}
                  style={{
                    transform: 'rotate(-90deg)',
                    transition: 'transform 0.15s ease',
                  }}
                  className="group-open:rotate-[-180deg]"
                />
                raw {isAudio ? 'transcript' : 'description'}
              </summary>
              <div className="markdown-body markdown-body--sm mt-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {rawSecondary}
                </ReactMarkdown>
              </div>
            </details>
          )}

        </motion.div>
      </div>
    </div>
  );
}
