import { useState, useRef, useEffect } from 'react';

function fmtDuration(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface Props {
  src: string;
  size?: 'sm' | 'lg';
}

export default function AudioPlayer({ src, size = 'sm' }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onLoaded = () => setDuration(a.duration || 0);
    const onTime = () => setCurrent(a.currentTime);
    const onEnd = () => { setPlaying(false); setCurrent(0); };
    a.addEventListener('loadedmetadata', onLoaded);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('loadedmetadata', onLoaded);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const seek = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const a = audioRef.current;
    const bar = barRef.current;
    if (!a || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setCurrent(a.currentTime);
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const lg = size === 'lg';

  return (
    <div
      className="flex items-center rounded-[14px] transition-all max-w-[260px] sm:max-w-full"
      style={{
        background: 'linear-gradient(135deg, #F5F1FF 0%, #EDE7FF 100%)',
        border: '1px solid rgba(124, 109, 216, 0.14)',
        padding: lg ? '14px 16px' : '10px 12px',
        gap: lg ? 14 : 12,
        boxShadow: '0 1px 2px rgba(124, 109, 216, 0.06)',
      }}
      onClick={e => e.preventDefault()}
    >
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      <button
        onClick={toggle}
        className="flex-shrink-0 flex items-center justify-center rounded-full transition-all active:scale-95"
        style={{
          width: lg ? 44 : 34,
          height: lg ? 44 : 34,
          background: '#7C6DD8',
          boxShadow: '0 2px 8px rgba(124, 109, 216, 0.4)',
        }}
        aria-label={playing ? 'pause' : 'play'}
      >
        {playing ? (
          <svg width={lg ? 13 : 10} height={lg ? 15 : 12} viewBox="0 0 10 12" fill="none">
            <rect x="0.5" y="0" width="3" height="12" rx="1.2" fill="white" />
            <rect x="6.5" y="0" width="3" height="12" rx="1.2" fill="white" />
          </svg>
        ) : (
          <svg width={lg ? 14 : 11} height={lg ? 15 : 12} viewBox="0 0 11 12" fill="none" style={{ marginLeft: 2 }}>
            <path d="M1 1L10 6L1 11V1Z" fill="white" />
          </svg>
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <div
          ref={barRef}
          onClick={seek}
          className="relative rounded-full cursor-pointer"
          style={{
            height: lg ? 6 : 5,
            background: 'rgba(124, 109, 216, 0.15)',
          }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 rounded-full"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #7C6DD8, #A29BFE)',
              transition: playing ? 'none' : 'width 0.15s ease',
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white"
            style={{
              left: `calc(${progress}% - ${lg ? 6 : 5}px)`,
              width: lg ? 12 : 10,
              height: lg ? 12 : 10,
              boxShadow: '0 1px 3px rgba(124, 109, 216, 0.5)',
              opacity: duration > 0 ? 1 : 0,
              transition: playing ? 'none' : 'left 0.15s ease',
            }}
          />
        </div>

        <div
          className="flex items-center justify-between tabular-nums tracking-tight font-semibold"
          style={{
            color: '#7C6DD8',
            fontSize: lg ? 11.5 : 10.5,
          }}
        >
          <span>{fmtDuration(current)}</span>
          <span style={{ opacity: 0.6 }}>{fmtDuration(duration)}</span>
        </div>
      </div>
    </div>
  );
}
