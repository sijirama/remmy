import { motion } from 'framer-motion';
import { Video, Camera, Mic } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const floatingMoments = [
  { icon: Video, time: '2m ago', color: '#7c3aed', x: -340, y: -80, rotate: -8 },
  { icon: Camera, time: 'just now', color: '#a78bfa', x: 300, y: -120, rotate: 6 },
  { icon: Mic, time: '1h ago', color: '#8b5cf6', x: -280, y: 140, rotate: -4 },
  { icon: Camera, time: 'yesterday', color: '#c4b5fd', x: 320, y: 100, rotate: 10 },
];

export default function Landing() {
  const { login } = useAuth();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 overflow-hidden" style={{ background: '#f8f7ff' }}>

      {/* Gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full" style={{ top: '-100px', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, background: 'rgba(139,92,246,0.22)', filter: 'blur(120px)' }} />
        <div className="absolute rounded-full" style={{ bottom: '-60px', left: '10%', width: 400, height: 400, background: 'rgba(167,139,250,0.18)', filter: 'blur(100px)' }} />
        <div className="absolute rounded-full" style={{ top: '20%', right: '5%', width: 300, height: 300, background: 'rgba(196,181,253,0.22)', filter: 'blur(90px)' }} />
      </div>

      {/* Floating moment cards */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {floatingMoments.map(({ icon: Icon, time, color, x, y, rotate }, i) => (
          <motion.div
            key={i}
            className="absolute flex items-center gap-2.5 rounded-2xl px-4 py-3"
            style={{
              x, y, rotate,
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(139,92,246,0.2)',
              boxShadow: '0 4px 24px rgba(139,92,246,0.1)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.9, scale: 1, y: [y, y - 8, y] }}
            transition={{
              opacity: { delay: 0.4 + i * 0.15, duration: 0.6 },
              scale: { delay: 0.4 + i * 0.15, duration: 0.6 },
              y: { delay: 0.4 + i * 0.15, duration: 4 + i * 0.5, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
              <Icon size={14} style={{ color }} />
            </div>
            <div>
              <div className="w-16 h-2 rounded-full mb-1.5" style={{ background: 'rgba(139,92,246,0.25)' }} />
              <div className="text-[10px]" style={{ color: '#a78bfa' }}>{time}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center">

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="leading-none tracking-tighter"
          style={{ fontSize: 68, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#1a1a1a', letterSpacing: '-0.03em' }}
        >
          remmy
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
          style={{ marginTop: 16, color: '#9ca3af', fontSize: 17, lineHeight: 1.6, maxWidth: 420 }}
        >
          moments pass fast. catch them in video, photos, and voice before they're gone.
        </motion.p>

        <motion.button
          onClick={login}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.28 }}
          style={{
            marginTop: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#fff',
            color: '#111',
            padding: '11px 28px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 10,
            border: '1px solid rgba(139,92,246,0.15)',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(139,92,246,0.08)',
          }}
          whileHover={{ scale: 1.02, backgroundColor: '#f8f7ff' }}
          whileTap={{ scale: 0.97 }}
        >
          <GoogleIcon />
          Continue with Google
        </motion.button>

      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 11c5.2 0 9.5 3.3 11 8h12.5C45 8.3 35.5 0 24 0 14.8 0 6.9 5.3 3.1 13l6.4 11.2c1.3-7.4 7.7-13.2 14.5-13.2z" />
      <path fill="#FBBC05" d="M11.3 24l-6.4-11.2C1.8 16.3 0 20 0 24c0 11.1 7.5 20.4 17.7 23.1l6.4-11.2c-7.3-.6-12.8-6.1-12.8-11.9z" />
      <path fill="#34A853" d="M24 37c-5.2 0-9.5-3.3-11-8L6.6 40.2C10.4 44.9 16.8 48 24 48c11.1 0 20.4-7.5 23.1-17.7H34.5c-1.3 3.8-5 6.7-10.5 6.7z" />
      <circle fill="#FFF" cx="24" cy="24" r="12" />
      <circle fill="#4285F4" cx="24" cy="24" r="9" />
    </svg>
  );
}
