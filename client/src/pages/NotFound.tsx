import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function NotFound() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const destination = !loading && user ? '/me' : '/';

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 overflow-hidden" style={{ background: '#f8f7ff' }}>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full" style={{ top: '-100px', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'rgba(139,92,246,0.12)', filter: 'blur(120px)' }} />
        <div className="absolute rounded-full" style={{ bottom: '-60px', right: '10%', width: 300, height: 300, background: 'rgba(196,181,253,0.15)', filter: 'blur(90px)' }} />
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p style={{ fontSize: 80, fontWeight: 800, letterSpacing: '-0.04em', color: '#e5e0ff', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
          404
        </p>
        <p style={{ marginTop: 12, fontSize: 16, color: '#9ca3af' }}>
          this page doesn't exist.
        </p>
        <button
          onClick={() => navigate(destination)}
          style={{
            marginTop: 28,
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 10,
            border: '1px solid rgba(139,92,246,0.2)',
            background: '#fff',
            color: '#7c3aed',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(139,92,246,0.08)',
          }}
        >
          {!loading && user ? 'back to home' : 'go to landing'}
        </button>
      </motion.div>
    </div>
  );
}
