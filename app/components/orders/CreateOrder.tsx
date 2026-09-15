// app/components/orders/CreateOrder.tsx

import React, { useState, useEffect } from "react";
import { ProductionTypeData, UserData, GesutEntry } from "@/types";
import SizeInputForm, { SizeEntry } from "./SizeInputForm";
import GesutInputForm from "./GesutInputForm"; // ── TAMBAHAN ──

interface CreateOrderProps {
  productionTypes: ProductionTypeData[];
  users: UserData[];
  onCancel: () => void;
  onSubmit: (data: any) => void;
}

export default function CreateOrder({
  productionTypes,
  users,
  onCancel,
  onSubmit,
}: CreateOrderProps) {
  const [showSizeForm, setShowSizeForm] = useState(false);
  const [showGesutForm, setShowGesutForm] = useState(false); // ── TAMBAHAN ──

  const [form, setForm] = useState({
    nama: "",
    hp: "",
    alamat_pemesan: "",
    jumlah: 0,
    detail_ukuran: null as SizeEntry[] | null,
    detail_gesut: null as GesutEntry | null, // ── TAMBAHAN ──
    deadline: new Date().toISOString().split("T")[0],
    type: productionTypes[0]?.value || "manual",
    assigned_to: "",
    helper_id: "",
  });

  // ── KOREKSI ── Gesut hanya relevan untuk jenis produksi Manual/Sablon.
  // Tim QC (role 'qc' — kerjanya QC + finishing + packing DTF sekaligus)
  // dihitung agregat per tim di SalaryView, jadi tidak boleh dipilih
  // sebagai PJ/Helper per-order di sini.
  const isManualType = ["manual", "sablon"].includes(
    form.type?.toLowerCase() || "",
  );
  const picUsers = users.filter((u) => u.role !== "qc");

  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setForm((f) => ({ ...f, deadline: d.toISOString().split("T")[0] }));
  }, []);

  const handleSizeSave = (detail: SizeEntry[], totalJumlah: number) => {
    setForm((f) => ({ ...f, detail_ukuran: detail, jumlah: totalJumlah }));
    setShowSizeForm(false);
  };

  // ── TAMBAHAN ──
  const handleGesutSave = (detail: GesutEntry) => {
    setForm((f) => ({ ...f, detail_gesut: detail }));
    setShowGesutForm(false);
  };

  const handleTypeChange = (value: string) => {
    const nowManual = ["manual", "sablon"].includes(value.toLowerCase());
    setForm((f) => ({
      ...f,
      type: value,
      // Reset gesut & PIC kalau pindah ke DTF supaya tidak nyangkut data lama
      detail_gesut: nowManual ? f.detail_gesut : null,
      assigned_to: nowManual ? f.assigned_to : "",
      helper_id: nowManual ? f.helper_id : "",
    }));
  };

  const isDisabled =
    !form.nama ||
    !form.hp ||
    !form.deadline ||
    !form.jumlah ||
    !form.assigned_to ||
    !form.detail_ukuran ||
    (isManualType && !form.detail_gesut); // ── TAMBAHAN ── wajib untuk Manual

  // ── SizeInputForm ──────────────────────────────────────────────────────────
  if (showSizeForm) {
    return (
      <SizeInputForm
        initialData={form.detail_ukuran ?? undefined}
        onSave={handleSizeSave}
        onCancel={() => setShowSizeForm(false)}
      />
    );
  }

  // ── GesutInputForm ── ── TAMBAHAN ──
  if (showGesutForm) {
    return (
      <GesutInputForm
        initialData={form.detail_gesut ?? undefined}
        onSave={handleGesutSave}
        onCancel={() => setShowGesutForm(false)}
      />
    );
  }

  // Normalisasi nomor HP ke format WA internasional (tanpa + atau spasi)
  const normalizePhone = (raw: string): string => {
    // Hapus semua karakter selain angka dan +
    let cleaned = raw.replace(/[^\d+]/g, "");
    // Jika diawali +, hapus + saja
    if (cleaned.startsWith("+")) return cleaned.slice(1);
    // Jika diawali 0, ganti dengan 62 (Indonesia)
    if (cleaned.startsWith("0")) return "62" + cleaned.slice(1);
    // Sudah pakai kode negara langsung (62xxx, 1xxx, 44xxx, dll)
    return cleaned;
  };

  const handleHpBlur = () => {
    if (!form.hp) return;
    setForm((f) => ({ ...f, hp: normalizePhone(f.hp) }));
  };

  // ── Form Utama ─────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* Wrapper: full height, no scroll on desktop */}
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="px-5 md:px-8 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <h2 className="font-semibold text-lg md:text-xl text-zinc-900 dark:text-white">
            Buat Pesanan Baru
          </h2>
        </div>

        {/* Body — 2 kolom di desktop, scroll hanya di mobile */}
        <div className="flex-1 overflow-y-auto md:overflow-hidden p-4 md:p-6">
          <div className="h-full flex flex-col md:grid md:grid-cols-2 md:gap-x-8 gap-y-3 md:gap-y-0">
            {/* ── KOLOM KIRI ── */}
            <div className="flex flex-col gap-3 md:gap-4 md:justify-between">
              {/* Nama Pemesan */}
              <div>
                <label className="block text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase mb-1 md:mb-2">
                  Nama Pemesan
                </label>
                <input
                  className="w-full border border-zinc-200 dark:border-zinc-700 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-[#124540] outline-none font-medium bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500"
                  placeholder="Masukkan nama pemesan"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                />
              </div>

              {/* No HP & Jumlah */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase mb-1 md:mb-2">
                    No HP
                  </label>
                  <input
                    className="w-full border border-zinc-200 dark:border-zinc-700 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-[#124540] outline-none font-medium bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500"
                    placeholder="08xx / +62xx"
                    value={form.hp}
                    onChange={(e) => setForm({ ...form, hp: e.target.value })}
                    onBlur={handleHpBlur} // ← tambah ini
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase mb-1 md:mb-2">
                    Jumlah
                  </label>
                  <input
                    readOnly
                    className="w-full border border-zinc-200 dark:border-zinc-700 p-2 md:p-3 rounded-md font-medium bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 text-sm cursor-not-allowed placeholder-[#124540] dark:placeholder-[#49BFB4]"
                    value={form.jumlah > 0 ? `${form.jumlah} pcs` : ""}
                    placeholder="Otomatis dari ukuran"
                  />
                </div>
              </div>

              {/* Detail Ukuran */}
              <div className="flex-1 flex flex-col">
                <label className="block text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase mb-1 md:mb-2">
                  Detail Ukuran <span className="text-red-500">(Wajib)</span>
                </label>

                {!form.detail_ukuran ? (
                  <button
                    onClick={() => setShowSizeForm(true)}
                    className="flex-1 min-h-[80px] w-full border border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:border-[#124540] hover:text-[#49BFB4] transition-colors duration-150"
                  >
                    + Isi Detail Ukuran
                  </button>
                ) : (
                  <div className="flex-1 flex flex-col border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                    <div className="flex-1 p-3 md:p-4 space-y-2 overflow-y-auto">
                      {form.detail_ukuran.map((e) => {
                        const total = Object.values(e.ukuran).reduce(
                          (a: number, b) => a + (b ?? 0),
                          0,
                        );
                        const ukuranList = Object.entries(e.ukuran)
                          .filter(([, v]) => (v ?? 0) > 0)
                          .map(([k, v]) => `${k}:${v}`)
                          .join(", ");
                        return (
                          <div
                            key={e.id}
                            className="flex justify-between items-start gap-2"
                          >
                            <div>
                              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {e.warna} &middot; Lengan {e.lengan}
                              </span>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                                {ukuranList}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                              {total} pcs
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-zinc-200 dark:border-zinc-700 px-3 md:px-4 py-2 flex items-center justify-between shrink-0">
                      <span className="font-mono tabular-nums text-xs font-semibold text-[#2589ff]">
                        Total: {form.jumlah.toLocaleString("id-ID")} pcs
                      </span>
                      <button
                        onClick={() => setShowSizeForm(true)}
                        className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-[#2589ff] transition-colors duration-150 underline underline-offset-2"
                      >
                        Ubah
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── TAMBAHAN ── Detail Gesut, hanya untuk Manual/Sablon */}
              {isManualType && (
                <div>
                  <label className="block text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase mb-1 md:mb-2">
                    Komposisi Gesut{" "}
                    <span className="text-red-500">(Wajib)</span>
                  </label>
                  {!form.detail_gesut ? (
                    <button
                      onClick={() => setShowGesutForm(true)}
                      className="w-full min-h-[64px] border border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:border-[#124540] hover:text-[#49BFB4] transition-colors duration-150"
                    >
                      + Isi Komposisi Gesut
                    </button>
                  ) : (
                    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 md:p-4 flex items-center justify-between">
                      <div className="flex gap-4 text-xs text-zinc-600 dark:text-zinc-300">
                        <span>
                          Kecil:{" "}
                          <span className="font-mono font-semibold">
                            {form.detail_gesut.kecil}
                          </span>
                        </span>
                        <span>
                          Sedang:{" "}
                          <span className="font-mono font-semibold">
                            {form.detail_gesut.sedang}
                          </span>
                        </span>
                        <span>
                          Besar:{" "}
                          <span className="font-mono font-semibold">
                            {form.detail_gesut.besar}
                          </span>
                        </span>
                      </div>
                      <button
                        onClick={() => setShowGesutForm(true)}
                        className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-[#2589ff] transition-colors duration-150 underline underline-offset-2"
                      >
                        Ubah
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Alamat */}
              <div>
                <label className="block text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase mb-1 md:mb-2">
                  Alamat Pemesan{" "}
                  <span className="normal-case font-normal text-zinc-400">
                    (Opsional, untuk Label Kirim)
                  </span>
                </label>
                <textarea
                  className="w-full border border-zinc-200 dark:border-zinc-700 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-[#124540] outline-none font-medium bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 resize-none h-16 md:h-20"
                  placeholder="Masukkan alamat lengkap pengiriman..."
                  value={form.alamat_pemesan}
                  onChange={(e) =>
                    setForm({ ...form, alamat_pemesan: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Divider vertikal di desktop */}
            <div className="hidden md:block absolute left-1/2 top-[72px] bottom-[72px] w-px bg-zinc-100 dark:bg-zinc-800 pointer-events-none" />

            {/* ── KOLOM KANAN ── */}
            <div className="flex flex-col gap-3 md:gap-4 md:justify-between">
              {/* Jenis */}
              <div>
                <label className="block text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase mb-1 md:mb-2">
                  Jenis
                </label>
                <select
                  className="w-full border border-zinc-200 dark:border-zinc-700 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-[#124540] outline-none font-medium bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm"
                  value={form.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  {productionTypes.map((pt) => (
                    <option
                      key={pt.id}
                      value={pt.value}
                      className="dark:bg-zinc-800"
                    >
                      {pt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Penanggung Jawab */}
              <div>
                <label className="block text-[10px] md:text-xs font-semibold text-[#124540] dark:text-[#42938b] uppercase mb-1 md:mb-2">
                  Penanggung Jawab (Wajib)
                </label>
                <select
                  className="w-full border border-zinc-200 dark:border-zinc-700 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-[#124540] outline-none font-medium bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm"
                  value={form.assigned_to}
                  onChange={(e) =>
                    setForm({ ...form, assigned_to: e.target.value })
                  }
                >
                  <option value="" className="dark:bg-zinc-800">
                    Pilih PIC Produksi
                  </option>
                  {picUsers.map((user) => (
                    <option
                      key={user.id}
                      value={user.id}
                      className="dark:bg-zinc-800"
                    >
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Helper */}
              <div>
                <label className="block text-[10px] md:text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase mb-1 md:mb-2">
                  Helper / Pembantu (Opsional)
                </label>
                <select
                  className="w-full border border-zinc-200 dark:border-zinc-700 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-[#124540] outline-none font-medium bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm"
                  value={form.helper_id}
                  onChange={(e) =>
                    setForm({ ...form, helper_id: e.target.value })
                  }
                >
                  <option value="" className="dark:bg-zinc-800">
                    -- Tidak Ada Helper --
                  </option>
                  {picUsers.map((user) => (
                    <option
                      key={user.id}
                      value={user.id}
                      className="dark:bg-zinc-800"
                    >
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Helper akan ikut terhitung di menu gaji jika dipilih.
                </p>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-[10px] md:text-xs font-semibold text-zinc-700 dark:text-zinc-400 uppercase mb-1 md:mb-2">
                  Deadline
                </label>
                <input
                  type="date"
                  className="w-full border border-zinc-200 dark:border-zinc-700 p-2 md:p-3 rounded-md focus:ring-2 focus:ring-[#124540] outline-none font-medium bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm({ ...form, deadline: e.target.value })
                  }
                />
              </div>

              {/* Spacer supaya tombol tetap di bawah */}
              <div className="flex-1 hidden md:block" />

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 border border-zinc-200 dark:border-zinc-700 py-2 md:py-3 rounded-md font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150 text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={() => onSubmit(form)}
                  disabled={isDisabled}
                  className="flex-1 bg-[#124540] text-white py-2 md:py-3 rounded-md font-semibold hover:bg-[#0d332f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 text-sm"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
