import { Link } from 'react-router-dom';
import { Mic } from 'lucide-react';
import type { Log } from '../../lib/types';

interface Props {
  log: Log;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).toLowerCase();
}

export default function AudioEntry({ log }: Props) {
  const time = fmtTime(log.status === 'processing' ? log.created_at : log.logged_at);
  const title = log.title || (log.status === 'processing' ? 'processing…' : 'voice memo');

  const inner = (
    <div
      className="rounded-2xl px-4 py-4 transition-all active:scale-[0.99]"
      style={{ background: '#fff', border: '1px solid rgba(139,92,246,0.08)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span
            className="font-bold tracking-tight"
            style={{ fontSize: '1.15rem', color: '#1a1a1a', lineHeight: 1.2 }}
          >
            {time}
          </span>
          {log.status === 'processing' ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
                style={{ background: '#8b5cf6' }}
              />
              <span className="text-sm" style={{ color: '#9ca3af' }}>remmy is thinking…</span>
            </div>
          ) : (
            <>
              <span
                className="text-sm font-medium truncate"
                style={{ color: '#374151' }}
              >
                {title}
              </span>
              {log.habit_matches?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {log.habit_matches.map(h => (
                    <span
                      key={h}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(139,92,246,0.1)', color: '#7c3aed' }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(139,92,246,0.08)' }}
        >
          <Mic size={14} style={{ color: '#8b5cf6' }} />
        </div>
      </div>
    </div>
  );

  if (log.status === 'processing') return inner;
  return <Link to={`/logs/${log.id}`} className="block">{inner}</Link>;
}
