import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Mic, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { fetchLogs, fetchLog, uploadAudioLog, uploadImageLog } from '../lib/logs';
import type { Log } from '../lib/types';
import FeedEntry from '../components/feed/FeedEntry';
import { palette } from '../components/feed/HabitChips';
import Navbar from '../components/Navbar';

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


/** Returns 7 consecutive days centered on `center` (3 before, center, 3 after). */
function getWeekCentered(center: Date): Date[] {
  const week: Date[] = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(center);
    d.setDate(center.getDate() + i);
    week.push(d);
  }
  return week;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


type RecordingState = 'idle' | 'recording' | 'uploading';

/* ── Week Strip ── */

function WeekStrip({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const today = new Date();
  const [center, setCenter] = useState<Date>(today);
  const week = getWeekCentered(center);

  const prevWeek = () => {
    const d = new Date(center);
    d.setDate(d.getDate() - 7);
    setCenter(d);
  };

  const nextWeek = () => {
    const d = new Date(center);
    d.setDate(d.getDate() + 7);
    // block scrolling beyond the window that still contains today
    if (d.getTime() - today.getTime() > 3 * 86400000) return;
    setCenter(d);
  };

  const handleSelect = (d: Date) => {
    if (d > today && !isSameDay(d, today)) return;
    onSelect(d);
  };

  const nextBlocked = (() => {
    const d = new Date(center);
    d.setDate(d.getDate() + 7);
    return d.getTime() - today.getTime() > 3 * 86400000;
  })();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={prevWeek}
        className="w-7 h-7 flex items-center justify-center flex-shrink-0 rounded-full opacity-50 hover:opacity-100 hover:bg-black/[0.04] transition-all"
        aria-label="previous week"
      >
        <ChevronLeft size={14} strokeWidth={2} style={{ color: '#111' }} />
      </button>

      <div className="flex-1 flex justify-between items-stretch">
        {week.map((d, i) => {
          const sel = isSameDay(d, selected);
          const tod = isSameDay(d, today);
          const future = d > today && !tod;
          const label = WEEKDAY_SHORT[d.getDay()];

          // today (whether selected or not) always gets the accent box
          const isAccentBox = tod;

          return (
            <button
              key={i}
              onClick={() => handleSelect(d)}
              disabled={future}
              className="flex flex-col items-center transition-all active:scale-[0.97] w-[36px] sm:w-[44px]"
              style={{
                opacity: future ? 0.25 : 1,
                cursor: future ? 'default' : 'pointer',
                gap: 5,
                paddingTop: 2,
              }}
            >
              <span
                className="text-[9.5px] uppercase tabular-nums leading-none"
                style={{
                  color: tod ? '#7C6DD8' : sel ? '#111' : '#b8b8c0',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                }}
              >
                {label}
              </span>

              <span
                className="tabular-nums leading-none flex items-center justify-center font-bold"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: isAccentBox ? 22 : 20,
                  color: isAccentBox
                    ? '#7C6DD8'
                    : sel ? '#fff' : '#3a3a42',
                  fontWeight: sel || tod ? 800 : 700,
                  letterSpacing: '-0.01em',
                  padding: isAccentBox
                    ? '11px 6px'
                    : sel
                      ? '8px 9px'
                      : '8px 4px',
                  border: isAccentBox
                    ? `1.5px solid ${sel ? '#7C6DD8' : 'rgba(124, 109, 216, 0.45)'}`
                    : '1.5px solid transparent',
                  background: isAccentBox
                    ? 'transparent'
                    : sel ? '#111' : 'transparent',
                  borderRadius: 9,
                  boxShadow: sel && !isAccentBox
                    ? '0 2px 6px rgba(0, 0, 0, 0.18)'
                    : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  minWidth: 30,
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
        disabled={nextBlocked}
        className="w-7 h-7 flex items-center justify-center flex-shrink-0 rounded-full opacity-50 hover:opacity-100 hover:bg-black/[0.04] transition-all disabled:opacity-15 disabled:hover:bg-transparent disabled:hover:opacity-15"
        aria-label="next week"
      >
        <ChevronRight size={14} strokeWidth={2} style={{ color: '#111' }} />
      </button>
    </div>
  );
}

/* ── Skeleton row ── */

function SkeletonRow({ isLast = false }: { isLast?: boolean }) {
  return (
    <div className="relative flex items-start pb-8 animate-pulse">
      {/* Time */}
      <div className="w-[36px] sm:w-[44px] flex-shrink-0 pt-[2px] flex flex-col items-end gap-1.5">
        <div className="w-8 h-[10px] rounded-full bg-black/5" />
        <div className="w-5 h-[7px] rounded-full bg-black/5" />
      </div>

      {/* Spine */}
      <div className="relative flex flex-col items-center flex-shrink-0" style={{ width: 14, marginLeft: 6, marginRight: 6 }}>
        <div
          className="w-[10px] h-[10px] bg-black/[0.08] rounded-full mt-[4px] relative z-10"
          style={{ boxShadow: '0 0 0 3px white, 0 0 0 4.5px rgba(0,0,0,0.04)' }}
        />
        {!isLast && (
          <div
            className="timeline-spine absolute w-[1.5px]"
            style={{ top: 22, bottom: -80, color: 'rgba(0,0,0,0.08)' }}
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
  const { user } = useAuth();
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
          const mimeType = chunksRef.current[0]?.type || 'audio/mp4';
          const blob = new Blob(chunksRef.current, { type: mimeType });
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
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg)' }}>
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

      <div className="flex flex-col items-center min-h-screen px-0 sm:px-8 pb-16 pt-2 sm:pt-6">
        <div className="w-[93%] sm:w-full max-w-xl mx-auto flex flex-col gap-6">

          {/* Bulletproof spacer so the navbar is never touching the top edge */}
          <div className="block md:hidden h-0 w-full flex-shrink-0" />

          {/* Dedicated margin block for PC screens */}
          <div className="hidden sm:block h-0 w-full flex-shrink-0" />

          {/* ── Top bar ── */}
          <Navbar />



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
            {/* Habit chips — marquee */}
            <div className="habit-marquee-mask flex-1 min-w-0 overflow-hidden">
              {allHabits.length > 0 && (
                <div className="habit-marquee-track">
                  {[...allHabits, ...allHabits].map((h, i) => {
                    const { bg, color } = palette(h);
                    return (
                      <span
                        key={`${h}-${i}`}
                        className="text-[11.5px] font-semibold whitespace-nowrap flex-shrink-0"
                        style={{
                          background: bg,
                          color,
                          padding: '4px 10px',
                          borderRadius: 6,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {h}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Capture buttons — hidden on mobile, FAB handles it */}
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
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
            className="flex flex-col gap-8 sm:gap-12 mb-6 mt-4"
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

      {/* ── Sticky mobile capture FAB ── */}
      <div className="fixed bottom-10 right-5 flex flex-col gap-2.5 z-30 sm:hidden">
        <button
          onClick={handleMicClick}
          disabled={recordingState === 'uploading'}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
          style={{
            background: recordingState === 'recording'
              ? 'linear-gradient(135deg, #E84393 0%, #FD79A8 100%)'
              : 'linear-gradient(135deg, #7C6DD8 0%, #A29BFE 100%)',
            boxShadow: recordingState === 'recording'
              ? '0 4px 16px rgba(232, 67, 147, 0.4)'
              : '0 4px 16px rgba(124, 109, 216, 0.35)',
          }}
          aria-label={recordingState === 'recording' ? 'stop recording' : 'start recording'}
        >
          {recordingState === 'uploading' ? (
            <span className="w-4 h-4 rounded-full border-2 border-transparent border-t-white animate-spin block" />
          ) : (
            <Mic
              size={18}
              color="#fff"
              className={recordingState === 'recording' ? 'animate-pulse' : ''}
            />
          )}
        </button>

        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={imageUploading}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, #E84393 0%, #FD79A8 100%)',
            boxShadow: '0 4px 16px rgba(232, 67, 147, 0.35)',
          }}
          aria-label="upload photo"
        >
          {imageUploading ? (
            <span className="w-4 h-4 rounded-full border-2 border-transparent border-t-white animate-spin block" />
          ) : (
            <Camera size={18} color="#fff" />
          )}
        </button>
      </div>
    </div>
  );
}