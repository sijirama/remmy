const PASTEL_COLORS = [
  { bg: '#F0EDFF', text: '#7C6DD8' },
  { bg: '#FFF0F3', text: '#D4457A' },
  { bg: '#FFF8E1', text: '#C4793E' },
  { bg: '#EDFCF4', text: '#2D9D6E' },
  { bg: '#EEF4FB', text: '#4A8DC7' },
  { bg: '#FFF2EC', text: '#C06030' },
];

function hashColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length];
}

interface Props {
  habits: string[];
  max?: number;
}

export default function HabitChips({ habits, max }: Props) {
  if (!habits || habits.length === 0) return null;

  const visible = max ? habits.slice(0, max) : habits;
  const overflow = max ? habits.length - max : 0;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((h) => {
        const color = hashColor(h);
        return (
          <span
            key={h}
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full leading-none tracking-tight"
            style={{ background: color.bg, color: color.text }}
          >
            <span
              className="w-1 h-1 rounded-full flex-shrink-0"
              style={{ background: color.text, opacity: 0.5 }}
            />
            {h}
          </span>
        );
      })}
      {overflow > 0 && (
        <span
          className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full leading-none"
          style={{ background: 'rgba(0,0,0,0.05)', color: '#aaa' }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
