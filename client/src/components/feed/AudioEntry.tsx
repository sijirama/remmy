import { Link } from 'react-router-dom';
import { Mic } from 'lucide-react';
import type { Log } from '../../lib/types';
import HabitChips from './HabitChips';

interface Props {
  log: Log;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export default function AudioEntry({ log }: Props) {
  const time = fmtTime(log.status === 'processing' ? log.created_at : log.logged_at);
  const title = log.title || (log.status === 'processing' ? 'Processing…' : 'Voice memo');
  const preview = log.rewritten_content || log.raw_transcript || '';

  const inner = (
    <div className="group flex items-start gap-3.5 py-3.5 px-4 border-b border-black/[0.05] last:border-0 transition-colors hover:bg-[#6C5CE7]/[0.04] active:bg-[#6C5CE7]/[0.07] cursor-pointer">
      {/* Icon */}
      <div
        className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center flex-shrink-0 mt-px"
        style={{ background: '#F0EDFF' }}
      >
        {log.status === 'processing' ? (
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: '#6C5CE7' }}
          />
        ) : (
          <Mic size={15} style={{ color: '#6C5CE7' }} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 pt-px">
        <span
          className="font-semibold text-[14.5px] leading-snug tracking-tight truncate"
          style={{ color: '#111' }}
        >
          {title}
        </span>

        {log.status === 'processing' ? (
          <span className="text-[12.5px]" style={{ color: '#b2bec3' }}>
            remmy is thinking…
          </span>
        ) : (
          <>
            {preview && (
              <p
                className="text-[12.5px] leading-relaxed line-clamp-1 mt-0.5"
                style={{ color: '#636E72' }}
              >
                {preview}
              </p>
            )}
            {log.habit_matches?.length > 0 && (
              <div className="mt-1.5">
                <HabitChips habits={log.habit_matches} max={3} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Time */}
      <span
        className="text-[12px] font-medium flex-shrink-0 pt-0.5 tabular-nums"
        style={{ color: '#b2bec3' }}
      >
        {time}
      </span>
    </div>
  );

  if (log.status === 'processing') return inner;
  return <Link to={`/logs/${log.id}`} className="block no-underline">{inner}</Link>;
}