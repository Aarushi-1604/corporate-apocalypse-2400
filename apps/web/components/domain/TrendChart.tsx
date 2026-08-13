"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type TrendChartProps = {
  data: { quarter: string; value: number }[];
  label: string;
};

export function TrendChart({ data, label }: TrendChartProps) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-950 p-4">
      <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <XAxis dataKey="quarter" stroke="#666" />
          <YAxis stroke="#666" />
          <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333" }} />
          <Line type="monotone" dataKey="value" stroke="#fff" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}