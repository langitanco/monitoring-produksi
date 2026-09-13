import { memo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import { MonthlyDataPoint } from "@/hooks/useDashboard";

// ─── Custom Tooltip (Responsif terhadap Tema Terang & Gelap) ─────────────────
// 1. Deklarasikan interface kustom untuk Tooltip
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

// 2. Gunakan CustomTooltipProps pada komponen
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-xl transition-colors">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
          {label}
        </p>
        <p className="font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100">
          {`${payload[0].value?.toLocaleString("id-ID")} pcs`}
        </p>
      </div>
    );
  }
  return null;
};

// ─── Component Main ──────────────────────────────────────────────────────────
interface ChartBarProps {
  monthlyData: MonthlyDataPoint[];
}

const ChartBar = memo(function ChartBar({ monthlyData }: ChartBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="bg-white dark:bg-slate-950 p-5 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="mb-5">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base tracking-tight">
          Tren Volume
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Jumlah item masuk · 6 bulan terakhir
        </p>
      </div>

      <div className="h-[220px] md:h-[300px] w-full">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              barCategoryGap="28%"
            >
              <CartesianGrid
                vertical={false}
                className="stroke-slate-200 dark:stroke-slate-800/80"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#94a3b8",
                  fontSize: 10,
                  fontFamily: "ui-monospace, monospace",
                }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={40}
                tick={{
                  fill: "#94a3b8",
                  fontSize: 10,
                  fontFamily: "ui-monospace, monospace",
                }}
              />
              {/* Menggunakan CustomTooltip dengan cursor highlight yang senada */}
              <RechartsTooltip
                cursor={{ fill: "#2589ff", opacity: 0.08 }}
                content={<CustomTooltip />}
              />
              <Bar
                dataKey="pcs"
                fill="#2589ff"
                radius={[2, 2, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
});

export default ChartBar;
