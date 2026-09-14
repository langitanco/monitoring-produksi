// app/components/orders/detail/LabelPengiriman.tsx

import React from "react";
import { Order } from "@/types";

interface LabelPengirimanProps {
  order: Order;
  labelRef: React.RefObject<HTMLDivElement | null>;
}

export default function LabelPengiriman({
  order,
  labelRef,
}: LabelPengirimanProps) {
  return (
    <div className="fixed left-[-9999px] top-[-9999px] z-[-1]">
      <div
        ref={labelRef}
        className="bg-white text-black border border-black flex flex-col relative"
        style={{
          width: "165mm",
          height: "107.5mm",
          boxSizing: "border-box",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Main Content */}
        <div className="flex-1 flex flex-col p-6 pb-2">
          <div className="flex-1" />

          {/* Pengirim & Penerima */}
          <div className="flex justify-between items-start w-full h-[35mm]">
            {/* Pengirim */}
            <div className="w-[45%] text-left flex flex-col h-full">
              <p className="text-[10px] font-bold text-gray-700 mb-1 uppercase tracking-widest">
                Pengirim :
              </p>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                Langitan.co
              </h1>
              <div className="mt-1">
                <p className="text-[10px] leading-tight text-gray-700">
                  Jl. Raya Widang - Babat PO BOX 02 Babat
                  <br />
                  Mandungan, Widang, Tuban, Jawa Timur
                </p>
                <p className="text-[10px] font-bold text-black mt-1">
                  +62 851-8466-6545
                </p>
              </div>
            </div>

            {/* Garis Tengah */}
            <div className="w-[2px] bg-black h-full" />

            {/* Penerima */}
            <div className="w-[45%] text-right flex flex-col items-end h-full">
              <p className="text-[10px] font-bold text-gray-700 mb-1 uppercase tracking-widest">
                Penerima :
              </p>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1 leading-tight">
                {order.nama_pemesan}
              </h1>
              <div className="mt-1 w-full flex flex-col items-end">
                <p className="text-[10px] leading-tight text-gray-700 text-right w-full">
                  {order.alamat_pemesan
                    ? order.alamat_pemesan.split("\n").map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          <br />
                        </React.Fragment>
                      ))
                    : "Alamat lengkap belum dicantumkan"}
                </p>
                <p className="text-[10px] font-bold text-black mt-1">
                  {order.no_hp}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-black p-2 flex justify-center items-center h-[12mm]">
          <p className="text-[10px] font-bold text-gray-900 leading-tight m-0 text-center uppercase tracking-wider">
            Mohon untuk melakukan video unboxing ya, Tanpa bukti video unboxing
            komplain tidak diterima
          </p>
        </div>
      </div>
    </div>
  );
}
