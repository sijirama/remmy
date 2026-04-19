import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, BarChart3, Info } from 'lucide-react';
import { getHeatmapData, type HeatmapDay } from '../lib/metrics';

const Insights = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<HeatmapDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHeatmapData()
      .then(setData)
      .catch((err) => console.error('Failed to load heatmap:', err))
      .finally(() => setLoading(false));
  }, []);

  const getDayColor = (score: number) => {
    if (score === 0) return 'rgba(0,0,0,0.03)';

    // Pastel Scale 1-10
    if (score <= 2) return '#FCA5A5'; // rose-300
    if (score <= 4) return '#FDBA74'; // orange-300
    if (score <= 6) return '#FCD34D'; // amber-300
    if (score <= 8) return '#6EE7B7'; // emerald-300
    return '#67E8F9'; // cyan-300
  };

  // Generate last 12 months (rolling)
  const months = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    // Current month first (April 2026), followed by March 2026, etc.
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(d);
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    // For current month, stop at today. For past months, show full month.
    const endBound = isCurrentMonth ? now : lastDay;

    const days = [];
    for (let d = new Date(firstDay); d <= endBound; d.setDate(d.getDate() + 1)) {
      days.unshift(new Date(d));
    }
    return days;
  };

  const findDayData = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const s = `${y}-${m}-${d}`;
    return data.find(item => {
      // API returns YYYY-MM-DD
      const logDate = item.date.split('T')[0];
      return logDate === s;
    });
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Decorative Blobs (from Chat style) */}
      <div aria-hidden className="pointer-events-none absolute" style={{ top: '20%', right: -100, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(162,155,254,0.15) 0%, rgba(162,155,254,0) 70%)', filter: 'blur(60px)', zIndex: 0 }} />
      <div aria-hidden className="pointer-events-none absolute" style={{ top: '45%', left: -140, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,67,147,0.1) 0%, rgba(232,67,147,0) 70%)', filter: 'blur(70px)', zIndex: 0 }} />

      <div className="relative w-[90%] sm:w-full max-w-xl md:max-w-4xl mx-auto flex flex-col h-full">
        <div className="block sm:hidden h-6 w-full flex-shrink-0" />

        {/* ── Navbar ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between sm:px-4 sm:mt-8"
          style={{
            height: 56,
            background: 'rgba(250,250,250,0.92)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderBottom: 'none',
            position: 'relative',
            zIndex: 20,
          }}
        >
          <button
            onClick={() => navigate('/me')}
            className="flex items-center gap-1 transition-opacity hover:opacity-60 active:opacity-40"
            style={{ color: '#3a3a42', marginLeft: -2, padding: '6px 6px 6px 0' }}
          >
            <ChevronLeft size={16} strokeWidth={2.2} />
            <span className="text-[13px] font-medium" style={{ letterSpacing: '-0.01em' }}>feed</span>
          </button>

          <button
            onClick={() => navigate('/me')}
            className="text-[17px] font-extrabold transition-opacity hover:opacity-70"
            style={{ color: '#111', letterSpacing: '-0.04em' }}
          >
            remmy
          </button>

          <div style={{ width: 56 }} />
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto hide-scrollbar pb-32">
          {/* Spacer to force content down */}
          <div className="h-5 sm:h-8 w-full flex-shrink-0" />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-10"
          >
            {/* Legend at Top */}
            <div className="sm:mx-4 mb-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-bold uppercase tracking-tight text-[#b8b8c0]">Low</span>
                <div className="flex-1 flex gap-1 h-2">
                  {[2, 4, 6, 8, 10].map(s => (
                    <div key={s} className="flex-1 rounded-full" style={{ background: getDayColor(s) }} />
                  ))}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight text-[#b8b8c0]">High</span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center pt-20">
                <span className="w-5 h-5 rounded-full border-[1.5px] border-transparent animate-spin block" style={{ borderTopColor: '#111', borderRightColor: 'rgba(0,0,0,0.15)' }} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-8 sm:px-4">
                {months.map((month, idx) => (
                  <div key={idx} className="space-y-0">
                    <div className="h-5 w-full" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold uppercase tracking-[0.1em]" style={{ color: '#c8d0d8' }}>
                        {month.toLocaleDateString('en-US', { month: 'long' })}
                      </span>
                      <span className="text-[9px] font-bold tabular-nums" style={{ color: '#d1d1d6' }}>{month.getFullYear()}</span>
                    </div>
                    <div className="h-3 w-full" />

                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5 px-0.5">
                      {getDaysInMonth(month).map((day, dIdx) => {
                        const dayData = findDayData(day);
                        return (
                          <motion.div
                            key={dIdx}
                            title={dayData ? `${day.toLocaleDateString()}: Mood ${dayData.avg_mood.toFixed(1)}` : day.toLocaleDateString()}
                            className="aspect-square rounded-[18%]"
                            style={{
                              background: getDayColor(dayData?.avg_mood ?? 0),
                              transition: 'background 0.3s ease',
                              cursor: dayData ? 'help' : 'default'
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 sm:mx-4 opacity-50">
              <Info size={11} className="text-[#6C5CE7]" />
              <p className="text-[10px] font-medium" style={{ color: '#636E72' }}>Daily average mood updated automatically.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
