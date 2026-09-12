// app/components/layout/Header.tsx
"use client";

import React, { useState } from "react";
import {
  Menu,
  Bell,
  LogOut,
  AlertTriangle,
  Info,
  CheckCircle,
} from "lucide-react";
import { UserData } from "@/types";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  orderId?: string;
  type?: "warning" | "info" | "success"; // opsional, fallback ke 'info'
}

interface HeaderProps {
  currentUser: UserData;
  onToggleSidebar: () => void;
  onLogout: () => void;
  sidebarOpen: boolean;
  currentPage?: string;
  notifications?: Notification[];
  onNotificationClick?: (notificationId: string, orderId: string) => void;
  onMarkAllRead?: () => void; // callback untuk tandai semua dibaca
}

// ─── Helper: ikon & warna per tipe notifikasi ────────────────────────────────

function NotifIcon({ type }: { type: "warning" | "info" | "success" }) {
  if (type === "warning") {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 dark:bg-amber-900/30">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      </div>
    );
  }
  if (type === "success") {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-50 dark:bg-emerald-900/30">
        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }
  // default: info
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50 dark:bg-blue-900/30">
      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    </div>
  );
}

// ─── Komponen: Panel Notifikasi ──────────────────────────────────────────────

interface NotifPanelProps {
  notifications: Notification[];
  onNotificationClick: (notif: Notification) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}

function NotifPanel({
  notifications,
  onNotificationClick,
  onMarkAllRead,
  onClose,
}: NotifPanelProps) {
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const hasUnread = unreadCount > 0;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-30 bg-black/10 dark:bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="
        fixed md:absolute right-4 md:right-0 top-24 md:top-full md:mt-2
        w-[calc(100vw-2rem)] md:w-80 max-w-sm
        bg-white dark:bg-slate-800
        rounded-2xl border border-slate-200 dark:border-slate-700
        shadow-xl z-40 overflow-hidden
        animate-in fade-in slide-in-from-top-2 md:slide-in-from-top-0 duration-200
      "
      >
        {/* Header panel */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Notifikasi
            </span>
            {hasUnread && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800">
                {unreadCount} baru
              </span>
            )}
          </div>
          {hasUnread && (
            <button
              onClick={onMarkAllRead}
              className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition whitespace-nowrap"
            >
              Tandai semua dibaca
            </button>
          )}
        </div>

        {/* List notifikasi */}
        {notifications.length === 0 ? (
          <div className="py-10 px-4 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Bell className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Semua sudah dibaca
            </p>
          </div>
        ) : (
          <div className="max-h-[60vh] md:max-h-96 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50">
            {notifications.map((notif) => {
              const type = notif.type ?? "info";
              return (
                <div
                  key={notif.id}
                  onClick={() => onNotificationClick(notif)}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition
                    hover:bg-slate-50 dark:hover:bg-slate-700/50
                    active:bg-slate-100 dark:active:bg-slate-700
                    ${!notif.isRead ? "bg-blue-50/40 dark:bg-blue-900/10" : ""}
                  `}
                >
                  {/* Ikon tipe */}
                  <NotifIcon type={type} />

                  {/* Konten */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 leading-tight">
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap flex-shrink-0 mt-0.5">
                        {notif.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    {notif.orderId && (
                      <p className="text-[10px] font-mono text-blue-500 dark:text-blue-400 mt-1">
                        #{notif.orderId}
                      </p>
                    )}
                  </div>

                  {/* Dot unread */}
                  {!notif.isRead && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Komponen Utama: Header ──────────────────────────────────────────────────

export default function Header({
  currentUser,
  onToggleSidebar,
  onLogout,
  sidebarOpen,
  currentPage = "dashboard",
  notifications = [],
  onNotificationClick,
  onMarkAllRead,
}: HeaderProps) {
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const pageTitles: Record<string, string> = {
    dashboard: "Dashboard",
    orders: "Daftar Pesanan",
    completed_orders: "Arsip Selesai",
    trash: "Sampah",
    settings: "Pengaturan",
    kalkulator: "Kalkulator HPP",
    config_harga: "Konfigurasi Harga",
    about: "Tentang Aplikasi",
    default: "Langitan.co",
  };

  const currentTitle = pageTitles[currentPage] ?? pageTitles.default;

  const handleNotificationClick = (notif: Notification) => {
    setShowNotif(false);
    if (notif.orderId && onNotificationClick) {
      onNotificationClick(notif.id, notif.orderId);
    }
  };

  const handleMarkAllRead = () => {
    onMarkAllRead?.();
    // Tidak langsung tutup panel supaya user bisa lihat perubahannya
  };

  return (
    <header
      className={`
      sticky top-0 h-20 px-4 md:px-10 flex items-center justify-between transition-all duration-300
      z-20 border-b border-transparent dark:border-transparent
      ${
        sidebarOpen
          ? "bg-gray-100/40 backdrop-blur-xl dark:bg-slate-900/80"
          : "bg-gray-100 dark:bg-slate-950"
      }
      md:bg-gray-100 md:dark:bg-slate-950 md:backdrop-blur-none
    `}
    >
      {/* ── KIRI ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-200 md:hidden hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 shadow-sm active:scale-95 transition-transform"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="hidden md:block">
          {currentPage === "dashboard" && (
            <>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                Assalamu'alaikum
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Selamat datang kembali, {currentUser.name} 👋
              </p>
            </>
          )}
        </div>

        <div className="md:hidden">
          <h1 className="text-lg font-extrabold text-slate-800 dark:text-white tracking-tight">
            {currentTitle}
          </h1>
        </div>
      </div>

      {/* ── KANAN ── */}
      <div className="flex items-center gap-3">
        {/* Bell notifikasi */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotif(!showNotif);
              setShowProfile(false);
            }}
            className="p-2.5 md:p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-500 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition relative shadow-sm active:scale-95"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800" />
            )}
          </button>

          {showNotif && (
            <NotifPanel
              notifications={notifications}
              onNotificationClick={handleNotificationClick}
              onMarkAllRead={handleMarkAllRead}
              onClose={() => setShowNotif(false)}
            />
          )}
        </div>

        {/* Profil user (mobile only) */}
        <div className="relative md:hidden">
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotif(false);
            }}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm overflow-hidden active:scale-95 transition-transform"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt="User"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 w-full h-full flex items-center justify-center">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            )}
          </button>

          {showProfile && (
            <>
              <div
                className="fixed inset-0 z-30 bg-black/10 dark:bg-black/50"
                onClick={() => setShowProfile(false)}
              />
              <div
                className="
                fixed md:absolute right-4 md:right-0 top-24 md:top-full md:mt-2
                w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700
                z-40 p-2 animate-in fade-in slide-in-from-top-2 duration-200
              "
              >
                <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-700">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase">
                    {currentUser.role}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowProfile(false);
                    onLogout();
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 rounded-xl flex items-center gap-2 font-bold transition mt-1"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
