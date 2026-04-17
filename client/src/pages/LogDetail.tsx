import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { fetchLog } from '../lib/logs';
import type { Log } from '../lib/types';
import AudioPlayer from '../components/feed/AudioPlayer';
import HabitChips from '../components/feed/HabitChips';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).toLowerCase();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }).toLowerCase();
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f7ff' }}>
        <span className="w-5 h-5 rounded-full border-2 border-transparent border-t-violet-500 animate-spin block" />
      </div>
    );
  }

  if (!log) return null;

  return (
    <div className="min-h-screen" style={{ background: '#f8f7ff' }}>
      <div className="flex justify-center">
        <div className="w-full max-w-[480px]">

          {/* Header */}
          <div
            className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between"
            style={{ background: 'rgba(248,247,255,0.85)', backdropFilter: 'blur(12px)' }}
          >
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 transition-opacity active:opacity-60"
              style={{ color: '#8b5cf6' }}
            >
              <ChevronLeft size={18} />
              <span className="text-sm font-medium">back</span>
            </button>
            <span className="text-xs" style={{ color: '#9ca3af' }}>{fmtTime(log.logged_at)}</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="px-5 pb-16 flex flex-col gap-6 pt-2"
          >
            {/* Date */}
            <p className="text-xs" style={{ color: '#9ca3af' }}>{fmtDate(log.logged_at)}</p>

            {/* Media */}
            <div
              className="rounded-2xl overflow-hidden p-4"
              style={{ background: '#fff', border: '1px solid rgba(139,92,246,0.1)' }}
            >
              {log.type === 'audio' ? (
                <AudioPlayer src={log.raw_file_url} />
              ) : (
                <img src={log.raw_file_url} alt="log" className="w-full rounded-xl object-cover" style={{ maxHeight: 320 }} />
              )}
            </div>

            {/* Rewritten content */}
            {log.rewritten_content && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8b5cf6' }}>
                  what remmy understood
                </h3>
                <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid rgba(139,92,246,0.1)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: '#1a1a1a' }}>
                    {log.rewritten_content}
                  </p>
                </div>
              </div>
            )}

            {/* Raw content */}
            {(log.raw_transcript || log.raw_description) && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9ca3af' }}>
                  {log.type === 'audio' ? 'raw transcript' : 'raw description'}
                </h3>
                <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
                    {log.raw_transcript || log.raw_description}
                  </p>
                </div>
              </div>
            )}

            {/* Habits */}
            {log.habit_matches?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9ca3af' }}>
                  habits detected
                </h3>
                <HabitChips habits={log.habit_matches} />
              </div>
            )}

          </motion.div>
        </div>
      </div>
    </div>
  );
}
