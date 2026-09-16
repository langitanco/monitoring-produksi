// app/components/apps/SalaryPrintSlip.tsx
//
import type { CSSProperties } from "react";
//
// Komponen print-only untuk SATU slip gaji. Dipakai dua cara di SalaryView:
//   1) Cetak satu slip (tombol "Cetak Slip" di panel detail user)
//   2) Cetak massal/bulk (banyak instance digabung jadi satu dokumen HTML,
//      persis pola yang dipakai POPackingList.tsx untuk resi PO — lihat
//      handlePrintMassal di sana sebagai referensi)
//
// Komponen ini TIDAK melakukan fetch data apa pun — murni presentational,
// menerima semua data lewat props supaya bisa dipanggil dengan
// renderToStaticMarkup() di luar siklus render React biasa (dalam iframe
// cetak tersembunyi).

export interface SalarySlipRow {
  label: string; // mis. kode_produksi, atau "Total Qty Order Selesai"
  detail?: string; // keterangan tambahan (mis. peran PJ/Helper, tanggal)
  qty?: number;
  rate?: number;
  amount: number;
}

export interface SalaryPrintSlipProps {
  companyName: string;
  companyAddress: string;
  logoUrl?: string;
  recipientName: string;
  recipientRoleLabel?: string; // mis. "Tim QC & Finishing"
  kategoriLabel: string; // "Produksi Manual" | "Tim QC & Finishing"
  periodLabel: string; // "September 2026"
  rows: SalarySlipRow[];
  totalAmount: number;
  paidAt?: string | null; // ISO date string, kalau sudah ditandai lunas
  slipNumber?: string; // opsional, mis. "SLP/2026/09/0001"
}

const currency = (n: number) =>
  `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;

const formatDate = (iso?: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export default function SalaryPrintSlip({
  companyName,
  companyAddress,
  logoUrl,
  recipientName,
  recipientRoleLabel,
  kategoriLabel,
  periodLabel,
  rows,
  totalAmount,
  paidAt,
  slipNumber,
}: SalaryPrintSlipProps) {
  const paidLabel = formatDate(paidAt);

  return (
    <div
      style={{
        width: "210mm",
        minHeight: "148mm", // setengah A4 (A5 landscape-ish), cukup utk 1 slip
        padding: "14mm 16mm",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#18181b",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "2px solid #124540",
          paddingBottom: "10px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={companyName} style={{ height: "40px" }} />
          ) : null}
          <div>
            <div
              style={{ fontSize: "16px", fontWeight: 700, color: "#124540" }}
            >
              {companyName}
            </div>
            <div style={{ fontSize: "10px", color: "#52525b" }}>
              {companyAddress}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            SLIP GAJI
          </div>
          {slipNumber ? (
            <div
              style={{
                fontSize: "9px",
                color: "#71717a",
                fontFamily: "monospace",
              }}
            >
              {slipNumber}
            </div>
          ) : null}
        </div>
      </div>

      {/* INFO PENERIMA */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          fontSize: "11px",
          marginBottom: "16px",
        }}
      >
        <div>
          <div
            style={{
              color: "#71717a",
              fontSize: "9px",
              textTransform: "uppercase",
            }}
          >
            Nama Penerima
          </div>
          <div style={{ fontWeight: 700 }}>{recipientName}</div>
          {recipientRoleLabel ? (
            <div style={{ color: "#52525b", fontSize: "10px" }}>
              {recipientRoleLabel}
            </div>
          ) : null}
        </div>
        <div>
          <div
            style={{
              color: "#71717a",
              fontSize: "9px",
              textTransform: "uppercase",
            }}
          >
            Periode
          </div>
          <div style={{ fontWeight: 700 }}>{periodLabel}</div>
          <div style={{ color: "#52525b", fontSize: "10px" }}>
            {kategoriLabel}
          </div>
        </div>
      </div>

      {/* TABEL RINCIAN */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "10px",
          marginBottom: "14px",
        }}
      >
        <thead>
          <tr style={{ background: "#f4f4f5" }}>
            <th style={thStyle}>Keterangan</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Qty</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Rate</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #e4e4e7" }}>
              <td style={tdStyle}>
                {row.label}
                {row.detail ? (
                  <div style={{ color: "#a1a1aa", fontSize: "9px" }}>
                    {row.detail}
                  </div>
                ) : null}
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                {row.qty !== undefined ? row.qty.toLocaleString("id-ID") : "—"}
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                {row.rate !== undefined ? currency(row.rate) : "—"}
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>
                {currency(row.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTAL */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            minWidth: "220px",
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 12px",
            background: "#124540",
            color: "#fff",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          <span>TOTAL GAJI</span>
          <span>{currency(totalAmount)}</span>
        </div>
      </div>

      {/* STATUS LUNAS */}
      <div style={{ marginBottom: "22px" }}>
        {paidLabel ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "10px",
              fontWeight: 700,
              color: "#15803d",
              border: "1px solid #86efac",
              background: "#f0fdf4",
              padding: "4px 10px",
              borderRadius: "999px",
            }}
          >
            ✓ LUNAS DIBAYAR — {paidLabel}
          </div>
        ) : (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "10px",
              fontWeight: 700,
              color: "#a16207",
              border: "1px solid #fde68a",
              background: "#fffbeb",
              padding: "4px 10px",
              borderRadius: "999px",
            }}
          >
            BELUM DIBAYAR
          </div>
        )}
      </div>

      {/* TANDA TANGAN */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "10px",
          marginTop: "auto",
        }}
      >
        <div style={{ textAlign: "center", width: "45%" }}>
          <div style={{ marginBottom: "40px" }}>Diterima oleh,</div>
          <div style={{ borderTop: "1px solid #a1a1aa", paddingTop: "4px" }}>
            {recipientName}
          </div>
        </div>
        <div style={{ textAlign: "center", width: "45%" }}>
          <div style={{ marginBottom: "40px" }}>Mengetahui,</div>
          <div style={{ borderTop: "1px solid #a1a1aa", paddingTop: "4px" }}>
            {companyName}
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  fontSize: "9px",
  textTransform: "uppercase",
  color: "#52525b",
  fontWeight: 700,
};

const tdStyle: CSSProperties = {
  padding: "6px 8px",
  color: "#27272a",
};
