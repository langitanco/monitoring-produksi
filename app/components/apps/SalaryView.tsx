// app/components/apps/SalaryView.tsx
//
// Dua model gaji berbeda:
//   1) Produksi Manual (assigned_to/helper_id, per-order, basis komposisi
//      gesut kecil/sedang/besar × rate pricing_configs kategori MANUAL)
//   2) Tim QC/Finishing/Packing (role 'qc', tim tetap — bukan per-order.
//      Basis: total qty SEMUA order selesai Manual+DTF × rate pricing_configs
//      kategori DTF, dibagi rata ke semua user role 'qc')
//
// Rate DTF pakai key_name 'dtf_finishing' & 'dtf_packing', dipilih
// berdasarkan effective_date <= tanggal order (histori-aware).
//
// Fitur cetak & status lunas: tabel `salary_payments` (lihat migration
// sql/2026_09_16_salary_payments.sql — sesuaikan FK ke tabel user Anda).
// Cetak pakai iframe tersembunyi, pola sama dengan handlePrintMassal di
// POPackingList.tsx. Komponen visual slip di SalaryPrintSlip.tsx.

import React, { useState, useEffect, useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createBrowserClient } from "@supabase/ssr";
import { UserData, Order, PricingConfig, GesutEntry } from "@/types";
import {
  ChevronRight,
  Calculator,
  Printer,
  Users,
  CheckSquare,
  Square,
  CheckCircle2,
  Loader2,
  Undo2,
  Pencil,
} from "lucide-react";
import SalaryPrintSlip, { SalarySlipRow } from "./SalaryPrintSlip";
import CustomAlert, { AlertState } from "../ui/CustomAlert";

// Satu baris status pembayaran dari tabel salary_payments.
interface SalaryPayment {
  user_id: string;
  period_month: number;
  period_year: number;
  kategori: "manual" | "qc";
  total_amount: number;
  paid_at: string;
}

interface SalaryViewProps {
  users: UserData[];
  orders: Order[];
  // ── TAMBAHAN ── dibutuhkan utk cek hak akses (canEditOrder/canPrint),
  // pola sama seperti OrderDetail.tsx/OrderDetailHeader.tsx.
  currentUser: UserData;
  // Dipanggil saat tombol Edit diklik. Cara membuka form edit (routing/
  // tab/modal) diserahkan ke komponen induk. Kalau tidak diisi, hanya
  // warning di console.
  onEditOrder?: (order: Order) => void;
}

// Sama seperti pengecekan di OrderDetail.tsx / CreateOrder.tsx / EditOrder.tsx
// — disatukan di sini supaya konsisten.
const isManualJenis = (jenisProduksi?: string) =>
  ["manual", "sablon"].includes((jenisProduksi || "").toLowerCase());

export default function SalaryView({
  users,
  orders,
  currentUser,
  onEditOrder,
}: SalaryViewProps) {
  // ── TAMBAHAN ── Hak akses. Pola sama persis dgn OrderDetail.tsx:
  // supervisor selalu boleh, selain itu ikuti tabel permission di
  // Pengaturan → modul "Gaji & Upah". Kolom Buat dipakai utk "Cetak"
  // (bukan bikin data baru) — sama seperti kolom Buat di modul Produksi
  // dipakai utk "Upload approval" & di Finishing utk "Reset QC".
  const isSupervisor = currentUser.role === "supervisor";
  const perms = currentUser.permissions;
  const canEditOrder = isSupervisor || !!perms?.salary?.edit;
  const canPrint = isSupervisor || !!perms?.salary?.create;

  const handleEditOrder = (order: Order) => {
    if (onEditOrder) {
      onEditOrder(order);
    } else {
      console.warn("SalaryView: prop 'onEditOrder' belum disambungkan.");
    }
  };

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [activeTab, setActiveTab] = useState<"manual" | "dtf">("manual");

  // State untuk filter bulan/tahun
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Centang user untuk dicetak massal (tab Produksi Manual).
  const [printSelectedIds, setPrintSelectedIds] = useState<Set<string>>(
    new Set(),
  );
  const [printing, setPrinting] = useState(false);

  const togglePrintSelect = (userId: string) => {
    setPrintSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // Histori rate pricing_configs, supaya bisa pilih rate yang berlaku
  // pada tanggal order (bukan rate hari ini).
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

  // Status "sudah dibayar" per user per periode (di-refetch tiap ganti bulan/tahun).
  const [payments, setPayments] = useState<Record<string, SalaryPayment>>({});
  const [loadingPayments, setLoadingPayments] = useState(true);
  const paymentKey = (userId: string, kategori: "manual" | "qc") =>
    `${userId}_${kategori}`;

  useEffect(() => {
    const fetchPayments = async () => {
      setLoadingPayments(true);
      const { data } = await supabase
        .from("salary_payments")
        .select("*")
        .eq("period_month", selectedMonth)
        .eq("period_year", selectedYear);
      const map: Record<string, SalaryPayment> = {};
      (data as SalaryPayment[] | null)?.forEach((p) => {
        map[paymentKey(p.user_id, p.kategori)] = p;
      });
      setPayments(map);
      setLoadingPayments(false);
    };
    fetchPayments();
  }, [selectedMonth, selectedYear]);

  const isPaid = (userId: string, kategori: "manual" | "qc") =>
    !!payments[paymentKey(userId, kategori)];

  // Set/lepas checklist "sudah dibayar". Upsert supaya aman diklik ulang.
  const [markingPaidKey, setMarkingPaidKey] = useState<string | null>(null);

  // Modal alert/konfirmasi custom (gantiin window.confirm/alert bawaan browser).
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });
  const closeAlert = () =>
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  const showConfirm = (title: string, message: string, onConfirm: () => void) =>
    setAlertState({ isOpen: true, title, message, type: "confirm", onConfirm });
  const showError = (title: string, message: string) =>
    setAlertState({ isOpen: true, title, message, type: "error" });

  const doMarkPaid = async (
    userId: string,
    kategori: "manual" | "qc",
    amount: number,
  ) => {
    const key = paymentKey(userId, kategori);
    setMarkingPaidKey(key);
    const { data, error } = await supabase
      .from("salary_payments")
      .upsert(
        {
          user_id: userId,
          period_month: selectedMonth,
          period_year: selectedYear,
          kategori,
          total_amount: amount,
          paid_at: new Date().toISOString(),
        },
        { onConflict: "user_id,period_month,period_year,kategori" },
      )
      .select()
      .single();
    setMarkingPaidKey(null);
    if (error || !data) {
      showError(
        "Gagal Menandai Lunas",
        error?.message || "Terjadi kesalahan tak terduga.",
      );
      return;
    }
    setPayments((prev) => ({ ...prev, [key]: data as SalaryPayment }));
  };

  const markPaid = (
    userId: string,
    kategori: "manual" | "qc",
    amount: number,
  ) => {
    showConfirm(
      "Tandai Sudah Dibayar",
      `Tandai gaji sebesar ${currency(amount)} sebagai SUDAH DIBAYAR?`,
      () => doMarkPaid(userId, kategori, amount),
    );
  };

  const doUnmarkPaid = async (userId: string, kategori: "manual" | "qc") => {
    const key = paymentKey(userId, kategori);
    setMarkingPaidKey(key);
    const { error } = await supabase.from("salary_payments").delete().match({
      user_id: userId,
      period_month: selectedMonth,
      period_year: selectedYear,
      kategori,
    });
    setMarkingPaidKey(null);
    if (error) {
      showError("Gagal Membatalkan", error.message);
      return;
    }
    setPayments((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const unmarkPaid = (userId: string, kategori: "manual" | "qc") => {
    showConfirm(
      "Batalkan Status Lunas",
      "Batalkan status lunas? Gunakan ini kalau ternyata gaji belum benar-benar diberikan.",
      () => doUnmarkPaid(userId, kategori),
    );
  };

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

  const manualOrders = useMemo(
    () => filteredOrders.filter((o) => isManualJenis(o.jenis_produksi)),
    [filteredOrders],
  );
  // Basis pool gaji tim QC = SEMUA order selesai (Manual + DTF), karena
  // tim yang sama mengerjakan QC/finishing/packing untuk keduanya.
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

    // Kalau ada Helper: 70% (PJ) / 30% (Helper). Tanpa Helper: PJ 100%.
    const PJ_SHARE_WITH_HELPER = 0.7;
    const HELPER_SHARE = 0.3;

    manualOrders.forEach((order) => {
      // gesutEarnings() = rate per pcs, dikali jumlah baju = total gaji order.
      const ratePerPcs = gesutEarnings(order);
      const totalEarnings = ratePerPcs * (order.jumlah || 0);
      const hasHelper = !!order.helper_id;

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
  // Anggota tim = user role 'qc', tim tetap (tidak pakai assigned_to/helper_id).
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

  const periodLabel = `${new Date(0, selectedMonth).toLocaleString("id-ID", {
    month: "long",
  })} ${selectedYear}`;

  // Cetak satu atau banyak slip sekaligus lewat iframe tersembunyi (pola
  // sama dengan handlePrintMassal di POPackingList.tsx).
  interface SlipToPrint {
    userId: string;
    name: string;
    kategori: "manual" | "qc";
    rows: SalarySlipRow[];
    total: number;
  }

  const printSlips = (slips: SlipToPrint[]) => {
    if (slips.length === 0) {
      showError(
        "Belum Ada yang Dipilih",
        "Pilih minimal satu personil untuk dicetak.",
      );
      return;
    }
    setPrinting(true);

    const pagesHtml = slips
      .map((slip) =>
        renderToStaticMarkup(
          <div className="salary-print-page">
            <SalaryPrintSlip
              companyName="Langitan.co"
              companyAddress="Mandungan, Widang, Tuban, Jawa Timur"
              recipientName={slip.name}
              recipientRoleLabel={
                slip.kategori === "qc" ? "Tim QC & Finishing" : undefined
              }
              kategoriLabel={
                slip.kategori === "manual"
                  ? "Produksi Manual"
                  : "Tim QC & Finishing"
              }
              periodLabel={periodLabel}
              rows={slip.rows}
              totalAmount={slip.total}
              paidAt={payments[paymentKey(slip.userId, slip.kategori)]?.paid_at}
            />
          </div>,
        ),
      )
      .join("");

    const printDocument = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Cetak Slip Gaji</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; }
      .salary-print-page {
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .salary-print-page:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      @page {
        size: 210mm 297mm portrait;
        margin: 0;
      }
    </style>
  </head>
  <body>${pagesHtml}</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const cleanup = () => {
      setPrinting(false);
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 500);
    };

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      setPrinting(false);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      showError(
        "Gagal Menyiapkan Dokumen",
        "Gagal menyiapkan dokumen cetak. Coba lagi.",
      );
      return;
    }

    iframeDoc.open();
    iframeDoc.write(printDocument);
    iframeDoc.close();

    let hasPrinted = false;
    const triggerPrint = () => {
      if (hasPrinted) return;
      hasPrinted = true;
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    };

    iframe.onload = triggerPrint;
    setTimeout(triggerPrint, 400);

    if (iframe.contentWindow) {
      iframe.contentWindow.onafterprint = cleanup;
    }
    setTimeout(cleanup, 5000);
  };

  // Susun baris rincian slip untuk SATU user di tab Produksi Manual, dari
  // data yang sama persis dengan yang tampil di tabel detail kanan.
  const buildManualSlipRows = (
    stat: (typeof userProductionStats)[string],
  ): SalarySlipRow[] =>
    stat.orders.map((item) => {
      const g = item.data.detail_gesut as GesutEntry | null | undefined;
      return {
        label: item.data.kode_produksi,
        detail: `${item.role} · Gesut ${g ? `${g.kecil}/${g.sedang}/${g.besar}` : "—"} · ${new Date(item.data.created_at || "").toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}`,
        qty: item.data.jumlah || 0,
        rate: item.ratePerPcs,
        amount: item.earnings,
      };
    });

  const printSingleManualSlip = (userId: string) => {
    const stat = userProductionStats[userId];
    const user = users.find((u) => u.id === userId);
    if (!stat || !user) return;
    printSlips([
      {
        userId,
        name: user.name,
        kategori: "manual",
        rows: buildManualSlipRows(stat),
        total: stat.totalEarnings,
      },
    ]);
  };

  const printBulkManualSlips = () => {
    const slips: SlipToPrint[] = Array.from(printSelectedIds)
      .map((userId): SlipToPrint | null => {
        const stat = userProductionStats[userId];
        const user = users.find((u) => u.id === userId);
        if (!stat || !user) return null;
        return {
          userId,
          name: user.name,
          kategori: "manual",
          rows: buildManualSlipRows(stat),
          total: stat.totalEarnings,
        };
      })
      .filter((s): s is SlipToPrint => s !== null);
    printSlips(slips);
  };

  // Slip untuk tim QC & Finishing: satu baris ringkasan pool + bagian rata
  // per anggota (bukan per-order, karena memang modelnya dibagi rata).
  const buildDtfSlipRows = (): SalarySlipRow[] => [
    {
      label: "Total Pool Gaji Tim (Manual + DTF)",
      detail: `${dtfSummary.totalOrders} order selesai`,
      qty: dtfSummary.totalQty,
      amount: dtfSummary.totalEarnings,
    },
    {
      label: `Dibagi rata ke ${dtfTeam.length} anggota`,
      amount: dtfSummary.perMember,
    },
  ];

  const printSingleDtfSlip = (userId: string) => {
    const user = dtfTeam.find((u) => u.id === userId);
    if (!user) return;
    printSlips([
      {
        userId,
        name: user.name,
        kategori: "qc",
        rows: buildDtfSlipRows(),
        total: dtfSummary.perMember,
      },
    ]);
  };

  const printBulkDtfSlips = () => {
    const slips: SlipToPrint[] = dtfTeam.map((user) => ({
      userId: user.id,
      name: user.name,
      kategori: "qc" as const,
      rows: buildDtfSlipRows(),
      total: dtfSummary.perMember,
    }));
    printSlips(slips);
  };

  return (
    <>
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
              className={`w-full md:w-90 md:flex-none flex-1 min-h-0 flex flex-col bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 ${selectedUserId ? "hidden md:flex" : "flex"}`}
            >
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">
                  Daftar Personil
                </span>
                {canPrint && (
                  <button
                    onClick={printBulkManualSlips}
                    disabled={printSelectedIds.size === 0 || printing}
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 bg-[#124540] hover:bg-[#0d332f] disabled:opacity-40 text-white rounded-md transition-colors duration-150 shrink-0"
                  >
                    {printing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Printer className="w-3.5 h-3.5" />
                    )}
                    Cetak ({printSelectedIds.size})
                  </button>
                )}
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
                    const paid = isPaid(user.id, "manual");
                    const isChecked = printSelectedIds.has(user.id);

                    return (
                      <div
                        key={user.id}
                        className={`w-full text-left p-3 rounded-lg border transition-colors duration-150 flex items-center gap-2 group
                          ${
                            selectedUserId === user.id
                              ? "bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                              : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                          }`}
                      >
                        {/* Checkbox pilih untuk cetak massal — dipisah dari
                          klik nama supaya klik centang tidak ikut membuka
                          detail user. Disembunyikan kalau user tidak punya
                          hak akses cetak (perms.salary.create). */}
                        {canPrint && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePrintSelect(user.id);
                            }}
                            className="shrink-0 text-zinc-400 hover:text-[#04ae9d] transition-colors duration-150"
                            aria-label="Pilih untuk cetak massal"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-[#04ae9d]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedUserId(user.id)}
                          className="flex-1 min-w-0 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${selectedUserId === user.id ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}
                            >
                              {user.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm flex items-center gap-1.5 truncate">
                                {user.name}
                                {paid && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                )}
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
                                {paid && (
                                  <span className="text-emerald-600 dark:text-emerald-500 font-semibold">
                                    Lunas
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight
                            className={`w-4 h-4 text-zinc-300 group-hover:text-[#04ae9d] shrink-0 ${selectedUserId === user.id ? "text-zinc-500 dark:text-zinc-400" : ""}`}
                          />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* DETAIL PRODUKSI (KANAN) */}
            <div
              className={`w-full bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 flex-1 min-h-0 flex flex-col ${!selectedUserId ? "hidden md:flex" : "flex"}`}
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

                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-2">
                    {canPrint && (
                      <button
                        onClick={() => printSingleManualSlip(selectedUserId)}
                        disabled={printing}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50 transition-colors duration-150"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Cetak Slip
                      </button>
                    )}

                    {isPaid(selectedUserId, "manual") ? (
                      <button
                        onClick={() => unmarkPaid(selectedUserId, "manual")}
                        disabled={
                          markingPaidKey ===
                          paymentKey(selectedUserId, "manual")
                        }
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-950/50 disabled:opacity-50 transition-colors duration-150"
                      >
                        {markingPaidKey ===
                        paymentKey(selectedUserId, "manual") ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Lunas —{" "}
                        {new Date(
                          payments[paymentKey(selectedUserId, "manual")]
                            ?.paid_at,
                        ).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                        })}
                        <span className="inline-flex items-center gap-1 ml-1.5 pl-1.5 border-l border-emerald-300 dark:border-emerald-800 opacity-80">
                          <Undo2 className="w-3 h-3" /> Batalkan
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          markPaid(
                            selectedUserId,
                            "manual",
                            activeUserStats.totalEarnings,
                          )
                        }
                        disabled={
                          markingPaidKey ===
                          paymentKey(selectedUserId, "manual")
                        }
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-[#124540] hover:bg-[#0d332f] text-white rounded-md disabled:opacity-50 transition-colors duration-150"
                      >
                        {markingPaidKey ===
                        paymentKey(selectedUserId, "manual") ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Tandai Sudah Dibayar
                      </button>
                    )}
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto p-0">
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
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                                  {new Date(
                                    item.data.created_at || "",
                                  ).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                  })}
                                </span>
                                {canEditOrder && (
                                  <button
                                    onClick={() => handleEditOrder(item.data)}
                                    className="p-1 text-zinc-400 hover:text-[#04ae9d] transition-colors duration-150"
                                    aria-label="Edit pesanan"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
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
                                  {g
                                    ? `${g.kecil}/${g.sedang}/${g.besar}`
                                    : "—"}
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
                          <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                            Jumlah Pcs
                          </th>
                          <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                            Rate/Pcs
                          </th>
                          <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                            Total Gaji
                          </th>
                          <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                            Aksi
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
                                {(item.data.jumlah || 0).toLocaleString(
                                  "id-ID",
                                )}
                              </td>
                              <td className="p-3 text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-300 text-right">
                                {currency(item.ratePerPcs)}
                              </td>
                              <td className="p-3 text-xs font-mono tabular-nums font-semibold text-zinc-800 dark:text-zinc-200 text-right">
                                {currency(item.earnings)}
                              </td>
                              <td className="p-3 text-right">
                                {canEditOrder && (
                                  <button
                                    onClick={() => handleEditOrder(item.data)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-500 hover:text-[#04ae9d] hover:border-[#04ae9d]/50 transition-colors duration-150"
                                  >
                                    <Pencil className="w-3 h-3" /> Edit
                                  </button>
                                )}
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
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Anggota Tim QC & Finishing ({dtfTeam.length} orang)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">
                    Dibagi rata dari total pool
                  </span>
                  {canPrint && (
                    <button
                      onClick={printBulkDtfSlips}
                      disabled={dtfTeam.length === 0 || printing}
                      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 bg-[#124540] hover:bg-[#0d332f] disabled:opacity-40 text-white rounded-md transition-colors duration-150 shrink-0"
                    >
                      {printing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Printer className="w-3.5 h-3.5" />
                      )}
                      Cetak Semua Slip
                    </button>
                  )}
                </div>
              </div>

              {dtfTeam.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 dark:text-zinc-600 text-xs">
                  Belum ada user dengan role "qc". Tambahkan lewat menu Kelola
                  User.
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {dtfTeam.map((member) => {
                    const paid = isPaid(member.id, "qc");
                    const busy = markingPaidKey === paymentKey(member.id, "qc");
                    return (
                      <div
                        key={member.id}
                        className="p-4 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm flex items-center gap-1.5">
                              {member.name}
                              {paid && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              )}
                            </div>
                            {paid && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-500 font-semibold">
                                Lunas —{" "}
                                {new Date(
                                  payments[paymentKey(member.id, "qc")]
                                    ?.paid_at,
                                ).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="font-mono tabular-nums text-sm font-semibold text-[#04ae9d]">
                            {currency(dtfSummary.perMember)}
                          </div>
                          {canPrint && (
                            <button
                              onClick={() => printSingleDtfSlip(member.id)}
                              disabled={printing}
                              className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50 transition-colors duration-150"
                              aria-label="Cetak slip"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {paid ? (
                            <button
                              onClick={() => unmarkPaid(member.id, "qc")}
                              disabled={busy}
                              className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-950/50 disabled:opacity-50 transition-colors duration-150"
                              aria-label="Batalkan status lunas"
                            >
                              {busy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Undo2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                markPaid(member.id, "qc", dtfSummary.perMember)
                              }
                              disabled={busy}
                              className="p-2 bg-[#124540] hover:bg-[#0d332f] text-white rounded-md disabled:opacity-50 transition-colors duration-150"
                              aria-label="Tandai sudah dibayar"
                            >
                              {busy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Daftar Order Selesai Periode Ini (Manual + DTF)
              </div>
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
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                            {new Date(
                              order.created_at || "",
                            ).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                          {canEditOrder && (
                            <button
                              onClick={() => handleEditOrder(order)}
                              className="p-1 text-zinc-400 hover:text-[#04ae9d] transition-colors duration-150"
                              aria-label="Edit pesanan"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
                          {isManualJenis(order.jenis_produksi)
                            ? "Manual"
                            : "DTF"}
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
                    <th className="p-3 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {finishingOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
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
                        <td className="p-3 text-right">
                          {canEditOrder && (
                            <button
                              onClick={() => handleEditOrder(order)}
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-500 hover:text-[#04ae9d] hover:border-[#04ae9d]/50 transition-colors duration-150"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                          )}
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

      <CustomAlert alertState={alertState} closeAlert={closeAlert} />
    </>
  );
}
