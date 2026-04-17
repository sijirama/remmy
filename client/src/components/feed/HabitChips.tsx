interface Props {
  habits: string[];
}

export default function HabitChips({ habits }: Props) {
  if (!habits || habits.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {habits.map((h) => (
        <span
          key={h}
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(139,92,246,0.1)', color: '#7c3aed' }}
        >
          {h}
        </span>
      ))}
    </div>
  );
}
