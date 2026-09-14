// app/components/apps/NotaView.tsx
"use client";

import React, { useState, useRef } from "react";
import { toJpeg } from "html-to-image"; // UPDATE: Menggunakan toJpeg untuk kompresi ukuran file
import jsPDF from "jspdf";
import { Download, Plus, Trash2 } from "lucide-react";

export default function NotaView() {
  const notaRef = useRef<HTMLDivElement>(null);

  // State Management
  const [kategori, setKategori] = useState("CSTM");
  const [noUrut, setNoUrut] = useState("");
  const [pelanggan, setPelanggan] = useState({
    nama: "",
    telepon: "",
    alamat: "",
  });
  const [items, setItems] = useState([{ id: 1, nama: "", harga: 0, qty: 1 }]);
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [isLunas, setIsLunas] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tanggalInput, setTanggalInput] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0]; // format YYYY-MM-DD, default hari ini
  });

  // Nomor Nota & tanggal cetak sekarang mengikuti tanggal yang diinput manual
  const selectedDate = tanggalInput
    ? new Date(`${tanggalInput}T00:00:00`)
    : new Date();
  const yy = selectedDate.getFullYear().toString().slice(-2);
  const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const dd = String(selectedDate.getDate()).padStart(2, "0");
  const dateStr = `${yy}${mm}${dd}`;
  const formattedNoUrut = noUrut ? String(noUrut).padStart(4, "0") : "0000";
  const nomorNota = `${kategori}-${dateStr}-${formattedNoUrut}`;

  const tanggalCetak = selectedDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Kalkulasi
  const grandTotal = items.reduce(
    (total, item) => total + item.harga * item.qty,
    0,
  );
  const sisaPembayaran = grandTotal - dpAmount;

  // Format Rupiah untuk tampilan teks Nota (dengan Rp)
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

  // Fungsi Helper untuk Auto-Format Rupiah di Input Form
  const formatRupiahInput = (value: string) => {
    const numberString = value.replace(/[^,\d]/g, "").toString();
    const split = numberString.split(",");
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
      const separator = sisa ? "." : "";
      rupiah += separator + ribuan.join(".");
    }
    return split[1] !== undefined ? rupiah + "," + split[1] : rupiah;
  };

  const parseRupiahInput = (value: string) => {
    const parsed = parseInt(value.replace(/[^0-9]/g, ""), 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), nama: "", harga: 0, qty: 1 }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleChangeItem = (id: number, field: string, value: any) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleDownloadPDF = async () => {
    if (!notaRef.current) return;
    setIsGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      // UPDATE: Rendering gambar menggunakan JPEG dengan pixelRatio 2 dan Quality 85% untuk meringankan ukuran file (< 1MB)
      const dataUrl = await toJpeg(notaRef.current, {
        pixelRatio: 3,
        quality: 1,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [107.5, 165],
      });

      // UPDATE: Tambahkan ke PDF sebagai JPEG
      pdf.addImage(dataUrl, "JPEG", 0, 0, 107.5, 165);

      // UPDATE: Format nama file (Tidak merubah spasi pada nama menjadi underscore)
      const fileName = pelanggan.nama
        ? `Nota ${nomorNota} ${pelanggan.nama}.pdf`
        : `Nota_${nomorNota}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("Gagal membuat PDF:", error);
      alert("Terjadi kesalahan saat mengekspor PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* ============================== */}
      {/* PANEL KIRI: FORM INPUT         */}
      {/* ============================== */}
      <div className="w-full lg:w-1/2 flex flex-col border-r border-zinc-200 dark:border-zinc-800 h-full max-h-[calc(100vh-100px)]">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center">
          <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Form Generator Nota
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          {/* Seksi Penomoran */}
          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.12em] mb-3">
              Penomoran Nota
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                  Kategori
                </label>
                <select
                  className="w-full text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-[#1b5e4a] focus:border-[#1b5e4a] transition-colors duration-150"
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                >
                  <option value="CSTM">Custom (CSTM)</option>
                  <option value="DTF">Print (DTF)</option>
                  <option value="SBLN">Sablon (SBLN)</option>
                  <option value="LCO">Langitan.co (LCO)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                  No Urut Hari Ini
                </label>
                <input
                  type="number"
                  className="w-full text-sm font-mono tabular-nums border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-[#1b5e4a] focus:border-[#1b5e4a] transition-colors duration-150"
                  value={noUrut}
                  onChange={(e) => setNoUrut(e.target.value)}
                  placeholder="Contoh: 12"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                  Tanggal Nota
                </label>
                <input
                  type="date"
                  className="w-full text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-[#1b5e4a] focus:border-[#1b5e4a] transition-colors duration-150"
                  value={tanggalInput}
                  onChange={(e) => setTanggalInput(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Seksi Pelanggan */}
          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h3 className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.12em] mb-1">
              Data Pelanggan
            </h3>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                Nama Pemesan
              </label>
              <input
                type="text"
                className="w-full text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-[#1b5e4a] focus:border-[#1b5e4a] transition-colors duration-150"
                value={pelanggan.nama}
                onChange={(e) =>
                  setPelanggan({ ...pelanggan, nama: e.target.value })
                }
                placeholder="Nama Lengkap"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                No. WhatsApp / Telepon
              </label>
              <input
                type="text"
                className="w-full text-sm font-mono tabular-nums border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-[#1b5e4a] focus:border-[#1b5e4a] transition-colors duration-150"
                value={pelanggan.telepon}
                onChange={(e) =>
                  setPelanggan({ ...pelanggan, telepon: e.target.value })
                }
                placeholder="08..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                Alamat (Opsional)
              </label>
              <textarea
                className="w-full text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-[#1b5e4a] focus:border-[#1b5e4a] resize-none h-16 transition-colors duration-150"
                value={pelanggan.alamat}
                onChange={(e) =>
                  setPelanggan({ ...pelanggan, alamat: e.target.value })
                }
                placeholder="Detail alamat pengiriman..."
              />
            </div>
          </div>

          {/* Seksi Barang */}
          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.12em]">
                Detail Pesanan
              </h3>
              <button
                onClick={handleAddItem}
                className="flex items-center gap-1 text-[10px] font-semibold bg-[#124540] text-white px-2 py-1 rounded-md hover:bg-[#144939] transition-colors duration-150"
              >
                <Plus className="w-3 h-3" /> Tambah Baris
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex gap-2 items-start bg-white dark:bg-zinc-950 p-2 rounded-md border border-zinc-200 dark:border-zinc-800"
                >
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      className="w-full text-xs border border-zinc-300 dark:border-zinc-700 rounded-md p-1.5 bg-transparent text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-[#1b5e4a] focus:border-[#1b5e4a] transition-colors duration-150"
                      placeholder="Nama Barang"
                      value={item.nama}
                      onChange={(e) =>
                        handleChangeItem(item.id, "nama", e.target.value)
                      }
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="w-1/4 text-xs font-mono tabular-nums border border-zinc-300 dark:border-zinc-700 rounded-md p-1.5 bg-transparent text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-[#1b5e4a] focus:border-[#1b5e4a] transition-colors duration-150"
                        placeholder="Qty"
                        value={item.qty || ""}
                        onChange={(e) =>
                          handleChangeItem(
                            item.id,
                            "qty",
                            parseInt(e.target.value) || 0,
                          )
                        }
                      />
                      <input
                        type="text"
                        className="w-3/4 text-xs font-mono tabular-nums border border-zinc-300 dark:border-zinc-700 rounded-md p-1.5 bg-transparent font-medium text-zinc-800 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-[#1b5e4a] focus:border-[#1b5e4a] transition-colors duration-150"
                        placeholder="Harga Satuan (Rp)"
                        value={
                          item.harga === 0
                            ? ""
                            : formatRupiahInput(item.harga.toString())
                        }
                        onChange={(e) =>
                          handleChangeItem(
                            item.id,
                            "harga",
                            parseRupiahInput(e.target.value),
                          )
                        }
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md mt-1 transition-colors duration-150"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Seksi Pembayaran (DP) */}
          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.12em] mb-3">
              Pembayaran
            </h3>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                Sudah Bayar / DP (Rp)
              </label>
              <input
                type="text"
                className="w-full text-sm font-mono tabular-nums border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-[#1b5e4a] focus:border-[#1b5e4a] transition-colors duration-150"
                value={
                  dpAmount === 0 ? "" : formatRupiahInput(dpAmount.toString())
                }
                onChange={(e) => setDpAmount(parseRupiahInput(e.target.value))}
                placeholder="Kosongkan jika belum bayar"
              />
            </div>
          </div>
        </div>

        {/* Action Bottom */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex justify-between items-center">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-[#1b5e4a] rounded border-zinc-300 dark:border-zinc-600"
              checked={isLunas}
              onChange={(e) => setIsLunas(e.target.checked)}
            />
            <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
              Tandai Lunas
            </span>
          </label>
          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-[#124540] text-white px-5 py-2 rounded-md font-semibold hover:bg-[#144939] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isGenerating ? (
              "Memproses..."
            ) : (
              <>
                <Download className="w-4 h-4" /> Export PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* ============================== */}
      {/* PANEL KANAN: LIVE PREVIEW      */}
      {/* ============================== */}
      <div className="w-full lg:w-1/2 bg-zinc-200 dark:bg-zinc-950 p-4 md:p-8 flex justify-center items-start overflow-y-auto min-h-[500px]">
        {/* Wrapper shadow untuk efek preview saja — TIDAK ikut di-capture html-to-image,
            supaya bayangan tidak muncul di file PDF/JPEG hasil ekspor */}
        <div className="shadow-xl">
          {/* Container Kustom 107.5mm x 165mm */}
          <div
            ref={notaRef}
            className="bg-white relative text-black"
            style={{
              width: "107.5mm",
              height: "165mm",
              boxSizing: "border-box",
            }}
          >
            {/* HEADER GAMBAR */}
            <div className="w-full h-[21.5mm] overflow-hidden mb-5">
              <img
                src="/header-nota.png"
                alt="Header Langitan"
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
                }}
              />
            </div>

            {/* Area Konten */}
            <div style={{ padding: "0 6mm" }}>
              {/* 1. Info Pelanggan & No Nota (Bersebelahan & Sesuai Desain Baru) */}
              <div className="flex justify-between items-start mb-4 mt-2">
                {/* Kiri: Kepada & Detail Pelanggan (Tanpa Label, Font Disesuaikan) */}
                <div className="w-[50%] flex flex-col">
                  <span className="text-[9px] text-zinc-800 mb-0.5">
                    Kepada :
                  </span>
                  <span className="text-[11.5px] font-bold text-zinc-900 leading-tight">
                    {pelanggan.nama ||
                      "..........................................."}
                  </span>
                  {pelanggan.telepon && (
                    <span className="text-[9px] text-zinc-800 mt-0.5 leading-tight">
                      {pelanggan.telepon}
                    </span>
                  )}
                  {pelanggan.alamat && (
                    <span className="text-[9px] italic text-zinc-800 mt-0.5 leading-tight">
                      {pelanggan.alamat}
                    </span>
                  )}
                </div>

                {/* Kanan: No Nota & Tanggal (Tabel Kanan Lebar Ditambah agar tidak wrap) */}
                <div className="w-[50%] flex justify-end mt-0.5">
                  <table className="w-auto text-[9px] border-collapse">
                    <tbody>
                      <tr>
                        <td className="text-zinc-800 align-top pr-2">
                          No Nota
                        </td>
                        <td className="text-zinc-800 align-top pr-1">:</td>
                        <td className="font-medium text-zinc-900 align-top whitespace-nowrap">
                          {nomorNota}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-zinc-800 align-top pr-2">
                          Tanggal
                        </td>
                        <td className="text-zinc-800 align-top pr-1">:</td>
                        <td className="font-medium text-zinc-900 align-top whitespace-nowrap">
                          {tanggalCetak}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2 & 3. Tabel Barang & Kalkulasi */}
              <div className="min-h-[45mm]">
                <table className="w-full mb-0 border-collapse">
                  <thead>
                    <tr className="bg-[#1b5e4a] text-white text-[9px]">
                      <th className="py-1 px-1 text-left border border-[#1b5e4a]">
                        Nama Barang / Deskripsi
                      </th>
                      <th className="py-1 px-1 text-center border border-[#1b5e4a] w-8">
                        Qty
                      </th>
                      <th className="py-1 px-1 text-right border border-[#1b5e4a] w-16">
                        Harga
                      </th>
                      <th className="py-1 px-1 text-right border border-[#1b5e4a] w-20">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[9px]">
                    {items.map((item, index) => (
                      <tr key={index} className="border-b border-zinc-300">
                        <td className="py-1 px-1 border-x border-zinc-300 text-zinc-800">
                          {item.nama || "-"}
                        </td>
                        <td className="py-1 px-1 border-x border-zinc-300 text-center text-zinc-800">
                          {item.qty}
                        </td>
                        <td className="py-1 px-1 border-x border-zinc-300 text-right text-zinc-800">
                          {formatRupiah(item.harga)}
                        </td>
                        <td className="py-1 px-1 border-x border-zinc-300 text-right text-zinc-800">
                          {formatRupiah(item.harga * item.qty)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Area Kalkulasi (Grand Total & DP) - Langsung menempel pas di bawah tabel */}
                <div className="flex justify-end mt-1">
                  <table className="w-[60%] text-[9px] border-collapse">
                    <tbody>
                      <tr className="bg-zinc-100 font-bold border-y-2 border-[#1b5e4a]">
                        <td className="py-1.5 px-2 text-right text-[#1b5e4a]">
                          GRAND TOTAL:
                        </td>
                        <td className="py-1.5 px-2 text-right text-[#1b5e4a] w-20">
                          {formatRupiah(grandTotal)}
                        </td>
                      </tr>
                      {dpAmount > 0 && (
                        <tr className="border-b border-zinc-300">
                          <td className="py-1 px-2 text-right text-zinc-600">
                            DP / Bayar:
                          </td>
                          <td className="py-1 px-2 text-right text-zinc-800">
                            {formatRupiah(dpAmount)}
                          </td>
                        </tr>
                      )}
                      {dpAmount > 0 && (
                        <tr className="border-b border-zinc-300 font-bold bg-red-50">
                          <td className="py-1 px-2 text-right text-red-600">
                            SISA:
                          </td>
                          <td className="py-1 px-2 text-right text-red-600">
                            {formatRupiah(sisaPembayaran)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 4. Footer & Signature - Selalu mengunci di bawah (Absolute Position) */}
            <div className="absolute bottom-[6mm] left-[6mm] right-[6mm] flex justify-between items-end">
              <div className="w-[55%]">
                <p className="text-[9px] font-bold text-zinc-800 mb-1">
                  Syarat & Ketentuan:
                </p>
                <p className="text-[8px] italic text-zinc-600 leading-tight">
                  Barang yang sudah dibeli tidak bisa dikembalikan kecuali
                  sebelumnya terdapat perjanjian.
                </p>
              </div>

              {/* Area Hormat Kami */}
              <div className="w-[40%] text-center relative z-10">
                <p className="text-[9px] text-zinc-800">Hormat Kami,</p>

                {/* Area celah kosong (Tanda Tangan) / Stempel Lunas ditaruh di sini */}
                <div className="h-12 relative flex items-center justify-center">
                  {isLunas && (
                    <div className="transform -rotate-12 opacity-50 pointer-events-none">
                      <div className="border-2 border-red-600 text-red-600 rounded p-1 bg-white/90">
                        <span className="text-xl font-black tracking-widest block text-center">
                          LUNAS
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[9px] font-bold text-zinc-800 border-t border-zinc-400 pt-1">
                  Admin Langitan.co
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
