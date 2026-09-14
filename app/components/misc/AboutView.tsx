// app/components/misc/AboutView.tsx
"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";
import { APP_INFO, CHANGELOG } from "@/lib/changelog";

export default function AboutView() {
  const [showChangelog, setShowChangelog] = useState(false);

  return (
    <div className="flex justify-center items-start min-h-full p-2 md:p-8">
      <div className="w-full max-w-2xl rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/80 dark:bg-zinc-900/90 shadow-sm p-5 md:p-8 space-y-6">
        {/* Header Aplikasi */}
        <div className="text-center">
          <div className="bg-[#124540] w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-3">
            <Zap className="w-7 h-7 md:w-8 md:h-8 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {APP_INFO.name}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs md:text-sm mt-1">
            {APP_INFO.purpose}
          </p>
        </div>

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

        {/* Detail Aplikasi */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            Detail Aplikasi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 md:gap-y-3 text-xs md:text-sm">
            <p className="text-zinc-500 dark:text-zinc-400">Versi Saat Ini:</p>
            <p className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
              {APP_INFO.version} (Latest)
            </p>
            <p className="text-zinc-500 dark:text-zinc-400">Platform:</p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              Next.js & Supabase
            </p>
          </div>
        </div>

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

        {/* Pengembang */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            Pengembang
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 md:gap-y-3 text-xs md:text-sm">
            <p className="text-zinc-500 dark:text-zinc-400">Dibuat Oleh:</p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              {APP_INFO.creator}
            </p>
            <p className="text-zinc-500 dark:text-zinc-400">
              Tanggal Peluncuran:
            </p>
            <p className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
              {APP_INFO.creationDate}
            </p>
          </div>
        </div>

        <div className="h-px bg-zinc-200 dark:bg-zinc-800" />

        {/* Changelog */}
        <div>
          <button
            onClick={() => setShowChangelog(!showChangelog)}
            className="w-full flex items-center justify-between p-3 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors duration-150 group"
          >
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Riwayat Pembaruan (Changelog)
            </span>
            {showChangelog ? (
              <ChevronUp className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
            )}
          </button>

          {showChangelog && (
            <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {CHANGELOG.map((log, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        Versi {log.version}
                      </span>
                      {index === 0 && (
                        <span className="font-mono tabular-nums text-[10px] px-2 py-0.5 rounded-full border border-zinc-300/70 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300">
                          Terbaru
                        </span>
                      )}
                    </span>
                    <span className="font-mono tabular-nums text-[10px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800">
                      {log.date}
                    </span>
                  </div>
                  <ul className="space-y-1.5 pl-1">
                    {log.changes.map((change, idx) => (
                      <li
                        key={idx}
                        className="text-xs md:text-sm text-zinc-600 dark:text-zinc-300 flex items-start gap-2"
                      >
                        <span className="block w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 mt-1.5 flex-shrink-0" />
                        <span className="leading-relaxed">{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
