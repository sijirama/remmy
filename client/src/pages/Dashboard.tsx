import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Mic, Camera, LogOut, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { fetchLogs, fetchLog, uploadAudioLog, uploadImageLog } from '../lib/logs';
import type { Log } from '../lib/types';
import AudioEntry from '../components/feed/AudioEntry';
import ImageEntry from '../components/feed/ImageEntry';

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function fmtDateLabel(d: Date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (toDateStr(d) === toDateStr(today)) return 'today';
  if (toDateStr(d) === toDateStr(yesterday)) return 'yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toLowerCase();
}

function isToday(d: Date) {
  return toDateStr(d) === toDateStr(new Date());
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'still up';
  if (h < 12) return 'good morning';
  if (h < 17) return 'good afternoon';
  if (h < 21) return 'good evening';
  return 'good night';
}

type RecordingState = 'idle' | 'recording' | 'uploading';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [imageUploading, setImageUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLogs = useCallback(async (d: Date) => {
    setLoading(true);
    try {
      const data = await fetchLogs(toDateStr(d));
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs(date);
  }, [date, loadLogs]);

  // Poll to refresh processing logs
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

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [logs]);

  const prevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d);
  };

  const nextDay = () => {
    if (isToday(date)) return;
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d);
  };

  // ── Audio recording ──
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

  // ── Image upload ──
  const handleImageFile = async (file: File) => {
    setImageUploading(true);
    try {
      const res = await uploadImageLog(file);
      const optimistic: Log = {
        id: res.id,
        user_id: user?.id ?? 0,
        type: 'image',
        status: 'processing',
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
    <div className="min-h-screen text-[#111]" style={{ background: '#f8f7ff' }}>

      {/* bg orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-120px] left-[-80px] w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: 'rgba(139,92,246,0.08)' }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-[380px] h-[380px] rounded-full blur-[100px]" style={{ background: 'rgba(167,139,250,0.07)' }} />
        <div className="absolute top-1/2 right-[10%] w-[260px] h-[260px] rounded-full blur-[90px]" style={{ background: 'rgba(196,181,253,0.1)' }} />
      </div>

      {/* hidden image input */}
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

      <div className="relative z-10 flex flex-col items-center min-h-screen px-5 pb-10" style={{ paddingTop: 52 }}>
        <div className="w-full max-w-3xl flex flex-col gap-6">

          {/* ── Top bar ── */}
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif", color: '#1a1a1a' }}>
              remmy
            </span>
            <div className="flex items-center gap-3">
              {user?.profilePicture && (
                <img
                  src={user.profilePicture}
                  alt={user.firstName}
                  className="w-8 h-8 rounded-full object-cover"
                  style={{ boxShadow: '0 0 0 2px rgba(0,0,0,0.08)' }}
                />
              )}
              <button onClick={() => navigate('/chat')} className="transition-colors" style={{ color: '#8b5cf6' }}>
                <MessageCircle size={15} strokeWidth={1.8} />
              </button>
              <button onClick={logout} className="transition-colors" style={{ color: '#9ca3af' }}>
                <LogOut size={15} strokeWidth={1.8} />
              </button>
            </div>
          </motion.div>

          {/* ── Greeting ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            <p className="text-sm mb-1" style={{ color: '#6b7280' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', color: '#1a1a1a' }}>
              <span style={{ color: '#1a1a1a', fontWeight: 300 }}>{greeting()},</span>
              <br />
              {user?.firstName} {user?.lastName}
            </h1>
          </motion.div>

          {/* ── Divider ── */}
          <div style={{ height: 1, background: 'rgba(139,92,246,0.1)' }} />

          {/* ── Date nav + capture ── */}
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.16 }}
          >
            <div className="flex items-center gap-2">
              <button onClick={prevDay} className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/5 active:bg-black/10">
                <ChevronLeft size={16} style={{ color: '#6b7280' }} />
              </button>
              <span className="text-sm font-medium" style={{ color: '#1a1a1a', minWidth: 72, textAlign: 'center' }}>
                {fmtDateLabel(date)}
              </span>
              <button
                onClick={nextDay}
                disabled={isToday(date)}
                className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/5 active:bg-black/10 disabled:opacity-30"
              >
                <ChevronRight size={16} style={{ color: '#6b7280' }} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleMicClick}
                disabled={recordingState === 'uploading'}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                style={{ background: recordingState === 'recording' ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.08)' }}
              >
                {recordingState === 'uploading' ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-transparent border-t-violet-500 animate-spin block" />
                ) : (
                  <Mic size={16} style={{ color: recordingState === 'recording' ? '#ef4444' : '#8b5cf6' }} className={recordingState === 'recording' ? 'animate-pulse' : ''} />
                )}
              </button>
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={imageUploading}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'rgba(139,92,246,0.08)' }}
              >
                {imageUploading ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-transparent border-t-violet-500 animate-spin block" />
                ) : (
                  <Camera size={16} style={{ color: '#8b5cf6' }} />
                )}
              </button>
            </div>
          </motion.div>

          {/* ── Habits strip ── */}
          <AnimatePresence>
            {allHabits.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="-mt-3"
              >
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {allHabits.map(h => (
                    <span
                      key={h}
                      className="flex-shrink-0 text-xs px-3 py-1 rounded-full"
                      style={{ background: 'rgba(139,92,246,0.1)', color: '#7c3aed' }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Feed ── */}
          <div className="flex flex-col gap-3 pb-10">
            {loading ? (
              <>
                {[1, 2].map(i => (
                  <div key={i} className="rounded-2xl px-4 py-4 animate-pulse" style={{ background: '#fff', border: '1px solid rgba(139,92,246,0.1)' }}>
                    <div className="h-3 w-20 rounded-full mb-4" style={{ background: 'rgba(0,0,0,0.06)' }} />
                    <div className="h-2.5 w-full rounded-full mb-2" style={{ background: 'rgba(0,0,0,0.06)' }} />
                    <div className="h-2.5 w-3/4 rounded-full" style={{ background: 'rgba(0,0,0,0.06)' }} />
                  </div>
                ))}
              </>
            ) : logs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 gap-2"
              >
                <p className="text-sm font-medium" style={{ color: '#c4b5fd' }}>
                  nothing here {isToday(date) ? 'yet' : 'that day'}
                </p>
                {isToday(date) && (
                  <p className="text-xs" style={{ color: '#d1d5db' }}>
                    tap 🎙 or 📷 to start logging
                  </p>
                )}
              </motion.div>
            ) : (
              <AnimatePresence initial={false}>
                {[...logs].sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()).map(log => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                  >
                    {log.type === 'audio' ? <AudioEntry log={log} /> : <ImageEntry log={log} />}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
