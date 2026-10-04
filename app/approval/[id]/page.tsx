"use client";

// app/approval/[id]/page.tsx
// Halaman Form Approval otomatis untuk satu order. Hanya bisa dibuka user
// yang sudah login (query pakai sesi Supabase, tunduk pada RLS).

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Printer, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/types";
import ApprovalForm, {
  SHEET_W,
  SHEET_H,
} from "@/app/components/orders/ApprovalForm";

export default function ApprovalPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "*, assigned_user:users!assigned_to ( name ), helper_user:users!helper_id ( name )",
        )
        .eq("id", id)
        .maybeSingle();
      setOrder((data as Order) ?? null);
      setLoading(false);
    })();
  }, [id]);

  // Skala tampilan layar (cetak selalu skala 1 lewat CSS di bawah)
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerWidth - 24) / SHEET_W));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    if (order) document.title = `Form Approval ${order.kode_produksi}`;
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 p-6 text-center">
        <p className="font-semibold">Form approval tidak ditemukan.</p>
        <p className="text-sm text-zinc-500">
          Pastikan kamu sudah login dan order masih ada.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-200 dark:bg-zinc-900 py-4 print:bg-white print:py-0">
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .sheet-wrap { width: ${SHEET_W}px !important; height: ${SHEET_H}px !important; margin: 0 !important; }
          .sheet-scale { transform: none !important; }
          .approval-sheet, .approval-sheet * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="no-print flex items-center justify-between gap-2 px-3 mb-3 max-w-[1123px] mx-auto">
        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 truncate">
          Form Approval · {order.kode_produksi}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 py-1.5 rounded-md text-xs font-semibold"
          >
            <Printer className="w-4 h-4" /> Cetak / Simpan PDF
          </button>
          <button
            onClick={() => window.close()}
            className="flex items-center gap-1.5 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 px-3 py-1.5 rounded-md text-xs font-semibold"
          >
            <X className="w-4 h-4" /> Tutup
          </button>
        </div>
      </div>

      <div
        className="sheet-wrap mx-auto shadow-lg"
        style={{ width: SHEET_W * scale, height: SHEET_H * scale }}
      >
        <div
          className="sheet-scale"
          style={{
            width: SHEET_W,
            height: SHEET_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <ApprovalForm order={order} />
        </div>
      </div>
    </div>
  );
}
