"use client";

import { memo, useState } from "react";
import { RefreshCw, X, Loader2 } from "lucide-react";
import { UpdateInfo } from "@/hooks/useUpdateCheck";

interface UpdateBannerProps {
  updateInfo: UpdateInfo;
  onUpdate: () => void;
  onDismiss: () => void;
}

const UpdateBanner = memo(function UpdateBanner({
  updateInfo,
  onUpdate,
  onDismiss,
}: UpdateBannerProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = () => {
    setIsUpdating(true);
    setTimeout(() => {
      onUpdate();
    }, 400);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center">
          <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
            Pembaruan tersedia{" "}
            <span className="font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
              {updateInfo.newVersion}
            </span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
            {updateInfo.releaseNotes}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onDismiss}
          disabled={isUpdating}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150 disabled:opacity-50"
          aria-label="Tutup notifikasi"
        >
          <X className="w-4 h-4" />
        </button>

        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors duration-150 disabled:opacity-60"
        >
          {isUpdating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Memperbarui…</span>
            </>
          ) : (
            <span>Update</span>
          )}
        </button>
      </div>
    </div>
  );
});

export default UpdateBanner;
