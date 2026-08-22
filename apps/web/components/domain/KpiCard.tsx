type KpiCardProps = {
  label: string;
  value: string | number;
  delta?: number;
};

export function KpiCard({ label, value, delta }: KpiCardProps) {
  const showDelta = delta !== undefined && Math.abs(delta) > 0.01;
  const isUp = (delta ?? 0) > 0;

  return (
    <div className="rounded border border-neutral-800 bg-neutral-950 p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-bold">{value}</p>
        {showDelta && (
          <span className={`text-xs font-semibold ${isUp ? "text-green-500" : "text-red-500"}`}>
            {isUp ? "▲" : "▼"} {Math.abs(delta!).toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}