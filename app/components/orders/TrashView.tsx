// app/components/orders/TrashView.tsx

import React from "react";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Order } from "@/types";
import { RefreshCw, Trash2 } from "lucide-react";

interface TrashViewProps {
  orders: Order[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
}

export default function TrashView({
  orders,
  onRestore,
  onPermanentDelete,
}: TrashViewProps) {
  return (
    <div className="space-y-4 md:space-y-6 transition-colors duration-150">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-zinc-900 dark:text-white">
            Sampah
          </h2>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            {orders.length} pesanan terhapus
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        /* EMPTY STATE */
        <div className="text-center py-16 bg-white dark:bg-zinc-950/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center">
          <Trash2 className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
          <p className="text-zinc-400 dark:text-zinc-500 font-medium">
            Sampah kosong
          </p>
        </div>
      ) : (
        /* GRID LIST SAMPAH */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-5 relative overflow-hidden opacity-85 dark:opacity-90 transition-colors duration-150 hover:opacity-100 dark:hover:border-zinc-700"
            >
              {/* BADGE DIHAPUS */}
              <div className="absolute top-0 right-0 bg-zinc-500 dark:bg-zinc-700 text-white text-[10px] px-2 py-0.5 font-semibold rounded-bl-lg uppercase tracking-wider">
                DIHAPUS
              </div>

              <div className="flex justify-between items-start mb-2 md:mb-4 mt-1">
                <span className="text-[10px] md:text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md">
                  #{order.kode_produksi}
                </span>
                <span
                  className={`text-[9px] md:text-[10px] font-semibold px-2 py-0.5 md:px-2.5 md:py-1 rounded-full border uppercase tracking-wide whitespace-nowrap ${getStatusColor(order.status)}`}
                >
                  {order.status}
                </span>
              </div>

              <h3 className="font-semibold text-sm md:text-lg text-zinc-900 dark:text-white line-clamp-1 mb-0.5 leading-tight">
                {order.nama_pemesan}
              </h3>

              <div className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 mb-4 font-medium">
                Dihapus: {order.deleted_at ? formatDate(order.deleted_at) : "-"}
              </div>

              <div className="mt-2 flex gap-2">
                {/* TOMBOL PULIHKAN */}
                <button
                  onClick={() => onRestore(order.id)}
                  className="flex-1 bg-green-600 dark:bg-green-700 text-white px-3 py-1.5 md:py-2 rounded-md text-[10px] md:text-xs font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition-colors duration-150 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3 h-3 md:w-3.5 md:h-3.5" /> Pulihkan
                </button>

                {/* TOMBOL HAPUS PERMANEN */}
                <button
                  onClick={() => onPermanentDelete(order.id)}
                  className="flex-1 bg-red-600 dark:bg-red-700 text-white px-3 py-1.5 md:py-2 rounded-md text-[10px] md:text-xs font-semibold hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-150 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
