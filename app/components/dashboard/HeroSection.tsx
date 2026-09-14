import { memo, useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
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
      <p className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400 mb-1.5">
        {label}
      </p>
      <p
        className={`font-mono tabular-nums text-2xl md:text-3xl lg:text-4xl font-semibold leading-none ${
          emphasize
            ? "text-zinc-900 dark:text-white"
            : "text-zinc-900 dark:text-white"
        }`}
      >
        {value.toLocaleString("id-ID")}
      </p>
      {hint && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
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
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateTimeLabel = useMemo(() => {
    const datePart = now.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timePart = now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return `${datePart} · ${timePart}`;
  }, [now]);

  const monthLabel = useMemo(
    () =>
      now.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      }),
    [now],
  );

  return (
    <section className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/80 dark:bg-zinc-900/90 text-zinc-900 dark:text-white overflow-hidden transition-colors shadow-sm">
      <div className="p-5 md:p-7">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 mb-2">
              Monitoring Produksi Sablon
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              Dashboard Produksi
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Ringkasan performa dan analitik produksi
            </p>
          </div>

          {/* Status pills — solid, kecil, adaptif dengan latar belakang hero */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-mono tabular-nums text-[11px] px-2.5 py-1 rounded-full border border-zinc-300/70 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 shadow-xs">
              <Clock className="w-3 h-3 text-zinc-400" strokeWidth={2} />
              {dateTimeLabel}
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
        <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-5 md:my-6" />

        {/* Grup 1 — Sepanjang masa */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400 mb-3">
          Sepanjang masa
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 md:divide-x md:divide-zinc-200 dark:md:divide-zinc-800 gap-y-4">
          <StatCell label="Total Pesanan" value={stats.totalOrders} />
          <StatCell label="Total PCS" value={stats.totalPcs} />
          <StatCell
            label="On Process"
            value={stats.onProcess}
            hint="Sedang jalan"
          />
          <StatCell label="Selesai" value={stats.selesai} hint="Completed" />
        </div>

        <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-5" />

        {/* Grup 2 — Bulan ini */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400 mb-3">
          Bulan ini · {monthLabel}
        </p>
        <div className="grid grid-cols-2 md:divide-x md:divide-zinc-200 dark:md:divide-zinc-800 gap-y-4">
          <StatCell label="Pesanan Masuk" value={stats.monthlyOrders} />
          <StatCell label="PCS Terproduksi" value={stats.monthlyPcs} />
        </div>
      </div>
    </section>
  );
});

export default HeroSection;
