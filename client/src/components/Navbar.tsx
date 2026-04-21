import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageSquare, BarChart3, LogOut } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  showBack?: boolean;
  backTo?: string;
  backLabel?: string;
}

export default function Navbar({ showBack = false, backTo = '/me', backLabel = 'feed' }: NavbarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <motion.div
      className="flex items-center justify-between pt-2 pb-4"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2">
        {showBack ? (
          <button
            onClick={() => navigate(backTo)}
            className="flex items-center gap-1 transition-opacity hover:opacity-60 active:opacity-40"
            style={{ color: '#3a3a42', marginLeft: -2, padding: '6px 6px 6px 0' }}
          >
            <ChevronLeft size={16} strokeWidth={2.2} />
            <span className="text-[13px] font-medium" style={{ letterSpacing: '-0.01em' }}>{backLabel}</span>
          </button>
        ) : (
          <span
            className="text-[18px] font-extrabold tracking-[-0.04em] cursor-pointer"
            style={{ color: '#111' }}
            onClick={() => navigate('/me')}
          >
            remmy
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Chat — plain icon button */}
        <button
          onClick={() => navigate('/chat')}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.05] transition-colors"
          aria-label="chat"
        >
          <MessageSquare size={15} strokeWidth={2} style={{ color: '#636E72' }} />
        </button>

        {/* Insights — heatmap icon button */}
        <button
          onClick={() => navigate('/insights')}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.05] transition-colors"
          aria-label="insights"
        >
          <BarChart3 size={15} strokeWidth={2} style={{ color: '#636E72' }} />
        </button>

        {/* Avatar — Radix DropdownMenu (shadcn-style) */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="w-8 h-8 rounded-full overflow-hidden transition-all ml-1 outline-none data-[state=open]:ring-2 data-[state=open]:ring-[#7C6DD8] data-[state=open]:ring-offset-2"
              style={{ boxShadow: '0 0 0 1.5px rgba(0,0,0,0.08)' }}
              aria-label="account menu"
            >
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.firstName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-[12px] font-semibold"
                  style={{ background: '#f4f4f5', color: '#52525b' }}
                >
                  {user?.firstName?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="shadcn-menu"
              align="end"
              sideOffset={8}
              style={{ width: 224 }}
            >
              <DropdownMenu.Label className="shadcn-label">
                <div className="flex flex-col leading-tight">
                  <span className="text-[13px] font-medium truncate" style={{ color: '#09090b' }}>
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-[12px] font-normal truncate mt-1" style={{ color: '#71717a' }}>
                    {user?.email}
                  </span>
                </div>
              </DropdownMenu.Label>

              <DropdownMenu.Separator className="shadcn-separator" />

              <DropdownMenu.Item className="shadcn-item" onSelect={logout}>
                <LogOut size={14} strokeWidth={2} style={{ color: '#52525b' }} />
                <span>Sign out</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </motion.div>
  );
}
