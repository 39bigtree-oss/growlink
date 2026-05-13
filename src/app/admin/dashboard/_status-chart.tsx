"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type StatusChartData = Array<{ label: string; count: number }>;

export function StatusBreakdownChart({ data }: { data: StatusChartData }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickLine={false} />
          <YAxis allowDecimals={false} stroke="#6b7280" fontSize={11} tickLine={false} />
          <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
