import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface Props {
  src: string;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ src }: Props) {
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

  return (
    <div className="flex items-center gap-3">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity active:opacity-70"
        style={{ background: '#8b5cf6' }}
      >
        {playing
          ? <Pause size={13} color="#fff" fill="#fff" />
          : <Play size={13} color="#fff" fill="#fff" style={{ marginLeft: 1 }} />
        }
      </button>
      <div className="flex-1 flex flex-col gap-1.5">
        <div
          className="relative h-1.5 rounded-full cursor-pointer"
          style={{ background: 'rgba(139,92,246,0.15)' }}
          onClick={seek}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: '#8b5cf6' }}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-xs" style={{ color: '#9ca3af' }}>{fmt(current)}</span>
          <span className="text-xs" style={{ color: '#9ca3af' }}>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}
