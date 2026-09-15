// app/components/apps/SalaryView.tsx
//
// ── PEROMBAKAN ──
// Sebelumnya file ini menghitung gaji dengan satu model generik: pilih user
// (PJ/Helper) → ketik manual "Rate per Pcs" → dikalikan qty. Itu tidak lagi
// cukup karena sekarang ada DUA model gaji yang berbeda total:
//
//   1) Produksi MANUAL (assigned_to/helper_id, per-order, basis: komposisi
//      gesut kecil/sedang/besar × rate dari pricing_configs kategori MANUAL)
//   2) Tim QC/FINISHING/PACKING (role user 'qc', TETAP — bukan dipilih per
//      order. Basis: total qty SEMUA order selesai dalam periode (Manual +
//      DTF — tim ini mengerjakan QC/finishing/packing untuk keduanya, bukan
//      cuma DTF) × rate finishing+packing dari pricing_configs kategori DTF,
//      lalu dibagi RATA ke semua user berrole 'qc')
//
// Makanya UI dipecah jadi 2 tab: "Produksi Manual" (pola lama, list-user,
// basis gesut — HANYA order Manual) dan "Tim QC & Finishing" (agregat tim,
// basis SEMUA order selesai — lihat catatan desain di percakapan: model ini
// BUKAN "per user per order", dan BUKAN "cuma DTF").
//
// ⚠️ ASUMSI yang perlu diverifikasi ke DB asli:
//   - key_name rate DTF di pricing_configs: 'dtf_finishing' & 'dtf_packing'
//     (lihat sql/2026_09_15_pricing_configs_history_and_dtf.sql)
//   - Rate dipakai berdasarkan effective_date <= tanggal order (created_at),
//     supaya histori gaji bulan lalu tidak berubah kalau harga naik hari ini.

import React, { useState, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { UserData, Order, PricingConfig, GesutEntry } from "@/types";
import { ChevronRight, Calculator, Printer, Users } from "lucide-react";

interface SalaryViewProps {
  users: UserData[];
  orders: Order[];
}

// Sama seperti pengecekan di OrderDetail.tsx / CreateOrder.tsx / EditOrder.tsx
// — disatukan di sini supaya konsisten.
const isManualJenis = (jenisProduksi?: string) =>
  ["manual", "sablon"].includes((jenisProduksi || "").toLowerCase());

export default function SalaryView({ users, orders }: SalaryViewProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // ── TAMBAHAN ── tab: model gaji Manual vs DTF beda total, jadi dipisah.
  const [activeTab, setActiveTab] = useState<"manual" | "dtf">("manual");

  // State untuk filter bulan/tahun
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // ── TAMBAHAN ── histori rate dari pricing_configs (semua baris, semua
  // effective_date — supaya bisa pilih rate yang berlaku pada tanggal order,
  // bukan cuma rate "hari ini").
  const [pricingConfigs, setPricingConfigs] = useState<PricingConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  useEffect(() => {
    const fetchConfigs = async () => {
      const { data } = await supabase
        .from("pricing_configs")
        .select("*")
        .in("category", ["MANUAL", "DTF"]);
      if (data) setPricingConfigs(data as PricingConfig[]);
      setLoadingConfigs(false);
    };
    fetchConfigs();
  }, []);

  // Cari rate suatu key_name yang berlaku pada tanggal tertentu (histori-aware).
  const getRateAt = (keyName: string, dateStr: string): number => {
    const candidates = pricingConfigs.filter(
      (c) => c.key_name === keyName && c.effective_date <= dateStr,
    );
    if (candidates.length === 0) return 0;
    candidates.sort((a, b) => (a.effective_date > b.effective_date ? -1 : 1));
    return candidates[0].value_amount;
  };

  const dateOf = (order: Order) =>
    (order.created_at || new Date().toISOString()).split("T")[0];

  // Total nilai gesut satu order Manual, dihitung dengan rate yang berlaku
  // pada tanggal order tersebut dibuat.
  const gesutEarnings = (order: Order): number => {
    const g = order.detail_gesut as GesutEntry | null | undefined;
    if (!g) return 0;
    const d = dateOf(order);
    const rateKecil = getRateAt("gesut_manual_kecil", d);
    const rateSedang = getRateAt("gesut_manual_sedang", d);
    const rateBesar = getRateAt("gesut_manual_besar", d);
    return g.kecil * rateKecil + g.sedang * rateSedang + g.besar * rateBesar;
  };

  // Filter Order berdasarkan Status Selesai & Periode
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const date = new Date(o.created_at || new Date());
      const isPeriodMatch =
        date.getMonth() === selectedMonth &&
        date.getFullYear() === selectedYear;
      const isCompleted = o.status === "Selesai";
      return isPeriodMatch && isCompleted;
    });
  }, [orders, selectedMonth, selectedYear]);

  // ── TAMBAHAN ── pecah periode jadi dua kelompok jenis produksi, karena
  // model gajinya beda total.
  const manualOrders = useMemo(
    () => filteredOrders.filter((o) => isManualJenis(o.jenis_produksi)),
    [filteredOrders],
  );
  // ── KOREKSI ── Sebelumnya di sini cuma order NON-Manual (dikira tim
  // QC/Finishing cuma kerja di DTF). Itu SALAH — tim yang sama juga
  // mengerjakan QC + finishing + packing untuk order Manual (lihat
  // StepFinishing di OrderDetail.tsx yang dipakai untuk SEMUA jenis order,
  // bukan cuma DTF). Jadi basis pool gaji tim ini = SEMUA order selesai
  // dalam periode, Manual maupun DTF — bukan hanya yang jenisnya DTF.
  const finishingOrders = filteredOrders;

  // ═══════════════════════════════════════════════════════════════════════
  // MODEL 1 — PRODUKSI MANUAL (per user, assigned_to + helper_id)
  // ═══════════════════════════════════════════════════════════════════════
  const userProductionStats = useMemo(() => {
    const stats: Record<
      string,
      {
        totalOrders: number;
        totalQty: number;
        totalEarnings: number;
        orders: {
          data: Order;
          role: "PJ" | "Helper";
          ratePerPcs: number;
          earnings: number;
        }[];
      }
    > = {};

    // ── KOREKSI ── sebelumnya PJ & Helper masing-masing dapat nilai PENUH
    // (dobel). Yang benar (dikonfirmasi): kalau order punya Helper, dipecah
    // 70% (PJ) / 30% (Helper). Kalau tidak ada Helper, PJ dapat 100% penuh.
    const PJ_SHARE_WITH_HELPER = 0.7;
    const HELPER_SHARE = 0.3;

    manualOrders.forEach((order) => {
      // ── KOREKSI ── `gesutEarnings(order)` adalah RATE PER PCS (ongkos
      // nyetak semua screen ke satu baju), BUKAN total gaji order. Total
      // gaji order = rate per pcs × jumlah baju yang diproduksi. Sebelumnya
      // split 70/30 di bawah ini langsung dilakukan dari rate per pcs
      // (tanpa dikali jumlah), sehingga gaji yang tersimpan jauh lebih
      // kecil dari yang seharusnya. Contoh yang sudah dikonfirmasi:
      // rate per pcs Rp3.500 × 100 pcs = Total Gaji order Rp350.000.
      const ratePerPcs = gesutEarnings(order);
      const totalEarnings = ratePerPcs * (order.jumlah || 0);
      const hasHelper = !!order.helper_id;

      // Rate per pcs yang ditampilkan juga ikut dipecah 70/30 supaya di
      // tabel, "Rate/Pcs" × "Jumlah Pcs" tetap menghasilkan "Total Gaji"
      // pada baris yang sama (konsisten secara visual).
      const pjRatePerPcs = hasHelper
        ? ratePerPcs * PJ_SHARE_WITH_HELPER
        : ratePerPcs;
      const helperRatePerPcs = hasHelper ? ratePerPcs * HELPER_SHARE : 0;

      const pjEarnings = hasHelper
        ? totalEarnings * PJ_SHARE_WITH_HELPER
        : totalEarnings;
      const helperEarnings = hasHelper ? totalEarnings * HELPER_SHARE : 0;

      if (order.assigned_to) {
        if (!stats[order.assigned_to]) {
          stats[order.assigned_to] = {
            totalOrders: 0,
            totalQty: 0,
            totalEarnings: 0,
            orders: [],
          };
        }
        stats[order.assigned_to].totalOrders += 1;
        stats[order.assigned_to].totalQty += order.jumlah || 0;
        stats[order.assigned_to].totalEarnings += pjEarnings;
        stats[order.assigned_to].orders.push({
          data: order,
          role: "PJ",
          ratePerPcs: pjRatePerPcs,
          earnings: pjEarnings,
        });
      }

      if (order.helper_id) {
        if (!stats[order.helper_id]) {
          stats[order.helper_id] = {
            totalOrders: 0,
            totalQty: 0,
            totalEarnings: 0,
            orders: [],
          };
        }
        stats[order.helper_id].totalOrders += 1;
        stats[order.helper_id].totalQty += order.jumlah || 0;
        stats[order.helper_id].totalEarnings += helperEarnings;
        stats[order.helper_id].orders.push({
          data: order,
          role: "Helper",
          ratePerPcs: helperRatePerPcs,
          earnings: helperEarnings,
        });
      }
    });

    return stats;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualOrders, pricingConfigs]);

  const activeUserStats = selectedUserId
    ? userProductionStats[selectedUserId]
    : null;
  const activeUserDetail = users.find((u) => u.id === selectedUserId);

  // ═══════════════════════════════════════════════════════════════════════
  // MODEL 2 — TIM FINISHING / DTF (agregat, dibagi rata)
  // ═══════════════════════════════════════════════════════════════════════
  // ── KOREKSI ── role 'qc' yang sudah ada dari awal itu memang sudah
  // dipakai untuk tim yang sama (QC + finishing + packing sekaligus, satu
  // tim, gaji digabung per-pcs) — jadi bukan role baru 'finishing'.
  // Anggota tim = user dengan role 'qc'. Ini tim TETAP, bukan dipilih
  // per-order — jadi TIDAK memakai assigned_to/helper_id sama sekali.
  const dtfTeam = useMemo(() => users.filter((u) => u.role === "qc"), [users]);

  const dtfSummary = useMemo(() => {
    let totalQty = 0;
    let totalEarnings = 0;

    finishingOrders.forEach((order) => {
      const d = dateOf(order);
      const rateFinishing = getRateAt("dtf_finishing", d);
      const ratePacking = getRateAt("dtf_packing", d);
      totalQty += order.jumlah || 0;
      totalEarnings += (order.jumlah || 0) * (rateFinishing + ratePacking);
    });

    const perMember = dtfTeam.length > 0 ? totalEarnings / dtfTeam.length : 0;

    return {
      totalOrders: finishingOrders.length,
      totalQty,
      totalEarnings,
      perMember,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishingOrders, dtfTeam, pricingConfigs]);

  const currency = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

  return (
    <div className="h-full min-h-0 flex flex-col space-y-4">
      {/* HEADER & FILTER */}
      <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:justify-between md:items-center items-stretch gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Manajemen Gaji Produksi
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Rekap gaji berdasarkan pesanan status "Selesai".
          </p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg w-full md:w-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="flex-1 md:flex-none bg-transparent text-sm font-semibold text-zinc-700 dark:text-zinc-200 p-2.5 md:p-2 outline-none cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {new Date(0, i).toLocaleString("id-ID", { month: "long" })}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="flex-1 md:flex-none bg-transparent text-sm font-semibold text-zinc-700 dark:text-zinc-200 p-2.5 md:p-2 outline-none cursor-pointer border-l border-zinc-300 dark:border-zinc-700 pl-2"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── TAMBAHAN ── TAB SWITCH: model gaji Manual vs DTF beda total */}
      <div className="flex gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg w-full md:w-fit">
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-150 ${
            activeTab === "manual"
              ? "bg-white dark:bg-zinc-950 text-[#124540] dark:text-[#49BFB4] shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          Produksi Manual
        </button>
        <button
          onClick={() => setActiveTab("dtf")}
          className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-150 ${
            activeTab === "dtf"
              ? "bg-white dark:bg-zinc-950 text-[#124540] dark:text-[#49BFB4] shadow-sm"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          }`}
        >
          Tim QC & Finishing
        </button>
      </div>

      {loadingConfigs ? (
        <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
          Memuat konfigurasi harga...
        </div>
      ) : activeTab === "manual" ? (
        // ═══════════════════════════════ TAB: PRODUKSI MANUAL ═══════════════════════════════
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 overflow-hidden">
          {/* LIST USER (KIRI) */}
          <div
            className={`w-full md:w-1/3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 flex-1 min-h-0 flex flex-col ${selectedUserId ? "hidden md:flex" : "flex"}`}
          >
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
              Daftar Personil
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {users.filter((u) => userProductionStats[u.id]).length === 0 ? (
                <div className="text-center p-8 text-zinc-400 dark:text-zinc-600 text-xs">
                  Tidak ada data produksi manual selesai pada periode ini.
                </div>
              ) : (
                users.map((user) => {
                  const stat = userProductionStats[user.id];
                  if (!stat) return null;

                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors duration-150 flex items-center justify-between group
                          ${
                            selectedUserId === user.id
                              ? "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                          }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${selectedUserId === user.id ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}
                        >
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm">
                            {user.name}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 flex gap-2">
                            <span>
                              <span className="font-mono tabular-nums">
                                {stat.totalOrders}
                              </span>{" "}
                              Job
                            </span>
                            <span>
                              <span className="font-mono tabular-nums">
                                {stat.totalQty}
                              </span>{" "}
                              Pcs
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-zinc-300 group-hover:text-[#04ae9d] ${selectedUserId === user.id ? "text-zinc-500 dark:text-zinc-400" : ""}`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* DETAIL PRODUKSI (KANAN) */}
          <div
            className={`w-full md:w-2/3 bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 flex-1 min-h-0 flex flex-col ${!selectedUserId ? "hidden md:flex" : "flex"}`}
          >
            {selectedUserId && activeUserStats ? (
              <>
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-zinc-50 dark:bg-zinc-900 rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedUserId(null)}
                      className="md:hidden p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-md transition-colors duration-150 shrink-0"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </button>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {activeUserDetail?.name}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Rincian Produksi:{" "}
                        {new Date(0, selectedMonth).toLocaleString("id-ID", {
                          month: "long",
                        })}{" "}
                        {selectedYear}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right pl-10 sm:pl-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                      Total Produksi
                    </div>
                    <div className="font-mono tabular-nums text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      {activeUserStats.totalQty.toLocaleString("id-ID")}{" "}
                      <span className="text-xs font-normal text-zinc-400">
                        Pcs
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── PEROMBAKAN ── dulu "Simulasi Gaji" pakai rate manual
                    diketik tangan. Sekarang dihitung otomatis dari komposisi
                    gesut tiap order × rate pricing_configs (histori-aware). */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      Total Gaji (dari komposisi gesut):
                    </span>
                  </div>
                  <div className="px-3 py-1.5 bg-white dark:bg-zinc-950 text-[#04ae9d] font-mono tabular-nums font-semibold rounded-lg text-sm border border-zinc-200 dark:border-zinc-800 sm:min-w-[140px] text-right self-stretch sm:self-auto">
                    {currency(activeUserStats.totalEarnings)}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-0">
                  {/* ── TAMBAHAN ── versi kartu untuk layar mobile (di bawah
                      md). Tabel 7 kolom terlalu sempit untuk layar HP, jadi
                      di mobile datanya ditata sebagai kartu per-order —
                      fungsi dan datanya sama persis dengan tabel desktop. */}
                  <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                    {activeUserStats.orders.map((item, index) => {
                      const g = item.data.detail_gesut as
                        | GesutEntry
                        | null
                        | undefined;
                      return (
                        <div key={index} className="p-4 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono tabular-nums font-semibold text-zinc-700 dark:text-zinc-300">
                              {item.data.kode_produksi}
                            </span>
                            <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                              {new Date(
                                item.data.created_at || "",
                              ).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${
                                item.role === "PJ"
                                  ? "border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200"
                                  : "border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500"
                              }`}
                            >
                              {item.role}{" "}
                              {item.role === "PJ" && !item.data.helper_id
                                ? "(100%)"
                                : item.role === "PJ"
                                  ? "(70%)"
                                  : "(30%)"}
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              Gesut (K/S/B):{" "}
                              <span className="font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                                {g ? `${g.kecil}/${g.sedang}/${g.besar}` : "—"}
                              </span>
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-1">
                            <div>
                              <div className="text-[9px] uppercase tracking-wide text-zinc-400">
                                Jumlah Pcs
                              </div>
                              <div className="text-xs font-mono tabular-nums font-semibold text-zinc-700 dark:text-zinc-300">
                                {(item.data.jumlah || 0).toLocaleString(
                                  "id-ID",
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] uppercase tracking-wide text-zinc-400">
                                Rate/Pcs
                              </div>
                              <div className="text-xs font-mono tabular-nums font-semibold text-zinc-700 dark:text-zinc-300">
                                {currency(item.ratePerPcs)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] uppercase tracking-wide text-zinc-400">
                                Total Gaji
                              </div>
                              <div className="text-xs font-mono tabular-nums font-semibold text-[#04ae9d]">
                                {currency(item.earnings)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Versi tabel untuk layar md ke atas — sama persis
                      datanya dengan kartu mobile di atas. */}
                  <table className="w-full text-left border-collapse hidden md:table">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 z-10">
                      <tr>
                        <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Tanggal
                        </th>
                        <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Kode
                        </th>
                        <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Peran
                        </th>
                        <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                          Gesut (K/S/B)
                        </th>
                        {/* ── TAMBAHAN ── */}
                        <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                          Jumlah Pcs
                        </th>
                        {/* ── TAMBAHAN ── sebelumnya kolom ini bernama "Gaji"
                            tapi isinya sudah nominal per-baris (rate × share
                            role). Dipisah jadi dua kolom biar transparan:
                            rate per pcs dulu, baru total hasil kali dengan
                            jumlah pcs. */}
                        <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                          Rate/Pcs
                        </th>
                        <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                          Total Gaji
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {activeUserStats.orders.map((item, index) => {
                        const g = item.data.detail_gesut as
                          | GesutEntry
                          | null
                          | undefined;
                        return (
                          <tr
                            key={index}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors duration-150"
                          >
                            <td className="p-3 text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                              {new Date(
                                item.data.created_at || "",
                              ).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </td>
                            <td className="p-3 text-xs font-mono tabular-nums font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                              {item.data.kode_produksi}
                            </td>
                            <td className="p-3">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${
                                  item.role === "PJ"
                                    ? "border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200"
                                    : "border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500"
                                }`}
                              >
                                {item.role}{" "}
                                {item.role === "PJ" && !item.data.helper_id
                                  ? "(100%)"
                                  : item.role === "PJ"
                                    ? "(70%)"
                                    : "(30%)"}
                              </span>
                            </td>
                            <td className="p-3 text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-300">
                              {g ? `${g.kecil}/${g.sedang}/${g.besar}` : "—"}
                            </td>
                            {/* ── PERBAIKAN ── ini jumlah pesanan (order.jumlah),
                                bukan total gesut — sesuai maksud Anda. */}
                            <td className="p-3 text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-300 text-right">
                              {(item.data.jumlah || 0).toLocaleString("id-ID")}
                            </td>
                            <td className="p-3 text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-300 text-right">
                              {currency(item.ratePerPcs)}
                            </td>
                            <td className="p-3 text-xs font-mono tabular-nums font-semibold text-zinc-800 dark:text-zinc-200 text-right">
                              {currency(item.earnings)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-600 p-8 text-center">
                <Printer className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm font-semibold">
                  Pilih User di sebelah kiri
                </p>
                <p className="text-xs max-w-xs mx-auto mt-2">
                  Klik nama user untuk melihat detail produksi (PJ & Helper)
                  yang telah dikerjakan dan gaji yang dihitung dari komposisi
                  gesut.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // ═══════════════════════════════ TAB: TIM FINISHING (DTF) ═══════════════════════════════
        // Model agregat: TIDAK per-user-per-order. Total SEMUA order selesai
        // (Manual + DTF) dalam periode dijumlahkan dulu, baru dibagi rata ke
        // semua anggota tim (role 'qc') — tim ini kerja QC/finishing/packing
        // untuk kedua jenis produksi, bukan cuma DTF.
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">
                Order Selesai (Semua Jenis)
              </div>
              <div className="font-mono tabular-nums text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                {dtfSummary.totalOrders}
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">
                Total Qty
              </div>
              <div className="font-mono tabular-nums text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                {dtfSummary.totalQty.toLocaleString("id-ID")}{" "}
                <span className="text-xs font-normal text-zinc-400">Pcs</span>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">
                Total Pool Gaji Tim
              </div>
              <div className="font-mono tabular-nums text-xl font-semibold text-[#04ae9d]">
                {currency(dtfSummary.totalEarnings)}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Anggota Tim QC & Finishing ({dtfTeam.length} orang)
                </span>
              </div>
              <span className="text-xs text-zinc-400">
                Dibagi rata dari total pool
              </span>
            </div>

            {dtfTeam.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 dark:text-zinc-600 text-xs">
                Belum ada user dengan role "qc". Tambahkan lewat menu Kelola
                User.
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {dtfTeam.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                        {member.name.charAt(0)}
                      </div>
                      <div className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm">
                        {member.name}
                      </div>
                    </div>
                    <div className="font-mono tabular-nums text-sm font-semibold text-[#04ae9d]">
                      {currency(dtfSummary.perMember)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Daftar Order Selesai Periode Ini (Manual + DTF)
            </div>

            {/* ── TAMBAHAN ── versi kartu untuk mobile — data sama persis
                dengan tabel di layar md ke atas. */}
            <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
              {finishingOrders.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 dark:text-zinc-600 text-xs">
                  Tidak ada order selesai pada periode ini.
                </div>
              ) : (
                finishingOrders.map((order) => (
                  <div key={order.id} className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono tabular-nums font-semibold text-zinc-700 dark:text-zinc-300">
                        {order.kode_produksi}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                        {new Date(order.created_at || "").toLocaleDateString(
                          "id-ID",
                          { day: "2-digit", month: "short" },
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-800 dark:text-zinc-200">
                        {order.nama_pemesan}
                      </span>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide shrink-0 ${
                          isManualJenis(order.jenis_produksi)
                            ? "border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200"
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        {isManualJenis(order.jenis_produksi) ? "Manual" : "DTF"}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Qty:{" "}
                      <span className="font-mono tabular-nums font-semibold text-zinc-700 dark:text-zinc-300">
                        {order.jumlah}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Versi tabel untuk layar md ke atas */}
            <table className="w-full text-left border-collapse hidden md:table">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Kode
                  </th>
                  <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Jenis
                  </th>
                  <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Pemesan
                  </th>
                  <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                    Qty
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {finishingOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-zinc-400 dark:text-zinc-600 text-xs"
                    >
                      Tidak ada order selesai pada periode ini.
                    </td>
                  </tr>
                ) : (
                  finishingOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors duration-150"
                    >
                      <td className="p-3 text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        {new Date(order.created_at || "").toLocaleDateString(
                          "id-ID",
                          { day: "2-digit", month: "short" },
                        )}
                      </td>
                      <td className="p-3 text-xs font-mono tabular-nums font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {order.kode_produksi}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${
                            isManualJenis(order.jenis_produksi)
                              ? "border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200"
                              : "border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500"
                          }`}
                        >
                          {isManualJenis(order.jenis_produksi)
                            ? "Manual"
                            : "DTF"}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-zinc-800 dark:text-zinc-200">
                        {order.nama_pemesan}
                      </td>
                      <td className="p-3 text-xs font-mono tabular-nums font-semibold text-zinc-800 dark:text-zinc-200 text-right">
                        {order.jumlah}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
