// app/components/orders/detail/DetailGesut.tsx
//
// ── TAMBAHAN ── Menampilkan komposisi gesut (kecil/sedang/besar) di halaman
// detail order, sejajar dengan DetailUkuran. Hanya dirender untuk order
// jenis_produksi Manual (dikontrol dari pemanggil, lihat OrderDetail.tsx).

import React from "react";
import { GesutEntry } from "@/types";

interface DetailGesutProps {
  data?: GesutEntry | null;
}

export default function DetailGesut({ data }: DetailGesutProps) {
  const total = data ? data.kecil + data.sedang + data.besar : 0;

  return (
    <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-6">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-3">
        Komposisi Gesut
      </h3>

      {!data ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-600">Belum diisi.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Kecil", value: data.kecil },
            { label: "Sedang", value: data.sedang },
            { label: "Besar", value: data.besar },
          ].map((item) => (
            <div
              key={item.label}
              className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-center"
            >
              <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                {item.label}
              </div>
              <div className="font-mono tabular-nums text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {data && (
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
            Total
          </span>
          <span className="font-mono tabular-nums text-sm font-semibold text-[#124540] dark:text-[#49BFB4]">
            {total.toLocaleString("id-ID")} Screen
          </span>
        </div>
      )}
    </div>
  );
}
