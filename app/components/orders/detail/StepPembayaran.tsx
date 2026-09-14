// app/components/orders/detail/StepPembayaran.tsx
//
// ── TAMBAHAN ── Section baru di Order Detail. Menggantikan alur lama di
// mana admin harus buka menu Finance terpisah untuk isi harga & status
// pembayaran. Sekarang jadi satu section di sini, dengan permission sendiri
// (`harga_pesanan`) supaya tidak otomatis terbuka untuk semua orang yang
// boleh edit order.
//
// Reuse PaymentForm dari modul finance (bukan duplikasi logic kalkulasi).

import React, { useState } from "react";
import { Order, UserData, BuktiPembayaran } from "@/types";
import { Trash2, Eye, Upload, ChevronDown } from "lucide-react";
import { PaymentForm } from "../../finance/PaymentForm";
import { PaymentData } from "../../finance/types";

interface StepPembayaranProps {
  order: Order;
  currentUser: UserData;
  canEditHarga: boolean;
  canDeleteBukti: boolean;
  onSubmitPayment: (data: PaymentData) => Promise<void> | void;
  // signature onTriggerUpload sudah diperluas di useUpload.ts dengan param `label` opsional
  onTriggerUpload: (
    type: string,
    stepId?: string,
    kendalaId?: string,
    label?: string,
  ) => void;
  onDeleteBukti: (attachmentId: string) => void;
}

export default function StepPembayaran({
  order,
  currentUser,
  canEditHarga,
  canDeleteBukti,
  onSubmitPayment,
  onTriggerUpload,
  onDeleteBukti,
}: StepPembayaranProps) {
  const [uploadLabel, setUploadLabel] = useState<"DP" | "Lunas">("DP");
  const bukti: BuktiPembayaran[] = order.bukti_pembayaran || [];

  // Kalau tidak punya izin sama sekali untuk lihat harga, section ini
  // disembunyikan total dari Order Detail (bukan cuma dibikin read-only),
  // supaya admin/role lain yang tidak berwenang tidak tahu ada data harga.
  if (!canEditHarga && bukti.length === 0 && !order.harga_per_pcs) return null;

  return (
    <div className="bg-white dark:bg-zinc-950 p-5 md:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-2 mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Harga & Pembayaran
        </h3>
      </div>

      <PaymentForm
        order={order}
        canEdit={canEditHarga}
        onSubmit={onSubmitPayment}
        hideSummary
      />

      {/* ── Bukti Pembayaran ── */}
      <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs md:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Bukti Pembayaran
          </span>
          {canEditHarga && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={uploadLabel}
                  onChange={(e) =>
                    setUploadLabel(e.target.value as "DP" | "Lunas")
                  }
                  className="text-[11px] font-semibold border border-zinc-200 dark:border-zinc-800 rounded-md pl-2 pr-6 py-1.5 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 outline-none appearance-none"
                >
                  <option value="DP">Untuk: DP</option>
                  <option value="Lunas">Untuk: Pelunasan</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
              </div>
              <button
                onClick={() =>
                  onTriggerUpload(
                    "bukti_pembayaran",
                    undefined,
                    undefined,
                    uploadLabel,
                  )
                }
                className="flex items-center gap-1 text-[11px] font-semibold bg-[#124540] text-white px-3 py-1.5 rounded-md hover:bg-[#0d332f] transition-colors duration-150"
              >
                <Upload className="w-3 h-3" /> Upload
              </button>
            </div>
          )}
        </div>

        {bukti.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            <span className="text-xs text-zinc-400 dark:text-zinc-600 italic">
              Belum ada bukti pembayaran diupload
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {bukti.map((b) => (
              <div
                key={b.id}
                className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
              >
                <img
                  src={b.url}
                  alt={`Bukti ${b.label}`}
                  className="w-full h-24 object-cover"
                />
                <a
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-colors duration-150 font-semibold text-xs"
                >
                  <Eye className="w-4 h-4 mr-1" /> Lihat
                </a>
                <span
                  className={`absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white ${
                    b.label === "Lunas" ? "bg-emerald-600" : "bg-orange-600"
                  }`}
                >
                  {b.label}
                </span>
                {canDeleteBukti && (
                  <button
                    onClick={() => onDeleteBukti(b.id)}
                    className="absolute top-1.5 right-1.5 bg-red-500/90 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-colors duration-150"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                {b.timestamp && (
                  <p className="font-mono tabular-nums text-[9px] text-zinc-400 px-1.5 py-1 truncate">
                    {new Date(b.timestamp).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
