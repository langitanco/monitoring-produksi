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
      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${isActive ? "bg-green-500" : "bg-gray-300 dark:bg-slate-700"}`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${isActive ? "translate-x-6" : "translate-x-0"}`}
      ></div>
    </div>
  );

  if (loading && configs.length === 0)
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-200 dark:border-slate-800 border-t-blue-600 rounded-full animate-spin mb-4"></div>
      </div>
    );

  const categories = ["GENERAL", "DTF", "MANUAL", "GROSIR"];

  return (
    <div className="space-y-8 pb-20 transition-colors duration-300">
      {/* ✅ KOMPONEN CUSTOM ALERT */}
      <CustomAlert alertState={alertState} closeAlert={closeAlert} />

      {/* HEADER */}
      <div className="sticky -top-3 z-20 pb-4 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Pengaturan Harga
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Kelola variabel HPP dasar & harga add-ons.
          </p>
        </div>
        <button
          onClick={handleSaveConfigs}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl font-bold transition shadow-lg  active:scale-95 disabled:opacity-70"
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
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="font-bold text-slate-800 dark:text-white">
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
                        <label className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                          {item.display_name}
                        </label>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {item.unit}
                        </span>
                      </div>
                      <div className="relative">
                        {isCurrency && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
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
                          className={`block w-full py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-bold text-lg outline-none transition ${isCurrency ? "pl-9 pr-3" : "pl-4 pr-8"}`}
                        />
                        {isPercentage && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h3 className="font-bold text-slate-800 dark:text-white text-lg">
            Daftar Bonus & Add-ons
          </h3>
          <div className="flex flex-col md:flex-row gap-2 md:items-center w-full md:w-auto">
            <input
              type="text"
              placeholder="Nama Item"
              value={newAddonName}
              onChange={(e) => setNewAddonName(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm w-full md:w-48"
            />
            <input
              type="number"
              placeholder="Harga (Rp)"
              value={newAddonCost}
              onChange={(e) => setNewAddonCost(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm w-full md:w-32"
            />
            <button
              onClick={handleAddAddon}
              className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-4 px-6 font-semibold w-32">Status</th>
                <th className="py-4 px-6 font-semibold">Nama Item</th>
                <th className="py-4 px-6 font-semibold">HPP (Rp)</th>
                <th className="py-4 px-6 text-center font-semibold w-32">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {addons.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-slate-400 dark:text-slate-600"
                  >
                    Belum ada data add-ons.
                  </td>
                </tr>
              ) : (
                addons.map((addon) => (
                  <tr
                    key={addon.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
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
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${addon.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"}`}
                        >
                          {addon.is_active ? "AKTIF" : "OFF"}
                        </span>
                      )}
                    </td>
                    {editingId === addon.id ? (
                      <>
                        <td className="py-3 px-6">
                          <input
                            type="text"
                            className="w-full bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-900 rounded px-3 py-1.5 text-sm dark:text-white outline-none"
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
                            className="w-full bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-900 rounded px-3 py-1.5 text-sm dark:text-white outline-none"
                            value={tempEditData.cost}
                            onChange={(e) =>
                              setTempEditData({
                                ...tempEditData,
                                cost: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="py-3 px-6 flex justify-center gap-2">
                          <button
                            onClick={() => handleUpdateAddon(addon.id)}
                            className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-6 font-bold text-slate-800 dark:text-slate-200">
                          {addon.name}
                        </td>
                        <td className="py-3 px-6 font-mono text-slate-700 dark:text-slate-400">
                          Rp {Number(addon.cost).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-6 flex justify-center gap-2">
                          <button
                            onClick={() => startEditing(addon)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddon(addon.id)}
                            className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
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
        <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {addons.map((addon) => (
            <div key={addon.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${addon.is_active ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600"}`}
                  >
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {addon.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      Rp {Number(addon.cost).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEditing(addon)}
                    className="p-2 text-blue-600 dark:text-blue-400"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAddon(addon.id)}
                    className="p-2 text-red-500 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
