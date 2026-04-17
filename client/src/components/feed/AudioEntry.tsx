import { Link } from 'react-router-dom';
import type { Log } from '../../lib/types';
import AudioPlayer from './AudioPlayer';
import HabitChips from './HabitChips';

interface Props {
  log: Log;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).toLowerCase();
}

export default function AudioEntry({ log }: Props) {
  if (log.status === 'processing') {
    return (
      <div
        className="rounded-2xl px-4 py-4"
        style={{ background: '#fff', border: '1px solid rgba(139,92,246,0.1)' }}
      >
        <span className="text-xs mb-3 block" style={{ color: '#9ca3af' }}>
          {fmtTime(log.created_at)}
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: '#8b5cf6' }} />
          <span className="text-sm" style={{ color: '#9ca3af' }}>remmy is thinking…</span>
        </div>
      </div>
    );
  }

  return (
    <Link to={`/logs/${log.id}`} className="block">
      <div
        className="rounded-2xl px-4 py-4 transition-all active:scale-[0.99]"
        style={{ background: '#fff', border: '1px solid rgba(139,92,246,0.1)' }}
      >
        <span className="text-xs mb-3 block" style={{ color: '#9ca3af' }}>
          {fmtTime(log.logged_at)}
        </span>
        <AudioPlayer src={log.raw_file_url} />
        {log.rewritten_content && (
          <p className="text-sm mt-3 leading-relaxed line-clamp-2" style={{ color: '#374151' }}>
            {log.rewritten_content}
          </p>
        )}
        {log.habit_matches?.length > 0 && (
          <div className="mt-3">
            <HabitChips habits={log.habit_matches} />
          </div>
        )}
      </div>
    </Link>
  );
}
