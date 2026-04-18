interface Props {
  habits: string[];
  max?: number;
}

const PASTEL_PALETTE = [
  { bg: '#F0EDFF', color: '#7C6DD8' },
  { bg: '#FCE7F3', color: '#C0527A' },
  { bg: '#E0F2FE', color: '#0369A1' },
  { bg: '#DCFCE7', color: '#15803D' },
  { bg: '#FEF9C3', color: '#A16207' },
  { bg: '#FFE4E6', color: '#BE123C' },
];

// eslint-disable-next-line react-refresh/only-export-components
export function palette(habit: string) {
  let hash = 0;
  for (let i = 0; i < habit.length; i++) hash = habit.charCodeAt(i) + ((hash << 5) - hash);
  return PASTEL_PALETTE[Math.abs(hash) % PASTEL_PALETTE.length];
}

export default function HabitChips({ habits, max = 5 }: Props) {
  return (
    <div 
      className="flex flex-nowrap items-center gap-1.5 overflow-x-auto hide-scrollbar"
      style={{
        maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
        paddingRight: 15,
      }}
    >
      {habits.map(h => {
        const { bg, color } = palette(h);
        return (
          <span
            key={h}
            className="flex-shrink-0 text-[11.5px] font-semibold"
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
  );
}