import { Link } from 'react-router-dom';
import type { Log } from '../../lib/types';
import HabitChips from './HabitChips';
import AudioPlayer from '../AudioPlayer';

interface Props {
  log: Log;
  isLast?: boolean;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const meridiem = d.getHours() >= 12 ? 'pm' : 'am';
  return { hhmm: `${h}:${m}`, meridiem };
}

/* ── Feed entry ── */

export default function FeedEntry({ log, isLast = false }: Props) {
  const { hhmm, meridiem } = fmtTime(log.status === 'processing' ? log.created_at : log.logged_at);
  const title = log.title;
  const isAudio = log.type === 'audio';
  const preview = log.rewritten_content || (isAudio ? log.raw_transcript : log.raw_description) || '';

  const dotColor = isAudio ? '#C4B5FD' : '#F9A8D4';
  const spineColor = isAudio ? 'rgba(196, 181, 253, 0.55)' : 'rgba(249, 168, 212, 0.55)';
  const dotRadius = isAudio ? 'rounded-sm' : 'rounded-full';

  const inner = (
    <div className="relative flex items-start group">
      {/* Time */}
      <div className="w-[36px] sm:w-[44px] flex-shrink-0 pt-[2px] flex flex-col items-end leading-none">
        <span
          className="text-[11px] sm:text-[13px] font-bold tabular-nums tracking-tight"
          style={{ color: '#111', letterSpacing: '-0.02em' }}
        >
          {hhmm}
        </span>
        <span
          className="text-[9px] font-bold uppercase mt-[3px]"
          style={{ color: '#b8b8c0', letterSpacing: '0.08em' }}
        >
          {meridiem}
        </span>
      </div>

      {/* Spine */}
      <div
        className="relative flex flex-col items-center flex-shrink-0"
        style={{ width: 14, marginLeft: 6, marginRight: 6 }}
      >
        <div
          className={`w-[10px] h-[10px] ${dotRadius} mt-[4px] relative z-10`}
          style={{
            background: dotColor,
            boxShadow: `0 0 0 3px white, 0 0 0 4.5px ${spineColor}`,
          }}
        />
        {!isLast && (
          <div
            className="timeline-spine absolute w-[1.5px]"
            style={{
              top: 22,
              bottom: -80,
              color: spineColor,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-2 min-w-0 pt-0.5 pb-2 ml-1">
        {log.status === 'processing' ? (
          <span className="text-[13px] font-medium" style={{ color: '#c8d0d8' }}>
            remmy is thinking…
          </span>
        ) : (
          <>
            {title && (
              <span
                className="font-semibold text-[13px] sm:text-[15px] leading-snug tracking-tight"
                style={{ color: '#111' }}
              >
                {title}
              </span>
            )}

            {log.raw_file_url && (
              <div className="mt-1.5">
                {isAudio ? (
                  <AudioPlayer src={log.raw_file_url} />
                ) : (
                  <img
                    src={log.raw_file_url}
                    alt=""
                    className="rounded-[4px] object-cover border shadow-sm max-h-[140px] sm:max-h-[300px] max-w-[85%] sm:max-w-full"
                    style={{
                      width: '100%',
                      borderColor: 'rgba(0,0,0,0.06)',
                    }}
                  />
                )}
              </div>
            )}

            {preview && (
              <p
                className="text-[11.5px] sm:text-[13px] leading-snug"
                style={{
                  color: '#888',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {preview}
              </p>
            )}

            {log.habit_matches?.length > 0 && (
              <div className="mt-0.5">
                <HabitChips habits={log.habit_matches} max={3} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (log.status === 'processing') return inner;
  return (
    <Link to={`/logs/${log.id}`} className="block no-underline hover:opacity-75 transition-opacity">
      {inner}
    </Link>
  );
}
