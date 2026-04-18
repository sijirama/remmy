import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { fetchLog } from '../lib/logs';
import type { Log } from '../lib/types';

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
      style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(0,0,0,0.06)' }}
    >
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="w-full max-w-[480px] px-5 py-4 flex items-center gap-4">
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90"
          style={{ background: '#1a1a1a' }}
        >
          {playing
            ? <Pause size={14} color="#fff" fill="#fff" />
            : <Play size={14} color="#fff" fill="#fff" style={{ marginLeft: 1 }} />
          }
        </button>
        <div className="flex-1 flex flex-col gap-1.5">
          <div
            className="relative h-1 rounded-full cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.1)' }}
            onClick={seek}
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ width: `${progress}%`, background: '#1a1a1a' }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm"
              style={{ left: `${progress}%`, transform: `translateX(-50%) translateY(-50%)`, background: '#1a1a1a' }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-xs font-mono" style={{ color: '#9ca3af' }}>{currentStr}</span>
            {durationStr && <span className="text-xs font-mono" style={{ color: '#9ca3af' }}>{durationStr}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fff' }}>
        <span className="w-5 h-5 rounded-full border-2 border-transparent border-t-gray-300 animate-spin block" />
      </div>
    );
  }

  if (!log) return null;

  const title = log.title || (log.type === 'audio' ? 'Voice memo' : 'Photo');
  const content = log.rewritten_content || log.raw_transcript || log.raw_description || '';
  const wc = content ? wordCount(content) : null;

  return (
    <div className="min-h-screen" style={{ background: '#fff' }}>
      <div className="flex justify-center">
        <div className="w-full max-w-[480px]">

          {/* Header */}
          <div
            className="sticky top-0 z-10 px-5 pt-5 pb-3"
            style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)' }}
          >
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-black/5 active:bg-black/10"
            >
              <ChevronLeft size={20} style={{ color: '#1a1a1a' }} />
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="px-5 pb-32 flex flex-col gap-5 pt-2"
          >
            {/* Date */}
            <p className="text-sm" style={{ color: '#9ca3af' }}>{fmtDate(log.logged_at)}</p>

            {/* Title */}
            <h1
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '2rem',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.025em',
                color: '#1a1a1a',
              }}
            >
              {title}
            </h1>

            {/* Metadata row */}
            <div className="flex items-center gap-2 flex-wrap">
              {log.habit_matches?.map(h => (
                <span
                  key={h}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: 'rgba(139,92,246,0.1)', color: '#7c3aed' }}
                >
                  {h}
                </span>
              ))}
              {wc && (
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: 'rgba(0,0,0,0.05)', color: '#6b7280' }}
                >
                  {wc} words
                </span>
              )}
            </div>

            {/* Image */}
            {log.type === 'image' && log.raw_file_url && (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                <img
                  src={log.raw_file_url}
                  alt="log"
                  className="w-full object-cover"
                  style={{ maxHeight: 320 }}
                />
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} />

            {/* Content */}
            {content && (
              <p
                className="text-[0.95rem] leading-relaxed"
                style={{ color: '#374151', whiteSpace: 'pre-wrap' }}
              >
                {content}
              </p>
            )}

            {/* Raw (secondary, if different from primary content) */}
            {log.rewritten_content && (log.raw_transcript || log.raw_description) && (
              <details className="mt-2">
                <summary
                  className="text-xs cursor-pointer select-none"
                  style={{ color: '#9ca3af' }}
                >
                  raw {log.type === 'audio' ? 'transcript' : 'description'}
                </summary>
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: '#9ca3af', whiteSpace: 'pre-wrap' }}
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
