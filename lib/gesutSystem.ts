// lib/gesutSystem.ts
//
// Pengaturan "sistem hitung gaji gesut" (lama / baru). Disimpan di tabel
// pricing_configs sebagai dua key bernilai 1 (aktif) / 0 (nonaktif), supaya
// tidak perlu tabel baru. Diatur di Pengaturan → "Sistem Gaji Gesut", dibaca
// oleh SalaryView.
//
//  - Keduanya aktif  → menu Gaji menampilkan pilihan Otomatis / Lama / Baru
//  - Hanya lama aktif → menu Gaji memakai sistem lama
//  - Hanya baru aktif → menu Gaji memakai sistem baru
//
// Kalau belum pernah diatur: lama aktif, baru nonaktif (perilaku seperti
// sebelum fitur ini ada).

export const KEY_GESUT_LAMA_AKTIF = "gesut_sistem_lama_aktif";
export const KEY_GESUT_BARU_AKTIF = "gesut_sistem_baru_aktif";

export const GESUT_FLAG_DEFAULTS: Record<string, boolean> = {
  [KEY_GESUT_LAMA_AKTIF]: true,
  [KEY_GESUT_BARU_AKTIF]: false,
};

interface FlagRow {
  id?: number;
  key_name: string;
  value_amount: number | string;
  effective_date?: string | null;
}

// Nilai flag yang berlaku HARI INI: baris dengan effective_date terbesar yang
// <= hari ini (seri dipecah dengan id terbesar). Tanpa baris → nilai default.
export function resolveGesutFlag(rows: FlagRow[], keyName: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  const candidates = rows
    .filter(
      (r) =>
        r.key_name === keyName && (!r.effective_date || r.effective_date <= today),
    )
    .sort((a, b) => {
      const da = a.effective_date || "";
      const db = b.effective_date || "";
      if (da !== db) return da < db ? -1 : 1;
      return (a.id ?? 0) - (b.id ?? 0);
    });
  if (candidates.length === 0) return GESUT_FLAG_DEFAULTS[keyName] ?? false;
  return Number(candidates[candidates.length - 1].value_amount) === 1;
}