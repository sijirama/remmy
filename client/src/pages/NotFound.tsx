import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function NotFound() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const destination = !loading && user ? '/me' : '/';

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-6 overflow-hidden" style={{ background: 'var(--bg)' }}>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full" style={{ top: '-100px', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'rgba(108,92,231,0.06)', filter: 'blur(120px)' }} />
        <div className="absolute rounded-full" style={{ bottom: '-60px', right: '10%', width: 300, height: 300, background: 'rgba(232,67,147,0.05)', filter: 'blur(90px)' }} />
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p style={{ fontSize: 80, fontWeight: 800, letterSpacing: '-0.04em', color: '#F0EDFF', lineHeight: 1 }}>
          404
        </p>
        <p style={{ marginTop: 12, fontSize: 15, color: '#636E72' }}>
          this page doesn't exist.
        </p>
        <button
          onClick={() => navigate(destination)}
          style={{
            marginTop: 28,
            padding: '11px 28px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: '#fff',
            color: '#111',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {!loading && user ? 'back to home' : 'go to landing'}
        </button>
      </motion.div>
    </div>
  );
}
