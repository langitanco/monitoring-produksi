// app/components/orders/MultiSelectDropdown.tsx
//
// Dropdown pilihan ganda (checkbox di dalam popover). Dipakai untuk
// "Jenis Aplikasi" per posisi art (Depan/Belakang/Kanan/Kiri) di form
// pesanan, karena satu art bisa campuran (mis. Sablon Manual + DTF).

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  ringClass?: string; // mis. "focus:ring-[#124540]"
}

export default function MultiSelectDropdown({
  label,
  options,
  value,
  onChange,
  placeholder = "Pilih jenis aplikasi",
  ringClass = "focus:ring-[#124540]",
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  const toggle = (opt: string) =>
    onChange(
      value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt],
    );

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase mb-1 md:mb-2">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 border border-zinc-200 dark:border-zinc-700 p-2 md:p-3 rounded-md focus:ring-2 ${ringClass} outline-none font-medium bg-white dark:bg-zinc-800 text-sm text-left`}
      >
        <span
          className={`truncate ${
            value.length
              ? "text-zinc-900 dark:text-zinc-100"
              : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          {value.length ? value.join(", ") : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg py-1">
          {options.map((opt) => {
            const checked = value.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    checked
                      ? "bg-[#124540] border-[#124540] text-white"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {checked && <Check className="w-3 h-3" />}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
