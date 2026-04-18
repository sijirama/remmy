import { motion } from 'framer-motion';
import { Mic, Camera, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const floatingMoments = [
  { icon: Mic, label: 'Voice memo', color: '#6C5CE7', bg: '#F0EDFF', x: -320, y: -90, rotate: -6 },
  { icon: Camera, label: 'Photo', color: '#E84393', bg: '#FFF0F3', x: 300, y: -120, rotate: 5 },
  { icon: MessageCircle, label: 'Chat', color: '#0984E3', bg: '#E8F4FD', x: -260, y: 130, rotate: -3 },
  { icon: Camera, label: 'Memory', color: '#00B894', bg: '#E8FFF3', x: 310, y: 100, rotate: 8 },
];

export default function Landing() {
  const { login } = useAuth();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-6 overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full" style={{ top: '-120px', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, background: 'rgba(108,92,231,0.08)', filter: 'blur(120px)' }} />
        <div className="absolute rounded-full" style={{ bottom: '-80px', left: '10%', width: 400, height: 400, background: 'rgba(162,155,254,0.08)', filter: 'blur(100px)' }} />
        <div className="absolute rounded-full" style={{ top: '20%', right: '5%', width: 300, height: 300, background: 'rgba(232,67,147,0.06)', filter: 'blur(90px)' }} />
      </div>

      {/* Floating cards */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {floatingMoments.map(({ icon: Icon, label, color, bg, x, y, rotate }, i) => (
          <motion.div
            key={i}
            className="absolute flex items-center gap-3 rounded-2xl px-4 py-3.5"
            style={{
              x, y, rotate,
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.85, scale: 1, y: [y, y - 10, y] }}
            transition={{
              opacity: { delay: 0.3 + i * 0.12, duration: 0.5 },
              scale: { delay: 0.3 + i * 0.12, duration: 0.5 },
              y: { delay: 0.3 + i * 0.12, duration: 4 + i * 0.5, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: '#111' }}>{label}</div>
              <div className="text-[10px] font-medium" style={{ color: '#b2bec3' }}>just now</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center">

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="leading-none"
          style={{ fontSize: 72, fontWeight: 800, color: '#111', letterSpacing: '-0.04em' }}
        >
          remmy
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14 }}
          style={{ marginTop: 20, color: '#636E72', fontSize: 17, lineHeight: 1.7, maxWidth: 400 }}
        >
          moments pass fast. catch them in voice, photos, and memories before they're gone.
        </motion.p>

        <motion.button
          onClick={login}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          style={{
            marginTop: 36,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            backgroundColor: '#111',
            color: '#fff',
            padding: '13px 32px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 14,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          }}
          whileHover={{ scale: 1.02, boxShadow: '0 6px 24px rgba(0,0,0,0.16)' }}
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
