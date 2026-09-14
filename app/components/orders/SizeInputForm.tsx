"use client";

import React, { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SizeEntry {
  id: string;
  warna: string;
  lengan: "pendek" | "panjang";
  ukuran: Partial<Record<string, number>>; // string agar bisa tampung ukuran custom
}

export type UkuranKey = "S" | "M" | "L" | "XL" | "XXL" | "XXXL";

interface CustomSize {
  id: string;
  nama: string;
  jumlah: string;
}

interface SizeInputFormProps {
  onSave: (detail: SizeEntry[], totalJumlah: number) => void;
  onCancel: () => void;
  initialData?: SizeEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UKURAN_STANDAR: UkuranKey[] = ["S", "M", "L", "XL", "XXL", "XXXL"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function createEmptyEntry(): SizeEntry {
  return { id: generateId(), warna: "", lengan: "pendek", ukuran: {} };
}

function totalPerEntry(entry: SizeEntry): number {
  return Object.values(entry.ukuran).reduce((a: number, b) => a + (b ?? 0), 0);
}

function grandTotal(entries: SizeEntry[]): number {
  return entries.reduce((a, e) => a + totalPerEntry(e), 0);
}

// ─── EntryCard ────────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: SizeEntry;
  index: number;
  canDelete: boolean;
  onChange: (updated: SizeEntry) => void;
  onDelete: () => void;
}

function EntryCard({
  entry,
  index,
  canDelete,
  onChange,
  onDelete,
}: EntryCardProps) {
  // State ukuran custom (nama + jumlah), terpisah dari ukuran standar
  const [customSizes, setCustomSizes] = useState<CustomSize[]>(() => {
    // Saat edit ulang, restore ukuran custom yang sudah tersimpan
    return Object.entries(entry.ukuran)
      .filter(([key]) => !UKURAN_STANDAR.includes(key as UkuranKey))
      .map(([key, val]) => ({
        id: generateId(),
        nama: key,
        jumlah: String(val ?? ""),
      }));
  });

  const setField = <K extends keyof SizeEntry>(key: K, value: SizeEntry[K]) =>
    onChange({ ...entry, [key]: value });

  // Update ukuran standar
  const setUkuranStandar = (key: UkuranKey, raw: string) => {
    const val = raw === "" ? undefined : Math.max(0, parseInt(raw) || 0);
    const next = { ...entry.ukuran };
    if (val === undefined) delete next[key];
    else next[key] = val;
    onChange({ ...entry, ukuran: next });
  };

  // Sync custom sizes ke entry.ukuran setiap ada perubahan
  const syncCustomToEntry = (updated: CustomSize[]) => {
    // Ambil ukuran standar yang sudah ada
    const standarEntries = Object.fromEntries(
      Object.entries(entry.ukuran).filter(([key]) =>
        UKURAN_STANDAR.includes(key as UkuranKey),
      ),
    );
    // Gabung dengan custom
    const customEntries = Object.fromEntries(
      updated
        .filter((c) => c.nama.trim() !== "")
        .map((c) => [c.nama.trim(), parseInt(c.jumlah) || 0]),
    );
    onChange({ ...entry, ukuran: { ...standarEntries, ...customEntries } });
  };

  const addCustomSize = () => {
    const updated = [
      ...customSizes,
      { id: generateId(), nama: "", jumlah: "" },
    ];
    setCustomSizes(updated);
  };

  const updateCustomSize = (
    id: string,
    field: "nama" | "jumlah",
    value: string,
  ) => {
    const updated = customSizes.map((c) =>
      c.id === id ? { ...c, [field]: value } : c,
    );
    setCustomSizes(updated);
    syncCustomToEntry(updated);
  };

  const removeCustomSize = (id: string) => {
    const updated = customSizes.filter((c) => c.id !== id);
    setCustomSizes(updated);
    syncCustomToEntry(updated);
  };

  const subtotal = totalPerEntry(entry);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 p-4 md:p-5 space-y-3 md:space-y-5 transition-colors duration-150">
      {/* Header kartu */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase tracking-[0.12em]">
          Varian #{index + 1}
        </span>
        <div className="flex items-center gap-2">
          {subtotal > 0 && (
            <span className="font-mono tabular-nums text-xs font-semibold text-[#49BFB4]">
              {subtotal.toLocaleString("id-ID")} pcs
            </span>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              className="text-xs font-semibold text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors duration-150 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              Hapus
            </button>
          )}
        </div>
      </div>

      {/* Warna & Lengan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5">
        <div>
          <label className="block text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase tracking-[0.12em] mb-1 md:mb-2">
            Warna Kaos
          </label>
          <input
            className="w-full border border-zinc-200 dark:border-zinc-700 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-[#124540] outline-none font-medium bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors duration-150"
            placeholder="Masukkan warna kaos"
            value={entry.warna}
            onChange={(e) => setField("warna", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase tracking-[0.12em] mb-1 md:mb-2">
            Jenis Lengan
          </label>
          <select
            className="w-full border border-zinc-200 dark:border-zinc-700 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-[#124540] outline-none font-medium bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-sm transition-colors duration-150"
            value={entry.lengan}
            onChange={(e) =>
              setField("lengan", e.target.value as "pendek" | "panjang")
            }
          >
            <option value="pendek" className="dark:bg-zinc-800">
              Pendek
            </option>
            <option value="panjang" className="dark:bg-zinc-800">
              Panjang
            </option>
          </select>
        </div>
      </div>

      {/* Ukuran Standar */}
      <div>
        <label className="block text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase tracking-[0.12em] mb-1 md:mb-2">
          Rincian Ukuran
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {UKURAN_STANDAR.map((uk) => (
            <div key={uk} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                {uk}
              </span>
              <input
                type="number"
                min={0}
                className="w-full text-center border border-zinc-200 dark:border-zinc-700 rounded-md p-2 md:p-3 text-sm font-mono tabular-nums outline-none transition-colors duration-150 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-[#124540] placeholder-zinc-400 dark:placeholder-zinc-500"
                placeholder="0"
                value={entry.ukuran[uk] ?? ""}
                onChange={(e) => setUkuranStandar(uk, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Ukuran Custom */}
      {customSizes.length > 0 && (
        <div className="space-y-2">
          <label className="block text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase tracking-[0.12em]">
            Ukuran Khusus
          </label>
          {customSizes.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <input
                className="flex-1 border border-zinc-200 dark:border-zinc-700 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-[#124540] outline-none font-medium bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors duration-150"
                placeholder="Nama ukuran, misal: 3XL"
                value={c.nama}
                onChange={(e) => updateCustomSize(c.id, "nama", e.target.value)}
              />
              <input
                type="number"
                min={0}
                className="w-20 text-center border border-zinc-200 dark:border-zinc-700 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-[#124540] outline-none font-mono tabular-nums bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors duration-150"
                placeholder="0"
                value={c.jumlah}
                onChange={(e) =>
                  updateCustomSize(c.id, "jumlah", e.target.value)
                }
              />
              <button
                onClick={() => removeCustomSize(c.id)}
                className="text-xs font-semibold text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors duration-150 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 whitespace-nowrap"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tombol tambah ukuran custom */}
      <button
        onClick={addCustomSize}
        className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-[#2589ff] transition-colors duration-150 underline underline-offset-2"
      >
        + Tambah Ukuran Khusus
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SizeInputForm({
  onSave,
  onCancel,
  initialData,
}: SizeInputFormProps) {
  const [entries, setEntries] = useState<SizeEntry[]>(
    initialData && initialData.length > 0 ? initialData : [createEmptyEntry()],
  );

  const updateEntry = useCallback((id: string, updated: SizeEntry) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addEntry = () => setEntries((prev) => [...prev, createEmptyEntry()]);

  const total = grandTotal(entries);

  const isValid =
    entries.length > 0 &&
    entries.every((e) => e.warna.trim() !== "" && totalPerEntry(e) > 0);

  const handleSave = () => {
    if (!isValid) return;
    onSave(entries, total);
  };

  return (
    <div className="bg-white dark:bg-zinc-950 p-4 md:p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 max-w-2xl mx-auto transition-colors duration-150">
      <h2 className="font-semibold text-lg md:text-xl mb-4 md:mb-6 text-zinc-900 dark:text-white tracking-tight">
        Detail Ukuran
      </h2>

      <div className="space-y-3 md:space-y-5">
        {entries.map((entry, i) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            index={i}
            canDelete={entries.length > 1}
            onChange={(updated) => updateEntry(entry.id, updated)}
            onDelete={() => deleteEntry(entry.id)}
          />
        ))}

        {/* Tambah varian */}
        <button
          onClick={addEntry}
          className="w-full border border-dashed border-zinc-200 dark:border-zinc-700 py-2 md:py-3 rounded-md font-semibold text-zinc-500 dark:text-zinc-400 hover:border-[#124540] hover:text-[#49BFB4] text-sm transition-colors duration-150"
        >
          + Tambah Varian Warna
        </button>

        {/* Ringkasan */}
        {total > 0 && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 md:p-4 space-y-1">
            <p className="text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase tracking-[0.12em] mb-2">
              Ringkasan
            </p>
            {entries.map((e) => {
              const sub = totalPerEntry(e);
              if (sub === 0 || !e.warna) return null;
              return (
                <div key={e.id} className="flex justify-between items-center">
                  <span className="text-sm text-zinc-600 dark:text-zinc-300 font-medium">
                    {e.warna} &middot; Lengan {e.lengan}
                  </span>
                  <span className="font-mono tabular-nums text-sm font-semibold text-zinc-900 dark:text-white">
                    {sub.toLocaleString("id-ID")} pcs
                  </span>
                </div>
              );
            })}
            <div className="flex justify-between items-center border-t border-zinc-200 dark:border-zinc-700 pt-2 mt-1">
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Total Jumlah
              </span>
              <span className="font-mono tabular-nums text-sm font-semibold text-[#49BFB4]">
                {total.toLocaleString("id-ID")} pcs
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 md:pt-6">
          <button
            onClick={onCancel}
            className="flex-1 border border-zinc-200 dark:border-zinc-700 py-2 md:py-3 rounded-md font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150 text-sm"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="flex-1 bg-[#124540] text-white py-2 md:py-3 rounded-md font-semibold hover:bg-[#0d332f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 text-sm"
          >
            {isValid
              ? `Simpan (${total.toLocaleString("id-ID")} pcs)`
              : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
