// app/po/[slug]/layout.tsx
//
// Judul tab katalog PO: "(Nama PO) | Langitan.co".
// Dibuat di server supaya judulnya sudah benar sejak halaman dimuat
// (juga muncul di preview link WhatsApp), bukan baru berubah setelah data tampil.

import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const BRAND = "Langitan.co";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let name = "Katalog PO";

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: "monitoring_sablon" } },
    );
    const { data } = await supabase
      .from("po_setting")
      .select("title")
      .eq("url_slug", slug)
      .maybeSingle();
    if (data?.title?.trim()) name = data.title.trim();
  } catch {
    // gagal ambil judul → pakai default
  }

  return { title: `${name} | ${BRAND}` };
}

export default function POSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Buka koneksi ke Supabase Storage lebih awal → gambar mulai diunduh lebih cepat
  const storageOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    <>
      {storageOrigin && (
        <link rel="preconnect" href={storageOrigin} crossOrigin="" />
      )}
      {children}
    </>
  );
}
