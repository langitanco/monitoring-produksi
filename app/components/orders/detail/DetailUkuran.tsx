import React, { useState } from "react";
import { SizeEntry } from "@/app/components/orders/SizeInputForm";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DetailUkuranProps {
  data?: SizeEntry[] | null;
}

const UKURAN_STANDAR = ["S", "M", "L", "XL", "XXL", "XXXL"];

export default function DetailUkuran({ data }: DetailUkuranProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!data || data.length === 0) return null;

  const grandTotal = data.reduce(
    (total, entry) =>
      total +
      Object.values(entry.ukuran).reduce((a: number, b) => a + (b ?? 0), 0),
    0,
  );

  return (
    <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header — klik untuk buka/tutup */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 md:px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors duration-150"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Detail Ukuran
          </span>
          <span className="font-mono tabular-nums text-[11px] px-2.5 py-1 rounded-full border border-zinc-300/70 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300">
            {grandTotal.toLocaleString("id-ID")} pcs
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {data.length} varian
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>

      {/* Konten collapsible */}
      {isOpen && (
        <div className="px-4 md:px-6 pb-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2 pt-3">
          {data.map((entry, i) => {
            const subtotal = Object.values(entry.ukuran).reduce(
              (a: number, b) => a + (b ?? 0),
              0,
            );
            const standar = UKURAN_STANDAR.filter(
              (uk) => entry.ukuran[uk] != null,
            );
            const custom = Object.entries(entry.ukuran).filter(
              ([key]) => !UKURAN_STANDAR.includes(key),
            );

            return (
              <div
                key={entry.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b border-zinc-200 dark:border-zinc-800 last:border-0"
              >
                {/* Label varian */}
                <div className="flex items-center gap-1.5 min-w-[140px]">
                  <span className="font-mono tabular-nums text-[10px] text-zinc-400 dark:text-zinc-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate">
                    {entry.warna}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 capitalize">
                    · {entry.lengan}
                  </span>
                </div>

                {/* Kotak ukuran — compact */}
                <div className="flex flex-wrap gap-1 flex-1">
                  {standar.map((uk) => (
                    <div
                      key={uk}
                      className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-md px-2 py-1"
                    >
                      <span className="text-[10px] text-zinc-400 uppercase leading-none">
                        {uk}
                      </span>
                      <span className="font-mono tabular-nums text-xs font-semibold text-zinc-700 dark:text-zinc-100 leading-none">
                        {entry.ukuran[uk]}
                      </span>
                    </div>
                  ))}
                  {custom.map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/40 rounded-md px-2 py-1"
                    >
                      <span className="text-[10px] text-orange-500 dark:text-orange-400 uppercase leading-none">
                        {key}
                      </span>
                      <span className="font-mono tabular-nums text-xs font-semibold text-orange-700 dark:text-orange-300 leading-none">
                        {val}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotal */}
                <span className="font-mono tabular-nums text-xs font-semibold text-zinc-500 dark:text-zinc-400 shrink-0">
                  {subtotal} pcs
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
