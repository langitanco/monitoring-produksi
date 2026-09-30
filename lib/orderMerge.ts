// lib/orderMerge.ts
//
// Penggabungan 3 arah (three-way merge) untuk data order, supaya aksi seorang
// user tidak menimpa perubahan yang baru saja dibuat user lain.
//
//   base   = data order yang dilihat user SAAT mulai bertindak (state lokal)
//   mine   = data order setelah user melakukan aksinya
//   theirs = data order TERBARU di database (mungkin sudah diubah orang lain)
//
// Aturan singkat:
//   - Kalau saya tidak mengubah bagian itu  → pakai versi terbaru di database
//   - Kalau orang lain tidak mengubahnya    → pakai versi saya
//   - Kalau dua-duanya mengubah:
//       * array berisi objek ber-`id` (steps, kendala, bukti_pembayaran, dll)
//         digabung per item berdasarkan id
//       * objek biasa digabung per properti
//       * selain itu (angka/teks yang sama-sama diubah) → versi saya menang

/* eslint-disable @typescript-eslint/no-explicit-any */

export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true; // null dan undefined dianggap sama
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }

  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (a[k] === undefined && b[k] === undefined) continue;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

const isPlainObject = (v: any) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const isIdArray = (v: any) =>
  Array.isArray(v) && v.every((i) => isPlainObject(i) && i.id != null);

function mergeArraysById(base: any[], mine: any[], theirs: any[]): any[] {
  const key = (i: any) => String(i.id);
  const baseMap = new Map(base.map((i) => [key(i), i]));
  const mineMap = new Map(mine.map((i) => [key(i), i]));
  const theirsMap = new Map(theirs.map((i) => [key(i), i]));
  const result: any[] = [];

  // Urutan mengikuti versi terbaru di database
  for (const t of theirs) {
    const id = key(t);
    const b = baseMap.get(id);
    const m = mineMap.get(id);

    if (b && !m) {
      // Saya menghapus item ini. Hormati penghapusan HANYA kalau orang lain
      // tidak menyentuhnya; kalau dia mengubahnya, simpan (lebih aman).
      if (!deepEqual(b, t)) result.push(t);
    } else if (b && m) {
      result.push(threeWayMerge(b, m, t));
    } else if (!b && m) {
      result.push(m); // id sama ditambahkan dua pihak → versi saya
    } else {
      result.push(t); // ditambahkan orang lain
    }
  }

  for (const m of mine) {
    const id = key(m);
    if (theirsMap.has(id)) continue;
    const b = baseMap.get(id);
    if (!b) result.push(m); // ditambahkan oleh saya
    else if (!deepEqual(b, m)) result.push(m); // orang lain menghapus, tapi saya ubah → simpan
    // sisanya: orang lain menghapus & saya tidak mengubah → tetap terhapus
  }

  return result;
}

function mergeObjects(base: any, mine: any, theirs: any): any {
  const keys = new Set([
    ...Object.keys(base ?? {}),
    ...Object.keys(mine ?? {}),
    ...Object.keys(theirs ?? {}),
  ]);
  const result: any = {};
  for (const k of keys) {
    const v = threeWayMerge(base?.[k], mine?.[k], theirs?.[k]);
    if (v !== undefined) result[k] = v;
  }
  return result;
}

export function threeWayMerge(base: any, mine: any, theirs: any): any {
  if (deepEqual(base, mine)) return theirs; // saya tidak mengubah
  if (deepEqual(base, theirs)) return mine; // orang lain tidak mengubah
  if (deepEqual(mine, theirs)) return mine; // sama-sama mengubah ke hasil yang sama

  // Keduanya mengubah bagian yang sama → gabungkan sedalam mungkin
  if (
    Array.isArray(mine) &&
    Array.isArray(theirs) &&
    (base == null || Array.isArray(base)) &&
    isIdArray(mine) &&
    isIdArray(theirs) &&
    isIdArray(base ?? [])
  ) {
    return mergeArraysById(base ?? [], mine, theirs);
  }

  if (
    isPlainObject(mine) &&
    isPlainObject(theirs) &&
    (base == null || isPlainObject(base))
  ) {
    return mergeObjects(base, mine, theirs);
  }

  return mine; // konflik pada nilai yang sama → versi saya menang
}