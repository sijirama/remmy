import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Play, Pause, Mic, Image } from 'lucide-react';
import { toast } from 'sonner';
import { fetchLog } from '../lib/logs';
import type { Log } from '../lib/types';
import HabitChips from '../components/feed/HabitChips';

/* ── Helpers ── */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function fmtDuration(s: number) {
  if (!s || !isFinite(s)) return null;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* ── Sticky Audio Player ── */

function StickyAudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onEnd = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnd);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play(); setPlaying(true); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const progress = duration ? (current / duration) * 100 : 0;
  const durationStr = fmtDuration(duration);
  const currentStr = fmtDuration(current) ?? '0:00';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 flex justify-center"
      style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }}
    >
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="w-full max-w-[520px] px-6 py-4 flex items-center gap-4">
        <button
          onClick={toggle}
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90"
          style={{ background: '#111' }}
        >
          {playing
            ? <Pause size={15} color="#fff" fill="#fff" />
            : <Play size={15} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
          }
        </button>
        <div className="flex-1 flex flex-col gap-2">
          <div
            className="relative h-1.5 rounded-full cursor-pointer group"
            style={{ background: 'rgba(0,0,0,0.08)' }}
            onClick={seek}
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: '#111' }}
            />
            <div
              className="absolute top-1/2 w-3.5 h-3.5 rounded-full border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progress}%`, transform: 'translateX(-50%) translateY(-50%)', background: '#111', boxShadow: 'var(--shadow-sm)' }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-[11px] font-medium tabular-nums" style={{ color: '#b2bec3' }}>{currentStr}</span>
            {durationStr && <span className="text-[11px] font-medium tabular-nums" style={{ color: '#b2bec3' }}>{durationStr}</span>}
          </div>
        </div>
      </div>
    </div>
  );
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
        <span className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-[#6C5CE7] animate-spin block" />
      </div>
    );
  }

  if (!log) return null;

  const title = log.title || (log.type === 'audio' ? 'Voice memo' : 'Photo');
  const content = log.rewritten_content || log.raw_transcript || log.raw_description || '';
  const wc = content ? wordCount(content) : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="flex justify-center px-4">
        <div className="w-full max-w-[580px]">

          {/* Header */}
          <div
            className="sticky top-0 z-10 px-6 sm:px-8 pt-5 pb-3"
            style={{ background: 'rgba(250,250,250,0.92)', backdropFilter: 'blur(16px)' }}
          >
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 transition-colors hover:opacity-70 active:opacity-50"
              style={{ color: '#636E72' }}
            >
              <ChevronLeft size={18} />
              <span className="text-sm font-medium">back</span>
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="px-6 sm:px-8 pb-32 flex flex-col gap-6 pt-3"
          >
            {/* Date */}
            <p className="text-[13px] font-medium" style={{ color: '#b2bec3' }}>
              {fmtDate(log.logged_at)}
            </p>

            {/* Title */}
            <h1
              style={{
                fontSize: '1.875rem',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: '#111',
              }}
            >
              {title}
            </h1>

            {/* Metadata badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type badge */}
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full"
                style={{
                  background: log.type === 'audio' ? '#F0EDFF' : '#FFF0F3',
                  color: log.type === 'audio' ? '#6C5CE7' : '#E84393',
                }}
              >
                {log.type === 'audio'
                  ? <><Mic size={11} /> Voice Memo</>
                  : <><Image size={11} /> Photo</>
                }
              </span>

              {/* Word count */}
              {wc && (
                <span
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.04)', color: '#636E72' }}
                >
                  {wc} words
                </span>
              )}

              {/* Habits */}
              {log.habit_matches?.length > 0 && (
                <HabitChips habits={log.habit_matches} />
              )}
            </div>

            {/* Image */}
            {log.type === 'image' && log.raw_file_url && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
              >
                <img
                  src={log.raw_file_url}
                  alt="log"
                  className="w-full object-cover"
                  style={{ maxHeight: 340 }}
                />
              </div>
            )}

            {/* Dotted divider */}
            <hr className="feed-separator" />

            {/* Content */}
            {content && (
              <p
                className="text-[15px] leading-[1.7]"
                style={{ color: '#374151', whiteSpace: 'pre-wrap' }}
              >
                {content}
              </p>
            )}

            {/* Raw (secondary, if different from primary content) */}
            {log.rewritten_content && (log.raw_transcript || log.raw_description) && (
              <details className="mt-2">
                <summary
                  className="text-[12px] cursor-pointer select-none font-medium"
                  style={{ color: '#b2bec3' }}
                >
                  raw {log.type === 'audio' ? 'transcript' : 'description'}
                </summary>
                <p
                  className="mt-3 text-[13px] leading-relaxed rounded-xl p-4"
                  style={{ color: '#636E72', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.02)' }}
                >
                  {log.raw_transcript || log.raw_description}
                </p>
              </details>
            )}

          </motion.div>
        </div>
      </div>

      {/* Sticky audio player */}
      {log.type === 'audio' && log.raw_file_url && (
        <StickyAudioPlayer src={log.raw_file_url} />
      )}
    </div>
  );
}
