import { Link } from 'react-router-dom';
import { Camera } from 'lucide-react';
import type { Log } from '../../lib/types';

interface Props {
  log: Log;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).toLowerCase();
}

export default function ImageEntry({ log }: Props) {
  const time = fmtTime(log.status === 'processing' ? log.created_at : log.logged_at);
  const title = log.title || (log.status === 'processing' ? 'processing…' : 'photo');

  const inner = (
    <div
      className="rounded-2xl overflow-hidden transition-all active:scale-[0.99]"
      style={{ background: '#fff', border: '1px solid rgba(139,92,246,0.08)' }}
    >
      <div className="flex items-stretch">
        {/* Text column */}
        <div className="flex-1 px-4 py-4 flex flex-col gap-1 min-w-0">
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

        {/* Thumbnail or icon */}
        {log.status !== 'processing' && log.raw_file_url ? (
          <div className="flex-shrink-0 w-20 relative">
            <img
              src={log.raw_file_url}
              alt="log"
              className="w-full h-full object-cover"
              style={{ minHeight: 80 }}
            />
          </div>
        ) : (
          <div
            className="flex-shrink-0 w-12 flex items-center justify-center"
            style={{ background: 'rgba(139,92,246,0.04)' }}
          >
            <Camera size={14} style={{ color: '#8b5cf6' }} />
          </div>
        )}
      </div>
    </div>
  );

  if (log.status === 'processing') return inner;
  return <Link to={`/logs/${log.id}`} className="block">{inner}</Link>;
}
