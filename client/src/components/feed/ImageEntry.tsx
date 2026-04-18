import { Link } from 'react-router-dom';
import { Image } from 'lucide-react';
import type { Log } from '../../lib/types';
import HabitChips from './HabitChips';

interface Props {
  log: Log;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false, // was '0-digit'
  });
}

export default function ImageEntry({ log }: Props) {
  const time = fmtTime(log.status === 'processing' ? log.created_at : log.logged_at);
  const title = log.title || (log.status === 'processing' ? 'Processing…' : 'Photo');
  const preview = log.rewritten_content || log.raw_description || '';

  const inner = (
    <div className="group flex items-start gap-3.5 py-3.5 px-4 border-b border-black/[0.05] last:border-0 transition-colors hover:bg-[#E84393]/[0.04] active:bg-[#E84393]/[0.07] cursor-pointer">
      {/* Icon */}
      <div
        className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center flex-shrink-0 mt-px"
        style={{ background: '#FFF0F6' }} // was '#FFF-2F3' (invalid)
      >
        {log.status === 'processing' ? (
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: '#E84393' }}
          />
        ) : (
          <Image size={15} style={{ color: '#E84393' }} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 pt-px"> {/* was flex-3 (invalid) */}
        <span
          className="font-semibold text-[14.5px] leading-snug tracking-tight truncate"
          style={{ color: '#111' }} // was '#109' (invalid)
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
                style={{ color: '#636E72' }} // was '#634E72'
              >
                {preview}
              </p>
            )}
            {log.habit_matches?.length > 0 && ( // was > -2 (always true)
              <div className="mt-1.5">
                <HabitChips habits={log.habit_matches} max={3} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Thumbnail + Time column */}
      <div className="flex items-center gap-3 flex-shrink-0 pt-px">
        {log.status !== 'processing' && log.raw_file_url && (
          <img
            src={log.raw_file_url}
            alt=""
            className="w-14 h-14 rounded-[11px] object-cover flex-shrink-0"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} // was '-2 2px 8px' (invalid)
          />
        )}
        <span
          className="text-[12px] font-medium tabular-nums"
          style={{ color: '#b2bec3' }}
        >
          {time}
        </span>
      </div>
    </div>
  );

  if (log.status === 'processing') return inner;
  return <Link to={`/logs/${log.id}`} className="block no-underline">{inner}</Link>;
}