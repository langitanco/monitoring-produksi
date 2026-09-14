// app/components/apps/ConfigPriceView.tsx

"use client";

import React, { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Save, Plus, Trash2, Edit2, X, Check, Package } from "lucide-react";
// IMPORT CUSTOM ALERT
import CustomAlert from "@/app/components/ui/CustomAlert";

export default function ConfigPriceView() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State Data
  const [configs, setConfigs] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);

  // State UI
  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonCost, setNewAddonCost] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempEditData, setTempEditData] = useState({
    name: "",
    cost: "",
    is_active: true,
  });

  // ✅ STATE UNTUK CUSTOM ALERT (PENGGANTI ALERT CHROME)
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "confirm";
    onConfirm?: () => void;
  }>({ isOpen: false, title: "", message: "", type: "success" });

  // Helper untuk memanggil alert
  const showAlert = (
    title: string,
    message: string,
    type: "success" | "error" | "confirm" = "success",
    onConfirm?: () => void,
  ) => {
    setAlertState({ isOpen: true, title, message, type, onConfirm });
  };

  const closeAlert = () =>
    setAlertState((prev) => ({ ...prev, isOpen: false }));

  // 1. FETCH DATA
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: configData } = await supabase
      .from("pricing_configs")
      .select("*");
    const { data: addonData } = await supabase
      .from("product_addons")
      .select("*")
      .order("id", { ascending: true });

    if (configData) {
      const sortPriority: Record<string, number> = {
        gesut_manual_kecil: 1,
        gesut_manual_sedang: 2,
        gesut_manual_besar: 3,
      };
      const sortedConfigs = configData.sort((a, b) => {
        if (a.category !== b.category)
          return a.category.localeCompare(b.category);
        const priorityA = sortPriority[a.key_name] || 99;
        const priorityB = sortPriority[b.key_name] || 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.display_name.localeCompare(b.display_name);
      });
      setConfigs(sortedConfigs);
    }
    if (addonData) setAddons(addonData);
    setLoading(false);
  };

  const handleConfigChange = (e: any, id: number) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    setConfigs((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, value_amount: Number(rawValue) } : item,
      ),
    );
  };

  const handleSaveConfigs = async () => {
    setSaving(true);
    try {
      for (const item of configs) {
        if (typeof item.value_amount === "number") {
          await supabase
            .from("pricing_configs")
            .update({ value_amount: item.value_amount })
            .eq("id", item.id);
        }
      }
      // ✅ GUNAKAN CUSTOM ALERT
      showAlert(
        "Berhasil!",
        "Konfigurasi harga produksi telah diperbarui.",
        "success",
      );
    } catch (error) {
      showAlert("Gagal!", "Terjadi kesalahan saat menyimpan data.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddon = async () => {
    if (!newAddonName || !newAddonCost)
      return showAlert("Input Kosong", "Nama dan Harga harus diisi!", "error");

    const { error } = await supabase.from("product_addons").insert({
      name: newAddonName,
      cost: Number(newAddonCost),
      is_active: true,
    });

    if (error) showAlert("Gagal", error.message, "error");
    else {
      setNewAddonName("");
      setNewAddonCost("");
      fetchData();
      showAlert(
        "Ditambahkan",
        `${newAddonName} berhasil masuk daftar bonus.`,
        "success",
      );
    }
  };

  const startEditing = (addon: any) => {
    setEditingId(addon.id);
    setTempEditData({
      name: addon.name,
      cost: addon.cost,
      is_active: addon.is_active,
    });
  };

  const handleUpdateAddon = async (id: number) => {
    const { error } = await supabase
      .from("product_addons")
      .update({
        name: tempEditData.name,
        cost: Number(tempEditData.cost),
        is_active: Boolean(tempEditData.is_active),
      })
      .eq("id", id);

    if (error) showAlert("Gagal", error.message, "error");
    else {
      setEditingId(null);
      fetchData();
      showAlert("Diperbarui", "Item bonus berhasil diubah.", "success");
    }
  };

  const handleDeleteAddon = async (id: number) => {
    // ✅ GUNAKAN KONFIRMASI GAYA MODAL
    showAlert(
      "Hapus Item?",
      "Item ini akan dihapus permanen dari daftar bonus.",
      "confirm",
      async () => {
        const { error } = await supabase
          .from("product_addons")
          .delete()
          .eq("id", id);
        if (error) showAlert("Gagal", error.message, "error");
        else fetchData();
      },
    );
  };

  const StatusSwitch = ({
    isActive,
    onToggle,
  }: {
    isActive: boolean;
    onToggle: () => void;
  }) => (
    <div
      onClick={onToggle}
      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-150 ${isActive ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"}`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-150 ${isActive ? "translate-x-6" : "translate-x-0"}`}
      ></div>
    </div>
  );

  if (loading && configs.length === 0)
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-800 border-t-[#124540] rounded-full animate-spin mb-4"></div>
      </div>
    );

  const categories = ["GENERAL", "DTF", "MANUAL", "GROSIR"];

  return (
    <div className="space-y-8 pb-20 transition-colors duration-150">
      {/* ✅ KOMPONEN CUSTOM ALERT */}
      <CustomAlert alertState={alertState} closeAlert={closeAlert} />

      {/* HEADER */}
      <div className="sticky -top-3 z-20 pb-4 pt-1 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Pengaturan Harga
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Kelola variabel HPP dasar & harga add-ons.
          </p>
        </div>
        <button
          onClick={handleSaveConfigs}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-[#124540] hover:bg-[#0d332f] text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-150 disabled:opacity-60"
        >
          <Save className="w-4 h-4" />{" "}
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>

      {/* SECTION 1: CONFIG UTAMA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const categoryItems = configs.filter((item) => item.category === cat);
          if (categoryItems.length === 0) return null;
          return (
            <div
              key={cat}
              className="bg-white dark:bg-zinc-950 p-5 md:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {cat}
                </h3>
              </div>
              <div className="space-y-5 flex-1">
                {categoryItems.map((item) => {
                  const isPercentage = item.unit === "%";
                  const isCurrency = !isPercentage && item.unit !== "pcs";
                  return (
                    <div key={item.id}>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                          {item.display_name}
                        </label>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">
                          {item.unit}
                        </span>
                      </div>
                      <div className="relative">
                        {isCurrency && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                            Rp
                          </span>
                        )}
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.value_amount
                            .toString()
                            .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                          onChange={(e) => handleConfigChange(e, item.id)}
                          className={`block w-full py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#124540] focus:border-[#124540] text-zinc-900 dark:text-zinc-100 font-mono tabular-nums font-semibold text-lg transition-colors duration-150 ${isCurrency ? "pl-9 pr-3" : "pl-4 pr-8"}`}
                        />
                        {isPercentage && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 text-sm font-semibold">
                            %
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 2: ADD-ONS */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-5 md:p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Daftar Bonus & Add-ons
          </h3>
          <div className="flex flex-col md:flex-row gap-2 md:items-center w-full md:w-auto">
            <input
              type="text"
              placeholder="Nama Item"
              value={newAddonName}
              onChange={(e) => setNewAddonName(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#124540] focus:border-[#124540] text-zinc-900 dark:text-zinc-100 text-sm w-full md:w-48 transition-colors duration-150"
            />
            <input
              type="number"
              placeholder="Harga (Rp)"
              value={newAddonCost}
              onChange={(e) => setNewAddonCost(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#124540] focus:border-[#124540] text-zinc-900 dark:text-zinc-100 text-sm w-full md:w-32 font-mono tabular-nums transition-colors duration-150"
            />
            <button
              onClick={handleAddAddon}
              className="bg-[#124540] hover:bg-[#0d332f] text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors duration-150 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-6 text-[11px] font-semibold uppercase tracking-wide w-32">
                  Status
                </th>
                <th className="py-3 px-6 text-[11px] font-semibold uppercase tracking-wide">
                  Nama Item
                </th>
                <th className="py-3 px-6 text-[11px] font-semibold uppercase tracking-wide">
                  HPP (Rp)
                </th>
                <th className="py-3 px-6 text-center text-[11px] font-semibold uppercase tracking-wide w-32">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {addons.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-zinc-400 dark:text-zinc-600"
                  >
                    Belum ada data add-ons.
                  </td>
                </tr>
              ) : (
                addons.map((addon) => (
                  <tr
                    key={addon.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors duration-150 group"
                  >
                    <td className="py-3 px-6">
                      {editingId === addon.id ? (
                        <StatusSwitch
                          isActive={tempEditData.is_active}
                          onToggle={() =>
                            setTempEditData({
                              ...tempEditData,
                              is_active: !tempEditData.is_active,
                            })
                          }
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${addon.is_active ? "bg-emerald-600" : "bg-zinc-400 dark:bg-zinc-600"}`}
                          />
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wide ${addon.is_active ? "text-emerald-600" : "text-zinc-400 dark:text-zinc-500"}`}
                          >
                            {addon.is_active ? "Aktif" : "Off"}
                          </span>
                        </span>
                      )}
                    </td>
                    {editingId === addon.id ? (
                      <>
                        <td className="py-3 px-6">
                          <input
                            type="text"
                            className="w-full bg-white dark:bg-zinc-900 border border-[#2589ff]/50 dark:border-[#2589ff]/40 rounded-md px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-colors duration-150"
                            value={tempEditData.name}
                            onChange={(e) =>
                              setTempEditData({
                                ...tempEditData,
                                name: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="py-3 px-6">
                          <input
                            type="number"
                            className="w-full bg-white dark:bg-zinc-900 border border-[#2589ff]/50 dark:border-[#2589ff]/40 rounded-md px-3 py-1.5 text-sm font-mono tabular-nums text-zinc-900 dark:text-zinc-100 outline-none transition-colors duration-150"
                            value={tempEditData.cost}
                            onChange={(e) =>
                              setTempEditData({
                                ...tempEditData,
                                cost: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="py-3 px-6 flex justify-center gap-1">
                          <button
                            onClick={() => handleUpdateAddon(addon.id)}
                            className="p-1.5 text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors duration-150"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-red-600 dark:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors duration-150"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-6 font-semibold text-zinc-800 dark:text-zinc-200">
                          {addon.name}
                        </td>
                        <td className="py-3 px-6 font-mono tabular-nums text-zinc-700 dark:text-zinc-400">
                          Rp {Number(addon.cost).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-6 flex justify-center gap-1">
                          <button
                            onClick={() => startEditing(addon)}
                            className="p-1.5 text-zinc-400 hover:text-[#2589ff] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors duration-150"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddon(addon.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors duration-150"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE VIEW */}
        <div className="md:hidden flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {addons.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-600">
              Belum ada data add-ons.
            </div>
          ) : (
            addons.map((addon) => (
              <div key={addon.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                        {addon.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                          Rp {Number(addon.cost).toLocaleString("id-ID")}
                        </p>
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${addon.is_active ? "bg-emerald-600" : "bg-zinc-400 dark:bg-zinc-600"}`}
                          />
                          <span
                            className={`text-[10px] font-semibold uppercase tracking-wide ${addon.is_active ? "text-emerald-600" : "text-zinc-400 dark:text-zinc-500"}`}
                          >
                            {addon.is_active ? "Aktif" : "Off"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditing(addon)}
                      className="p-1.5 text-zinc-400 hover:text-[#2589ff] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors duration-150"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAddon(addon.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors duration-150"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
