"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DailyRow = {
  date: string;
  applications: number;
  faxSent: number;
  reactions: number;
};

export function DailyMetricsChart({ data }: { data: DailyRow[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 4, right: 16, top: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" interval="preserveStartEnd" tickFormatter={(v: string) => v.slice(5)} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="applications" name="申込" stroke="#2563eb" dot={false} />
          <Line type="monotone" dataKey="faxSent" name="FAX 送信" stroke="#10b981" dot={false} />
          <Line type="monotone" dataKey="reactions" name="返信" stroke="#f59e0b" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
