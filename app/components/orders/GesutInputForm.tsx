// app/components/orders/GesutInputForm.tsx
//
// ── TAMBAHAN ── Form komposisi gesut (kecil/sedang/besar) untuk order
// jenis_produksi "Manual". Independen dari SizeInputForm/detail_ukuran —
// gesut dihitung per potongan kain untuk basis gaji tukang produksi manual,
// bukan per baju jadi. Lihat GesutEntry di @/types.
//
// Catatan desain (sesuai keputusan): total kecil+sedang+besar TIDAK divalidasi
// harus sama dengan `jumlah` order — boleh berbeda.

import React, { useState } from "react";
import { GesutEntry } from "@/types";

interface GesutInputFormProps {
  initialData?: GesutEntry | null;
  onSave: (detail: GesutEntry) => void;
  onCancel: () => void;
}

export default function GesutInputForm({
  initialData,
  onSave,
  onCancel,
}: GesutInputFormProps) {
  const [form, setForm] = useState<GesutEntry>({
    kecil: initialData?.kecil ?? 0,
    sedang: initialData?.sedang ?? 0,
    besar: initialData?.besar ?? 0,
  });

  const total = form.kecil + form.sedang + form.besar;

  const handleChange = (key: keyof GesutEntry, raw: string) => {
    const value = Number(raw.replace(/[^0-9]/g, "")) || 0;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const fields: { key: keyof GesutEntry; label: string }[] = [
    { key: "kecil", label: "Gesut Kecil" },
    { key: "sedang", label: "Gesut Sedang" },
    { key: "besar", label: "Gesut Besar" },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden min-h-0">
        {/* Header */}
        <div className="shrink-0 px-5 md:px-8 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-lg md:text-xl text-zinc-900 dark:text-white">
            Komposisi Gesut
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Basis perhitungan gaji produksi manual (PJ &amp; Helper). Jumlah di
            sini boleh berbeda dari total pcs ukuran baju.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 space-y-3 md:space-y-4">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase mb-1 md:mb-2">
                {label}
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="w-full border border-zinc-200 dark:border-zinc-700 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-[#124540] outline-none font-mono tabular-nums font-semibold bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm"
                placeholder="0"
                value={form[key] > 0 ? form[key] : ""}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            </div>
          ))}

          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
              Total Gesut
            </span>
            <span className="font-mono tabular-nums text-sm font-semibold text-[#124540] dark:text-[#49BFB4]">
              {total.toLocaleString("id-ID")} Screen
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 md:px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-zinc-200 dark:border-zinc-700 py-2 md:py-3 rounded-md font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150 text-sm"
          >
            Batal
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex-1 bg-[#124540] text-white py-2 md:py-3 rounded-md font-semibold hover:bg-[#0d332f] transition-colors duration-150 text-sm"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
