import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
      <Link to="/me" className="font-bold text-lg tracking-tight">
        remmy
      </Link>
      <div className="flex items-center gap-4">
        {user && (
          <>
            <span className="text-sm text-neutral-400">{user.firstName}</span>
            <button
              onClick={logout}
              className="text-sm text-neutral-500 hover:text-white transition-colors"
            >
              logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
