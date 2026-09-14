// app/components/apps/WeeklyNotesView.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  MessageSquare,
  Printer,
} from "lucide-react";
import jsPDF from "jspdf";

interface ProductionNote {
  id: string;
  order_id: string;
  kode_produksi: string;
  nama_pemesan: string;
  content: string;
  section: string;
  created_by_name: string;
  created_at: string;
}

interface OrderNotes {
  order_id: string;
  kode_produksi: string;
  nama_pemesan: string;
  sections: {
    produksi: ProductionNote[];
    finishing: ProductionNote[];
    pengiriman: ProductionNote[];
  };
}

const SECTION_LABELS: Record<string, string> = {
  produksi: "Produksi",
  finishing: "QC & Finishing",
  pengiriman: "Pengiriman",
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ─── Generate PDF ─────────────────────────────────────────────────────────────

function generatePDF(
  orderNotesList: OrderNotes[],
  filterWeek: "this" | "last" | "all",
  action: "download" | "print",
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;
  let y = 20;

  const periodLabels = {
    this: "Minggu Ini",
    last: "Minggu Lalu",
    all: "Semua Waktu",
  };

  const checkNewPage = (needed: number) => {
    if (y + needed > 280) {
      doc.addPage();
      y = 20;
    }
  };

  // ── Header laporan ────────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Laporan Catatan Produksi", marginL, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(
    `Langitan.co  ·  Periode: ${periodLabels[filterWeek]}  ·  Dicetak: ${formatTime(new Date().toISOString())}`,
    marginL,
    y,
  );
  y += 4;

  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 6;

  const totalNotes = orderNotesList.reduce(
    (acc, o) =>
      acc +
      o.sections.produksi.length +
      o.sections.finishing.length +
      o.sections.pengiriman.length,
    0,
  );

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `${orderNotesList.length} pesanan  ·  ${totalNotes} catatan`,
    marginL,
    y,
  );
  y += 8;

  // ── Per pesanan ───────────────────────────────────────────────────────────
  orderNotesList.forEach((order, orderIdx) => {
    checkNewPage(20);

    // Nama & kode pesanan
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text(`${orderIdx + 1}. ${order.nama_pemesan}`, marginL, y);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(140);
    doc.text(`#${order.kode_produksi}`, marginL + 4, y + 5);
    y += 12;

    // Per section
    (["produksi", "finishing", "pengiriman"] as const).forEach((sec) => {
      const notes = order.sections[sec];

      checkNewPage(14);

      // Label section
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80);
      doc.text(SECTION_LABELS[sec].toUpperCase(), marginL + 4, y);
      y += 5;

      if (notes.length === 0) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(180);
        doc.text("Tidak ada catatan", marginL + 8, y);
        y += 6;
      } else {
        notes.forEach((note) => {
          // Wrap teks catatan
          const lines = doc.splitTextToSize(`• ${note.content}`, contentW - 12);
          checkNewPage(lines.length * 5 + 8);

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(40);
          doc.text(lines, marginL + 8, y);
          y += lines.length * 5;

          // Meta: nama & waktu
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(150);
          doc.text(
            `${note.created_by_name}  ·  ${formatTime(note.created_at)}`,
            marginL + 10,
            y,
          );
          y += 6;
        });
      }
    });

    // Garis pemisah antar pesanan
    if (orderIdx < orderNotesList.length - 1) {
      checkNewPage(6);
      doc.setDrawColor(220);
      doc.setLineWidth(0.2);
      doc.line(marginL, y, pageW - marginR, y);
      y += 6;
    }
  });

  // ── Footer per halaman ────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180);
    doc.text("Langitan.co  ·  Sistem Produksi", marginL, 290);
    doc.text(`Hal ${i} / ${totalPages}`, pageW - marginR - 15, 290);
  }

  // ── Output ────────────────────────────────────────────────────────────────
  if (action === "download") {
    const filename = `Catatan-Produksi-${periodLabels[filterWeek].replace(" ", "-")}-${new Date().toLocaleDateString("id-ID").replace(/\//g, "-")}.pdf`;
    doc.save(filename);
  } else {
    // Print: buka di tab baru lalu trigger dialog print
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 2000);
    };
  }
}

// ─── Komponen: satu baris section ────────────────────────────────────────────

function SectionRow({
  label,
  notes,
}: {
  label: string;
  notes: ProductionNote[];
}) {
  return (
    <div className="py-3 border-b border-zinc-200 dark:border-zinc-800 last:border-0">
      <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.12em] mb-2">
        {label}
      </p>
      {notes.length === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-600 italic">
          Tidak ada catatan
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-zinc-50 dark:bg-zinc-900 rounded-md px-3 py-2 border-l-2 border-zinc-200 dark:border-zinc-800"
            >
              <p className="text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed">
                {note.content}
              </p>
              <p className="text-[10px] font-mono tabular-nums text-zinc-400 dark:text-zinc-500 mt-1">
                {note.created_by_name} · {formatTime(note.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Komponen: card satu pesanan ─────────────────────────────────────────────

function OrderCard({ orderNotes }: { orderNotes: OrderNotes }) {
  const [expanded, setExpanded] = useState(true);

  const totalNotes =
    orderNotes.sections.produksi.length +
    orderNotes.sections.finishing.length +
    orderNotes.sections.pengiriman.length;

  return (
    <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-150"
      >
        <div className="flex items-center gap-3 text-left">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
              {orderNotes.nama_pemesan}
            </p>
            <p className="text-[10px] font-mono tabular-nums text-zinc-400 dark:text-zinc-500 mt-0.5">
              #{orderNotes.kode_produksi}
            </p>
          </div>
          {totalNotes > 0 && (
            <span className="font-mono tabular-nums text-[11px] px-2.5 py-1 rounded-full border border-zinc-300/70 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300">
              {totalNotes} catatan
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4">
          <SectionRow
            label={SECTION_LABELS.produksi}
            notes={orderNotes.sections.produksi}
          />
          <SectionRow
            label={SECTION_LABELS.finishing}
            notes={orderNotes.sections.finishing}
          />
          <SectionRow
            label={SECTION_LABELS.pengiriman}
            notes={orderNotes.sections.pengiriman}
          />
        </div>
      )}
    </div>
  );
}

// ─── Komponen Utama ───────────────────────────────────────────────────────────

export default function WeeklyNotesView() {
  const [orderNotesList, setOrderNotesList] = useState<OrderNotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterWeek, setFilterWeek] = useState<"this" | "last" | "all">("this");
  const [generating, setGenerating] = useState<"download" | "print" | null>(
    null,
  );

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const fetchNotes = useCallback(async () => {
    setLoading(true);

    const now = new Date();
    let fromDate: Date | null = null;

    if (filterWeek === "this") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      fromDate = new Date(new Date(now).setDate(diff));
      fromDate.setHours(0, 0, 0, 0);
    } else if (filterWeek === "last") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      fromDate = new Date(new Date(now).setDate(diff));
      fromDate.setHours(0, 0, 0, 0);
    }

    let query = supabase
      .from("production_notes")
      .select("*")
      .order("created_at", { ascending: true });

    if (fromDate && filterWeek === "this") {
      query = query.gte("created_at", fromDate.toISOString());
    } else if (fromDate && filterWeek === "last") {
      const toDate = new Date(fromDate);
      toDate.setDate(toDate.getDate() + 7);
      query = query
        .gte("created_at", fromDate.toISOString())
        .lt("created_at", toDate.toISOString());
    }

    const { data } = await query;
    if (!data) {
      setLoading(false);
      return;
    }

    const grouped: Record<string, OrderNotes> = {};
    for (const note of data) {
      if (!grouped[note.order_id]) {
        grouped[note.order_id] = {
          order_id: note.order_id,
          kode_produksi: note.kode_produksi,
          nama_pemesan: note.nama_pemesan,
          sections: { produksi: [], finishing: [], pengiriman: [] },
        };
      }
      const sec = note.section as keyof (typeof grouped)[string]["sections"];
      if (grouped[note.order_id].sections[sec]) {
        grouped[note.order_id].sections[sec].push(note);
      }
    }

    setOrderNotesList(Object.values(grouped));
    setLoading(false);
  }, [filterWeek, supabase]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handlePDF = async (action: "download" | "print") => {
    setGenerating(action);
    // Beri sedikit delay supaya UI update dulu (spinner muncul)
    await new Promise((r) => setTimeout(r, 100));
    generatePDF(orderNotesList, filterWeek, action);
    setGenerating(null);
  };

  const totalCatatan = orderNotesList.reduce(
    (acc, o) =>
      acc +
      o.sections.produksi.length +
      o.sections.finishing.length +
      o.sections.pengiriman.length,
    0,
  );
  const hasData = !loading && orderNotesList.length > 0;

  return (
    <div className="space-y-4 md:space-y-5 pb-24">
      {/* Header */}
      <div className="hidden md:block">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Catatan Rapat
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Rekap catatan produksi untuk rapat mingguan
        </p>
      </div>

      {/* Filter + tombol PDF */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter pills */}
        {(["this", "last", "all"] as const).map((w) => {
          const labels = {
            this: "Minggu ini",
            last: "Minggu lalu",
            all: "Semua",
          };
          return (
            <button
              key={w}
              onClick={() => setFilterWeek(w)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors duration-150 ${
                filterWeek === w
                  ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                  : "bg-white text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              {labels[w]}
            </button>
          );
        })}

        {/* Summary */}
        {!loading && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-1">
            <span className="font-mono tabular-nums">
              {orderNotesList.length}
            </span>{" "}
            pesanan ·{" "}
            <span className="font-mono tabular-nums">{totalCatatan}</span>{" "}
            catatan
          </span>
        )}

        {/* Tombol PDF — muncul di kanan, hanya kalau ada data */}
        {hasData && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => handlePDF("print")}
              disabled={!!generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150 disabled:opacity-50"
            >
              {generating === "print" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              Print
            </button>
            <button
              onClick={() => handlePDF("download")}
              disabled={!!generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#124540] hover:bg-[#1b3331] transition-colors duration-150 disabled:opacity-50"
            >
              {generating === "download" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Download PDF
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          <span className="text-sm text-zinc-400">Memuat catatan...</span>
        </div>
      ) : orderNotesList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-900/50">
          <MessageSquare className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-3" />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Belum ada catatan
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">
            Catatan akan muncul setelah tim produksi menambahkannya di detail
            pesanan
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orderNotesList.map((o) => (
            <OrderCard key={o.order_id} orderNotes={o} />
          ))}
        </div>
      )}
    </div>
  );
}
