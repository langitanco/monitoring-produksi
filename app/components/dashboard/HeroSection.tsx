import { memo, useMemo } from "react";
import { DashboardStats } from "@/hooks/useDashboard";

// ─── Stat Cell ────────────────────────────────────────────────────────────────

interface StatCellProps {
  label: string;
  value: number;
  hint?: string;
  emphasize?: boolean;
}

function StatCell({ label, value, hint, emphasize }: StatCellProps) {
  return (
    <div className="py-1 px-4 odd:pl-0 md:px-6 md:odd:pl-6 md:first:pl-0">
      <p className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-1.5">
        {label}
      </p>
      <p
        className={`font-mono tabular-nums text-2xl md:text-3xl lg:text-4xl font-semibold leading-none ${
          emphasize
            ? "text-slate-900 dark:text-white"
            : "text-slate-900 dark:text-white"
        }`}
      >
        {value.toLocaleString("id-ID")}
      </p>
      {hint && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
          {hint}
        </p>
      )}
    </div>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

interface HeroSectionProps {
  stats: DashboardStats;
}

const HeroSection = memo(function HeroSection({ stats }: HeroSectionProps) {
  const monthLabel = useMemo(
    () =>
      new Date().toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      }),
    [],
  );

  return (
    <section className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-100/80 dark:bg-slate-900/90 text-slate-900 dark:text-white overflow-hidden transition-colors shadow-sm">
      <div className="p-5 md:p-7">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-2">
              Monitoring Produksi Sablon
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Dashboard Produksi
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Ringkasan performa dan analitik produksi
            </p>
          </div>

          {/* Status pills — solid, kecil, adaptif dengan latar belakang hero */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono tabular-nums text-[11px] px-2.5 py-1 rounded-full border border-slate-300/70 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 shadow-xs">
              {monthLabel}
            </span>
            {stats.trouble > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-600 text-white">
                {stats.trouble} Kendala
              </span>
            )}
            {stats.overdue > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-600 text-white">
                {stats.overdue} Telat
              </span>
            )}
            {stats.warning > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-600 text-white">
                {stats.warning} Urgent
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-200 dark:bg-slate-800 my-5 md:my-6" />

        {/* Grup 1 — Sepanjang masa */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-3">
          Sepanjang masa
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 md:divide-x md:divide-slate-200 dark:md:divide-slate-800 gap-y-4">
          <StatCell label="Total Pesanan" value={stats.totalOrders} />
          <StatCell label="Total PCS" value={stats.totalPcs} />
          <StatCell
            label="On Process"
            value={stats.onProcess}
            hint="Sedang jalan"
          />
          <StatCell label="Selesai" value={stats.selesai} hint="Completed" />
        </div>

        <div className="h-px bg-slate-200 dark:bg-slate-800 my-5" />

        {/* Grup 2 — Bulan ini */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-3">
          Bulan ini · {monthLabel}
        </p>
        <div className="grid grid-cols-2 md:divide-x md:divide-slate-200 dark:md:divide-slate-800 gap-y-4">
          <StatCell label="Pesanan Masuk" value={stats.monthlyOrders} />
          <StatCell label="PCS Terproduksi" value={stats.monthlyPcs} />
        </div>
      </div>
    </section>
  );
});

export default HeroSection;
