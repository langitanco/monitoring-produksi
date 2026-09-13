"use client";

import { useState } from "react";
import { Order } from "@/types";

// Hooks
import { useDashboard } from "@/hooks/useDashboard";
import { useUpdateCheck } from "@/hooks/useUpdateCheck";

// Components
import AnnouncementBanner from "@/app/components/ui/AnnouncementBanner";
import UpdateBanner from "@/app/components/dashboard/UpdateBanner";
import HeroSection from "@/app/components/dashboard/HeroSection";
import ChartBar from "@/app/components/dashboard/ChartBar";
import ChartPie from "@/app/components/dashboard/ChartPie";
import ActionList from "@/app/components/dashboard/ActionList";

// Warna untuk Pie Chart (dipakai juga oleh ChartPie secara internal)
const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"];

interface DashboardProps {
  role: string;
  orders: Order[];
  onSelectOrder: (id: string) => void;
}

export default function Dashboard({
  role,
  orders,
  onSelectOrder,
}: DashboardProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // ── Data & logika (tidak berubah) ─────────────────────────────────────────
  const { stats, monthlyData, productionTypeData, actionItems } =
    useDashboard(orders);

  const { hasUpdate, updateInfo, applyUpdate, dismissUpdate } = useUpdateCheck({
    enableServiceWorker: false,
    enablePolling: true,
    versionUrl: "/api/version",
    pollInterval: 5 * 1000,
  });

  // ── Derived state untuk Pie center label ──────────────────────────────────
  const activeItem =
    activeIndex !== null ? productionTypeData[activeIndex] : null;
  const centerValue = activeItem ? activeItem.value : stats.totalOrders;
  const centerLabel = activeItem ? activeItem.name : "Total order";
  const centerColor = activeItem
    ? COLORS[activeIndex! % COLORS.length]
    : undefined;

  return (
    <div className="space-y-6 pb-10">
      {/* Announcement dari admin */}
      <AnnouncementBanner />

      {/* Notifikasi update versi baru — tampil hanya jika ada update */}
      {hasUpdate && updateInfo && (
        <UpdateBanner
          updateInfo={updateInfo}
          onUpdate={applyUpdate}
          onDismiss={dismissUpdate}
        />
      )}

      {/* Hero stats */}
      <HeroSection stats={stats} />

      {/* Charts — bar chart (deret data) dapat 3/5 kolom, pie 2/5 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        <div className="lg:col-span-3">
          <ChartBar monthlyData={monthlyData} />
        </div>
        <div className="lg:col-span-2">
          <ChartPie
            productionTypeData={productionTypeData}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            centerValue={centerValue}
            centerLabel={centerLabel}
            centerColor={centerColor}
          />
        </div>
      </div>

      {/* Action items */}
      <ActionList actionItems={actionItems} onSelectOrder={onSelectOrder} />
    </div>
  );
}
