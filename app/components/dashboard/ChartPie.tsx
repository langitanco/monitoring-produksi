import { memo, useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ProductionTypeDataPoint } from "@/hooks/useDashboard";

// Warna disesuaikan dengan referensi gambar (Sablon: Biru, Bordir: Merah, DTF: Kuning)
const COLORS = ["#2589ff", "#f4435e", "#e4e596"];

interface ChartPieProps {
  productionTypeData: ProductionTypeDataPoint[];
  activeIndex: number | null;
  setActiveIndex: (index: number | null) => void;
  centerValue: number;
  centerLabel: string;
  centerColor?: string;
}

const ChartPie = memo(function ChartPie({
  productionTypeData,
  activeIndex,
  setActiveIndex,
  centerValue,
  centerLabel,
  centerColor,
}: ChartPieProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const total = useMemo(
    () => productionTypeData.reduce((sum, d) => sum + d.value, 0),
    [productionTypeData],
  );

  // 1. Ambil data item yang sedang di-hover (jika ada)
  const activeData =
    activeIndex !== null ? productionTypeData[activeIndex] : null;

  // 2. Tentukan nilai, label, dan warna secara dinamis
  const displayValue = activeData ? activeData.value : centerValue;
  const displayLabel = activeData ? activeData.name : centerLabel;
  const displayColor =
    activeIndex !== null ? COLORS[activeIndex % COLORS.length] : centerColor;

  return (
    <div className="bg-white dark:bg-slate-950 p-5 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base tracking-tight">
          Jenis Produksi
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Distribusi tipe order keseluruhan
        </p>
      </div>

      <div className="relative h-[190px] md:h-[220px]">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={productionTypeData}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                stroke="none"
              >
                {productionTypeData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    opacity={
                      activeIndex === null || activeIndex === index ? 1 : 0.35
                    }
                    className="transition-opacity duration-200 cursor-pointer"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Center label & value yang sekarang sudah terhubung dengan state hover */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="font-mono tabular-nums text-2xl md:text-3xl font-semibold transition-colors duration-200 text-slate-900 dark:text-white"
            style={displayColor ? { color: displayColor } : undefined}
          >
            {displayValue.toLocaleString("id-ID")}
          </span>
          <span className="text-[9px] md:text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold mt-1 transition-colors duration-200">
            {displayLabel}
          </span>
        </div>
      </div>

      {/* Legend kustom */}
      <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/70 border-t border-slate-100 dark:border-slate-800/70">
        {productionTypeData.map((entry, index) => {
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          const isActive = activeIndex === index;
          const itemColor = COLORS[index % COLORS.length];

          return (
            <li key={entry.name}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                className={`w-full flex items-center gap-2.5 py-2 text-left transition-colors duration-150 ${
                  isActive ? "bg-slate-50 dark:bg-slate-900" : ""
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: itemColor }}
                />
                <span
                  className="text-xs flex-1 truncate transition-colors duration-150 text-slate-600 dark:text-slate-300"
                  style={isActive ? { color: itemColor } : undefined}
                >
                  {entry.name}
                </span>
                <span
                  className="font-mono tabular-nums text-xs font-semibold transition-colors duration-150 text-slate-900 dark:text-slate-100"
                  style={isActive ? { color: itemColor } : undefined}
                >
                  {entry.value.toLocaleString("id-ID")}
                </span>
                <span className="font-mono tabular-nums text-[10px] text-slate-400 w-9 text-right">
                  {pct}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

export default ChartPie;
