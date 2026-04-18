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

function palette(habit: string) {
  let hash = 0;
  for (let i = 0; i < habit.length; i++) hash = habit.charCodeAt(i) + ((hash << 5) - hash);
  return PASTEL_PALETTE[Math.abs(hash) % PASTEL_PALETTE.length];
}

export default function HabitChips({ habits, max = 5 }: Props) {
  const visible = habits.slice(0, max);
  const overflow = habits.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map(h => {
        const { bg, color } = palette(h);
        return (
          <span
            key={h}
            className="text-[11.5px] font-semibold"
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
      {overflow > 0 && (
        <span
          className="text-[11.5px] font-semibold"
          style={{
            background: 'rgba(0,0,0,0.04)',
            color: '#aaa',
            padding: '4px 10px',
            borderRadius: 6,
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}