import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Mic, Camera, LogOut, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { fetchLogs, fetchLog, uploadAudioLog, uploadImageLog } from '../lib/logs';
import type { Log } from '../lib/types';
import FeedEntry from '../components/feed/FeedEntry';

/* ── Helpers ── */

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function isToday(d: Date) {
  return toDateStr(d) === toDateStr(new Date());
}

function isSameDay(a: Date, b: Date) {
  return toDateStr(a) === toDateStr(b);
}

function getRelativeDayLabel(d: Date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(d, today)) return 'today';
  if (isSameDay(d, yesterday)) return 'yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

function getWeekDays(reference: Date): Date[] {
  const day = reference.getDay();
  const monday = new Date(reference);
  monday.setDate(reference.getDate() - ((day + 6) % 7));
  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push(d);
  }
  return week;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type RecordingState = 'idle' | 'recording' | 'uploading';

/* ── Week Strip ── */

function WeekStrip({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const [weekRef, setWeekRef] = useState(selected);
  const week = getWeekDays(weekRef);
  const today = new Date();

  const prevWeek = () => {
    const d = new Date(weekRef);
    d.setDate(d.getDate() - 7);
    setWeekRef(d);
  };

  const nextWeek = () => {
    const d = new Date(weekRef);
    d.setDate(d.getDate() + 7);
    if (d > today) return;
    setWeekRef(d);
  };

  const handleSelect = (d: Date) => {
    if (d > today && !isSameDay(d, today)) return;
    onSelect(d);
  };

  return (
    <div className="flex items-center">
      <button
        onClick={prevWeek}
        className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-black/[0.03] active:bg-black/[0.06] flex-shrink-0"
      >
        <ChevronLeft size={16} strokeWidth={2.5} style={{ color: '#ccc' }} />
      </button>

      <div className="flex-1 flex justify-between px-1">
        {week.map((d, i) => {
          const sel = isSameDay(d, selected);
          const tod = isSameDay(d, today);
          const future = d > today && !tod;

          return (
            <button
              key={i}
              onClick={() => handleSelect(d)}
              disabled={future}
              className="flex flex-col items-center gap-2 transition-all active:scale-95"
              style={{
                opacity: future ? 0.3 : 1,
                cursor: future ? 'default' : 'pointer',
                width: 44,
              }}
            >
              <span
                className="text-[13.5px] tracking-tight"
                style={{
                  color: sel ? '#111' : '#888',
                  fontWeight: sel ? 600 : 500,
                }}
              >
                {DAY_LABELS[i]}
              </span>
              <span
                className="text-[15.5px] flex items-center justify-center rounded-[14px]"
                style={{
                  color: sel ? '#6C5CE7' : tod ? '#6C5CE7' : '#888',
                  fontWeight: sel ? 700 : 600,
                  background: sel ? '#F0EDFF' : 'transparent',
                  width: 38,
                  height: 38,
                }}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={nextWeek}
        className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-black/[0.03] active:bg-black/[0.06] flex-shrink-0"
      >
        <ChevronRight size={16} strokeWidth={2.5} style={{ color: '#ccc' }} />
      </button>
    </div>
  );
}

/* ── Skeleton row ── */

function SkeletonRow({ isLast = false }: { isLast?: boolean }) {
  return (
    <div className="relative flex items-start pb-8 animate-pulse">
      {/* Time */}
      <div className="w-[42px] flex-shrink-0 pt-[3px] flex justify-end">
        <div className="w-8 h-[12px] rounded-full bg-black/5" />
      </div>

      {/* Spine */}
      <div className="relative flex flex-col items-center" style={{ width: 12, marginLeft: 8, marginRight: 8 }}>
        <div className="w-[9px] h-[9px] bg-black/[0.1] rounded-full mt-[5px] relative z-10" />
        {!isLast && (
          <div
            className="absolute w-px"
            style={{ top: 22, bottom: -32, background: 'rgba(0,0,0,0.03)' }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-2.5 pt-1 ml-1">
        <div className="h-[14px] w-48 rounded-full bg-black/5" />
        <div className="h-[14px] w-3/4 rounded-full bg-black/5" />
        <div className="h-[14px] w-1/2 rounded-full bg-black/5" />
      </div>
    </div>
  );
}

/* ── Dashboard ── */

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [imageUploading, setImageUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadLogs = useCallback(async (d: Date, off = 0) => {
    if (off === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const page = await fetchLogs(toDateStr(d), off);
      setLogs(prev => off === 0 ? page.logs : [...prev, ...page.logs]);
      setHasMore(page.hasMore);
      setOffset(off + page.logs.length);
    } catch {
      if (off === 0) setLogs([]);
      toast.error('failed to load logs');
    } finally {
      if (off === 0) setLoading(false);
      else setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setOffset(0);
    setHasMore(false);
    loadLogs(date, 0);
  }, [date, loadLogs]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!sentinelRef.current || !hasMore || loadingMore) return;
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) loadLogs(date, offset);
    }, { threshold: 0.1 });
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, offset, date, loadLogs]);

  useEffect(() => {
    const processingIds = logs.filter(l => l.status === 'processing').map(l => l.id);
    if (processingIds.length === 0) return;
    pollTimerRef.current = setTimeout(async () => {
      const updated = await Promise.all(processingIds.map(id => fetchLog(id).catch(() => null)));
      setLogs(prev => prev.map(log => {
        const fresh = updated.find(u => u?.id === log.id);
        return fresh ?? log;
      }));
    }, 3000);
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  }, [logs]);

  /* ── Audio recording ── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecordingState('uploading');
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const res = await uploadAudioLog(blob);
          const optimistic: Log = {
            id: res.id,
            user_id: user?.id ?? 0,
            type: 'audio',
            status: 'processing',
            title: '',
            raw_file_url: '',
            habit_matches: [],
            logged_at: res.created_at,
            created_at: res.created_at,
          };
          setLogs(prev => [optimistic, ...prev]);
        } catch (err) {
          console.error('audio upload failed', err);
          toast.error('audio upload failed');
        } finally {
          setRecordingState('idle');
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecordingState('recording');
    } catch {
      // mic denied
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  };

  const handleMicClick = () => {
    if (recordingState === 'recording') stopRecording();
    else if (recordingState === 'idle') startRecording();
  };

  /* ── Image upload ── */
  const handleImageFile = async (file: File) => {
    setImageUploading(true);
    try {
      const res = await uploadImageLog(file);
      const optimistic: Log = {
        id: res.id,
        user_id: user?.id ?? 0,
        type: 'image',
        status: 'processing',
        title: '',
        raw_file_url: URL.createObjectURL(file),
        habit_matches: [],
        logged_at: res.created_at,
        created_at: res.created_at,
      };
      setLogs(prev => [optimistic, ...prev]);
    } catch (err) {
      console.error('image upload failed', err);
      toast.error('image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const allHabits = [...new Set(logs.flatMap(l => l.habit_matches ?? []))];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
          e.target.value = '';
        }}
      />

      <div className="flex flex-col items-center min-h-screen px-5 sm:px-8 pb-16" style={{ paddingTop: 52 }}>
        <div className="w-full max-w-xl flex flex-col gap-6">

          {/* ── Top bar ── */}
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span
              className="text-[18px] font-extrabold tracking-[-0.04em]"
              style={{ color: '#111' }}
            >
              remmy
            </span>
            <div className="flex items-center gap-1.5">
              {user?.profilePicture && (
                <img
                  src={user.profilePicture}
                  alt={user.firstName}
                  className="w-7 h-7 rounded-full object-cover"
                  style={{ boxShadow: '0 0 0 1.5px rgba(0,0,0,0.08)' }}
                />
              )}
              <button
                onClick={() => navigate('/chat')}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.05] transition-colors"
              >
                <MessageCircle size={15} style={{ color: '#636E72' }} />
              </button>
              <button
                onClick={logout}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.05] transition-colors"
              >
                <LogOut size={15} style={{ color: '#c8d0d8' }} />
              </button>
            </div>
          </motion.div>

          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.06 }}
            className="flex items-center justify-between mb-1"
          >
            <h1
              className="text-[2.25rem] font-extrabold leading-none tracking-tight"
              style={{ letterSpacing: '-0.04em', color: '#111' }}
            >
              {getRelativeDayLabel(date)}
            </h1>
            <div className="text-right">
              <p className="text-[14.5px] font-semibold" style={{ color: '#888', letterSpacing: '-0.01em' }}>
                {MONTH_NAMES[date.getMonth()]} {date.getDate()}
              </p>
            </div>
          </motion.div>

          {/* ── Week strip ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="py-1"
          >
            <WeekStrip selected={date} onSelect={setDate} />
          </motion.div>

          {/* ── Habits + Capture ── */}
          <motion.div
            className="flex items-center justify-between gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.14 }}
          >
            {/* Habit chips */}
            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
              <AnimatePresence>
                {allHabits.slice(0, 4).map(h => (
                  <motion.span
                    key={h}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: '#F0EDFF', color: '#7C6DD8' }}
                  >
                    {h}
                  </motion.span>
                ))}
                {allHabits.length > 4 && (
                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.04)', color: '#aaa' }}
                  >
                    +{allHabits.length - 4}
                  </span>
                )}
              </AnimatePresence>
            </div>

            {/* Capture buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleMicClick}
                disabled={recordingState === 'uploading'}
                className="w-9 h-9 rounded-[11px] flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: recordingState === 'recording' ? '#FFF0F6' : '#F0EDFF',
                  border: `1.5px solid ${recordingState === 'recording' ? '#E84393' : 'transparent'}`,
                }}
              >
                {recordingState === 'uploading' ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-transparent border-t-[#6C5CE7] animate-spin block" />
                ) : (
                  <Mic
                    size={15}
                    style={{ color: recordingState === 'recording' ? '#E84393' : '#6C5CE7' }}
                    className={recordingState === 'recording' ? 'animate-pulse' : ''}
                  />
                )}
              </button>

              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={imageUploading}
                className="w-9 h-9 rounded-[11px] flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                style={{ background: '#FFF0F6', border: '1.5px solid transparent' }}
              >
                {imageUploading ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-transparent border-t-[#E84393] animate-spin block" />
                ) : (
                  <Camera size={15} style={{ color: '#E84393' }} />
                )}
              </button>
            </div>
          </motion.div>

          {/* ── Feed ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.18 }}
            className="flex flex-col gap-12 mb-6 mt-4"
          >
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow isLast />
              </>
            ) : logs.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[13px] font-medium" style={{ color: '#c8d0d8' }}>
                  nothing here {isToday(date) ? 'yet' : 'that day'}
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {logs.map((log, i) => {
                  const isLast = i === logs.length - 1;
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.16 }}
                    >
                      <FeedEntry log={log} isLast={isLast} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {/* Infinite scroll sentinel */}
            {!loading && hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                {loadingMore && (
                  <span className="w-4 h-4 rounded-full border-[1.5px] border-gray-200 border-t-[#6C5CE7] animate-spin block" />
                )}
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}