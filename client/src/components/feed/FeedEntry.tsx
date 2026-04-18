import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Log } from '../../lib/types';
import HabitChips from './HabitChips';

interface Props {
  log: Log;
  isLast?: boolean;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export default function FeedEntry({ log, isLast = false }: Props) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const time = fmtTime(log.status === 'processing' ? log.created_at : log.logged_at);
  const title = log.title;
  const isAudio = log.type === 'audio';
  const preview = log.rewritten_content || (isAudio ? log.raw_transcript : log.raw_description) || '';

  const dotColor = isAudio ? '#C4B5FD' : '#F9A8D4';
  const lineColor = isAudio ? '#ede9fe' : '#fce7f3';
  const dotRadius = isAudio ? 'rounded-sm' : 'rounded-full';

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const inner = (
    <div className="relative flex items-start group">
      {/* Time */}
      <div
        className=" flex-shrink-0 text-right pt-[3px] text-[11px] font-semibold tabular-nums"
        style={{ color: '#aaa' }}
      >
        {time}
      </div>

      {/* Spine */}
      <div className="relative flex flex-col items-center" style={{ width: 12, marginLeft: 8, marginRight: 8 }}>
        <div
          className={`w-[9px] h-[9px] ${dotRadius} mt-[5px] relative z-10 ring-2 ring-white`}
          style={{ background: dotColor }}
        />
        {!isLast && (
          <div
            className="absolute w-px"
            style={{ top: 22, bottom: -32, background: lineColor }}
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
                className="font-semibold text-[15px] leading-snug tracking-tight"
                style={{ color: '#111' }}
              >
                {title}
              </span>
            )}


            {log.raw_file_url && (
              <div className="mt-1.5">
                {isAudio ? (
                  <>
                    <audio
                      ref={audioRef}
                      src={log.raw_file_url}
                      onEnded={() => setPlaying(false)}
                      className="hidden"
                    />
                    <div
                      onClick={togglePlay}
                      className="flex items-center px-5 py-5 transition-all outline-none"
                      style={{
                        background: '#F0EDFF',
                        border: '1px solid #e0d9ff',
                        borderRadius: '10px',
                      }}
                    >
                      {/* Play / pause icon */}
                      <span
                        className="flex items-center justify-center shrink-0"
                        style={{ width: 20, height: 20 }}
                      >
                        {playing ? (
                          <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                            <rect x="0" y="0" width="3" height="12" rx="1.5" fill="#7C6DD8" />
                            <rect x="7" y="0" width="3" height="12" rx="1.5" fill="#7C6DD8" />
                          </svg>
                        ) : (
                          <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                            <path d="M1 1.5L9 6L1 10.5V1.5Z" fill="#7C6DD8" />
                          </svg>
                        )}
                      </span>

                      {/* Fake Progress Bar */}
                      <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden relative opacity-70">
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-[#7C6DD8] rounded-full transition-all"
                          style={{ width: playing ? '45%' : '0%' }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <img
                    src={log.raw_file_url}
                    alt=""
                    className="rounded-[4px] object-cover border shadow-sm"
                    style={{
                      width: '100%',
                      // maxWidth: 220,
                      // height: 130,
                      borderColor: 'rgba(0,0,0,0.06)',
                    }}
                  />
                )}
              </div>
            )}

            {preview && (
              <p
                className="text-[13px] leading-snug"
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
                <HabitChips habits={log.habit_matches} max={5} />
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
