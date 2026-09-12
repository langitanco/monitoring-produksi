// app/components/apps/CalculatorView.tsx

"use client";

import React, { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Info, ChevronDown, ChevronUp, X } from "lucide-react";

// Margin bertingkat berdasarkan qty.
// Kalau margin_tier2_percentage / margin_tier3_percentage belum diisi di
// tabel pricing_configs, fungsi ini otomatis fallback ke margin dasar
// (margin_percentage) supaya tidak ada perubahan harga tak sengaja
// sebelum nilainya benar-benar diisi.
function getMarginPercentage(qty: number, config: any): number {
  const base = config.margin_percentage ?? 0;
  const tier2Qty = config.margin_tier2_qty ?? 60;
  const tier3Qty = config.margin_tier3_qty ?? 120;
  const tier2Margin = config.margin_tier2_percentage ?? base;
  const tier3Margin = config.margin_tier3_percentage ?? tier2Margin;

  if (qty >= tier3Qty) return tier3Margin;
  if (qty >= tier2Qty) return tier2Margin;
  return base;
}

export default function CalculatorView() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>({});
  const [addons, setAddons] = useState<any[]>([]);

  const [mode, setMode] = useState("DTF");
  const [finalPrice, setFinalPrice] = useState(0);
  const [laborDetails, setLaborDetails] = useState({ gesut: 0, packing: 0 });
  const [appliedMargin, setAppliedMargin] = useState(0);

  const [inputs, setInputs] = useState({
    qty: 0,
    width: 0,
    length: 0,
    colorsSmall: 0,
    colorsMedium: 0,
    colorsLarge: 0,
    kaosPrice: 0,
  });

  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);

  // State UI mobile: accordion addon & bottom sheet rincian harga
  const [addonsOpen, setAddonsOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  // 1. FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      const { data: configData } = await supabase
        .from("pricing_configs")
        .select("key_name, value_amount");
      if (configData) {
        const configMap = configData.reduce((acc: any, item: any) => {
          acc[item.key_name] = Number(item.value_amount);
          return acc;
        }, {});
        setConfig(configMap);
      }
      const { data: addonData } = await supabase
        .from("product_addons")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (addonData) setAddons(addonData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const toggleAddon = (id: number) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // 3. KALKULASI UTAMA
  useEffect(() => {
    if (loading) return;
    const hasQty = inputs.qty > 0;
    const hasDtfDim = mode === "DTF" && inputs.width > 0 && inputs.length > 0;
    const hasManualColor =
      mode === "MANUAL" &&
      (inputs.colorsSmall > 0 ||
        inputs.colorsMedium > 0 ||
        inputs.colorsLarge > 0);

    if (
      !hasQty ||
      (mode === "DTF" && !hasDtfDim) ||
      (mode === "MANUAL" && !hasManualColor)
    ) {
      setFinalPrice(0);
      setLaborDetails({ gesut: 0, packing: 0 });
      return;
    }

    let hppSablon = 0;
    const marginPercentage = getMarginPercentage(inputs.qty, config);
    const margin = marginPercentage / 100;
    setAppliedMargin(marginPercentage);
    const safeQty = inputs.qty > 0 ? inputs.qty : 1;
    const costListrikLPG = config.cost_listrik_lpg ?? 0;
    const costPenunjang = config.cost_bahan_penunjang ?? 0;

    const totalBonusCost = selectedAddonIds.reduce((total, id) => {
      const item = addons.find((a) => a.id === id);
      return total + (item ? Number(item.cost) : 0);
    }, 0);

    const hppOperasionalTotal = costListrikLPG + costPenunjang + totalBonusCost;
    let currentGesutCost = 0;
    let currentPackingCost = 0;

    if (mode === "DTF") {
      const area = inputs.width * inputs.length;
      const dtfPricePerCm = config.dtf_price_per_cm ?? 0;
      const pressCost = config.dtf_press_cost ?? 0;
      const dtfTintaCostPerCm = config.dtf_tinta_cost ?? 0;
      const dtfPrintFilmCostPerPcs = config.cost_print_film ?? 0;

      hppSablon =
        area * dtfPricePerCm +
        area * dtfTintaCostPerCm +
        pressCost +
        dtfPrintFilmCostPerPcs;
      currentGesutCost = pressCost;
    } else {
      const paySmall = inputs.colorsSmall * (config.gesut_manual_kecil ?? 0);
      const payMedium = inputs.colorsMedium * (config.gesut_manual_sedang ?? 0);
      const payLarge = inputs.colorsLarge * (config.gesut_manual_besar ?? 0);
      const totalGesutPay = paySmall + payMedium + payLarge;

      const totalColors =
        inputs.colorsSmall + inputs.colorsMedium + inputs.colorsLarge;
      const screenCost = config.manual_screen_cost ?? 0;
      const totalSetupCost = screenCost * totalColors;
      const setupCostPerPcs = totalSetupCost / safeQty;

      const finishCost = config.manual_finishing ?? 0;
      const plastisolCostPerPcs = config.cost_plastisol_ink ?? 0;

      currentGesutCost = totalGesutPay;
      currentPackingCost = finishCost;
      hppSablon =
        setupCostPerPcs + totalGesutPay + finishCost + plastisolCostPerPcs;
    }

    setLaborDetails({ gesut: currentGesutCost, packing: currentPackingCost });
    const totalHPP = inputs.kaosPrice + hppSablon + hppOperasionalTotal;
    setFinalPrice(totalHPP + totalHPP * margin);
  }, [inputs, mode, config, loading, selectedAddonIds, addons]);

  const formatRupiahDisplay = (num: number) =>
    !num ? "" : "Rp " + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const formatNumberDisplay = (num: number) => (!num ? "" : num.toString());
  const handleInputChange = (e: any, field: string) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    setInputs((prev) => ({ ...prev, [field]: Number(rawValue) }));
  };
  const formatResult = (num: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] bg-transparent">
        <div className="w-12 h-12 border-4 border-blue-200 dark:border-slate-800 border-t-blue-600 rounded-full animate-spin mb-4"></div>
      </div>
    );

  const showResult = finalPrice > 0;
  const currentTotalBonus = selectedAddonIds.reduce((total, id) => {
    const item = addons.find((a) => a.id === id);
    return total + (item ? Number(item.cost) : 0);
  }, 0);
  const totalManualColors =
    inputs.colorsSmall + inputs.colorsMedium + inputs.colorsLarge;

  // Rincian hasil, dipakai bersama oleh panel desktop & bottom sheet mobile
  const resultDetails = (
    <>
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Total Omset</span>
        <span className="font-bold text-white">
          {formatResult(finalPrice * inputs.qty)}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Estimasi Margin</span>
        <span className="font-bold text-green-400">
          +{appliedMargin}%
          {appliedMargin < (config.margin_percentage ?? 0) && (
            <span className="text-[10px] text-blue-400 font-normal ml-1">
              (harga grosir)
            </span>
          )}
        </span>
      </div>
      <hr className="border-slate-700/50" />

      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Listrik/LPG & Penunjang</span>
        <span className="font-bold text-yellow-400">
          {formatResult(
            (config.cost_listrik_lpg ?? 0) + (config.cost_bahan_penunjang ?? 0),
          )}{" "}
          /pcs
        </span>
      </div>
      {currentTotalBonus > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Total Bonus</span>
          <span className="font-bold text-orange-400">
            +{formatResult(currentTotalBonus)} /pcs
          </span>
        </div>
      )}

      {mode === "MANUAL" ? (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">
              Total Warna ({totalManualColors})
            </span>
            <span className="font-bold text-white">
              {formatResult(laborDetails.gesut)}{" "}
              <span className="text-[10px] text-slate-500 font-normal">
                /pcs
              </span>
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Beban Screen/kaos</span>
            <span className="font-bold text-yellow-400">
              {formatResult(
                ((config.manual_screen_cost ?? 0) * totalManualColors) /
                  (inputs.qty || 1),
              )}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Cost Tinta & SDM</span>
            <span className="font-bold text-yellow-400">
              {formatResult(
                (config.cost_plastisol_ink ?? 0) +
                  laborDetails.gesut +
                  laborDetails.packing,
              )}{" "}
              /pcs
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">HPP Tinta & Film</span>
            <span className="font-bold text-yellow-400">
              {formatResult(
                inputs.width * inputs.length * (config.dtf_tinta_cost ?? 0) +
                  (config.cost_print_film ?? 0),
              )}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Cost Cetak & Press</span>
            <span className="font-bold text-yellow-400">
              {formatResult(
                inputs.width * inputs.length * (config.dtf_price_per_cm ?? 0) +
                  (config.dtf_press_cost ?? 0),
              )}{" "}
              /pcs
            </span>
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors duration-300">
      {/* PANEL KIRI: INPUT */}
      {/* pb-24 menyisakan ruang untuk sticky bottom bar harga di mobile, dihilangkan di desktop karena panel hasil sudah tampil di samping */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8 custom-scrollbar">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              Kalkulator Produksi
            </h2>
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full animate-pulse font-bold">
              ● Live
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex mb-6">
            <button
              onClick={() => setMode("DTF")}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${mode === "DTF" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
            >
              Sablon DTF
            </button>
            <button
              onClick={() => setMode("MANUAL")}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${mode === "MANUAL" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
            >
              Sablon Manual
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 space-y-5 md:space-y-6">
            {/* Qty & Harga Kaos digabung 2 kolom di semua ukuran layar */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">
                  Jumlah (Pcs)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberDisplay(inputs.qty)}
                  onChange={(e) => handleInputChange(e, "qty")}
                  className="w-full text-lg md:text-xl font-bold text-gray-900 dark:text-white bg-transparent border-gray-300 dark:border-slate-600 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-300 dark:placeholder-slate-600"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">
                  Harga Kaos
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatRupiahDisplay(inputs.kaosPrice)}
                  onChange={(e) => handleInputChange(e, "kaosPrice")}
                  className="w-full text-lg md:text-xl font-bold text-gray-900 dark:text-white bg-transparent border-gray-300 dark:border-slate-600 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-300 dark:placeholder-slate-600"
                  placeholder="Rp 0"
                />
              </div>
            </div>

            {mode === "DTF" ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">
                    Lebar (cm)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumberDisplay(inputs.width)}
                    onChange={(e) => handleInputChange(e, "width")}
                    className="w-full text-lg md:text-xl font-bold text-gray-900 dark:text-white bg-transparent border-gray-300 dark:border-slate-600 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-300 dark:placeholder-slate-600"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">
                    Panjang (cm)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumberDisplay(inputs.length)}
                    onChange={(e) => handleInputChange(e, "length")}
                    className="w-full text-lg md:text-xl font-bold text-gray-900 dark:text-white bg-transparent border-gray-300 dark:border-slate-600 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-300 dark:placeholder-slate-600"
                    placeholder="0"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      Detail Warna & Area
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 text-left truncate">
                        <span className="md:hidden">KECIL</span>
                        <span className="hidden md:inline">
                          KECIL (Logo/Label)
                        </span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumberDisplay(inputs.colorsSmall)}
                        onChange={(e) => handleInputChange(e, "colorsSmall")}
                        className="w-full font-bold text-slate-900 dark:text-white bg-transparent border-slate-300 dark:border-slate-600 border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-center"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 text-left truncate">
                        <span className="md:hidden">SEDANG</span>
                        <span className="hidden md:inline">SEDANG (A4)</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumberDisplay(inputs.colorsMedium)}
                        onChange={(e) => handleInputChange(e, "colorsMedium")}
                        className="w-full font-bold text-slate-900 dark:text-white bg-transparent border-slate-300 dark:border-slate-600 border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-center"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 text-left truncate">
                        <span className="md:hidden">BESAR</span>
                        <span className="hidden md:inline">
                          BESAR (A3/Blok)
                        </span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumberDisplay(inputs.colorsLarge)}
                        onChange={(e) => handleInputChange(e, "colorsLarge")}
                        className="w-full font-bold text-slate-900 dark:text-white bg-transparent border-slate-300 dark:border-slate-600 border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-center"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <hr className="border-dashed border-gray-200 dark:border-slate-700" />

            {/* Addon: accordion collapsed by default supaya tidak menambah panjang scroll */}
            <div>
              <button
                type="button"
                onClick={() => setAddonsOpen(!addonsOpen)}
                className="w-full flex items-center justify-between"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase cursor-pointer">
                  Tambahan / Bonus
                </label>
                <span className="flex items-center gap-2">
                  {selectedAddonIds.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {selectedAddonIds.length} dipilih
                    </span>
                  )}
                  {addonsOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </span>
              </button>

              {addonsOpen && (
                <div className="grid grid-cols-1 gap-2 mt-3">
                  {addons.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-slate-600 italic">
                      Tidak ada opsi bonus aktif.
                    </p>
                  ) : (
                    addons.map((addon) => (
                      <label
                        key={addon.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedAddonIds.includes(addon.id) ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedAddonIds.includes(addon.id)}
                            onChange={() => toggleAddon(addon.id)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 dark:border-slate-600 bg-transparent"
                          />
                          <span
                            className={`font-medium text-sm ${selectedAddonIds.includes(addon.id) ? "text-blue-900 dark:text-blue-300" : "text-gray-700 dark:text-slate-300"}`}
                          >
                            {addon.name}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-gray-500 dark:text-slate-400 font-bold">
                          +Rp {Number(addon.cost).toLocaleString("id-ID")}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PANEL KANAN: HASIL (desktop only, tampil di samping) */}
      <div
        className={`hidden md:flex md:w-1/3 p-6 md:p-10 flex-col justify-center border-t-4 md:border-t-0 md:border-l border-slate-700 dark:border-slate-800 transition-all duration-300 ${showResult ? "bg-slate-900 dark:bg-black/40 border-blue-500" : "bg-slate-800 dark:bg-slate-950/50 border-slate-600"}`}
      >
        <div className="max-w-sm mx-auto w-full">
          <p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-widest">
            Rekomendasi Harga Jual
          </p>
          <div
            className={`text-4xl md:text-5xl font-extrabold mb-2 tracking-tight truncate transition-all duration-300 ${showResult ? "text-white" : "text-slate-600"}`}
          >
            {showResult ? formatResult(finalPrice) : "Rp -"}
            <span
              className={`text-lg font-normal ml-1 ${showResult ? "text-slate-400" : "text-slate-700"}`}
            >
              /pcs
            </span>
          </div>

          {showResult ? (
            <div className="mt-6 space-y-3 border-t border-slate-700 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {resultDetails}
            </div>
          ) : (
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <p className="text-sm text-slate-500 italic">
                Silakan lengkapi input (Qty, Ukuran, atau Warna) untuk melihat
                estimasi harga.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* STICKY BOTTOM BAR: mobile only, selalu terlihat tanpa scroll */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 dark:bg-black border-t border-slate-700 dark:border-slate-800 px-4 py-3 safe-area-bottom">
        <button
          type="button"
          onClick={() => showResult && setDetailSheetOpen(true)}
          className="w-full flex items-center justify-between"
          style={{ WebkitTapHighlightColor: "transparent" }}
          disabled={!showResult}
        >
          <div className="text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Harga Jual /pcs
            </p>
            <p
              className={`text-xl font-extrabold ${showResult ? "text-white" : "text-slate-600"}`}
            >
              {showResult ? formatResult(finalPrice) : "Rp -"}
            </p>
          </div>
          {showResult && (
            <span className="flex items-center gap-1 text-xs font-bold text-blue-400">
              Rincian <ChevronUp className="w-4 h-4" />
            </span>
          )}
        </button>
      </div>

      {/* BOTTOM SHEET: rincian harga lengkap di mobile */}
      {detailSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDetailSheetOpen(false)}
          />
          <div className="relative bg-slate-900 dark:bg-black rounded-t-2xl border-t border-slate-700 px-5 pt-4 pb-8 max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-white">Rincian Harga</p>
              <button
                onClick={() => setDetailSheetOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                Rekomendasi Harga Jual
              </p>
              <p className="text-3xl font-extrabold text-white">
                {formatResult(finalPrice)}
                <span className="text-base font-normal text-slate-400 ml-1">
                  /pcs
                </span>
              </p>
            </div>
            <div className="space-y-3 border-t border-slate-700 pt-4">
              {resultDetails}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
