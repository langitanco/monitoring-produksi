// app/(auth)/login/page.tsx (atau lokasi file LoginScreen Anda)
"use client";

import React, { useState } from "react";
import { ClipboardList, Eye, EyeOff } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginScreen() {
  // PERBAIKAN: dibuat SEKALI saja lewat lazy initializer useState,
  // bukan setiap render. Sebelumnya client dibuat ulang di setiap
  // ketikan huruf (karena re-render), yang memicu request berulang
  // ke Supabase dan menghabiskan rate limit.
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (loginError) {
        throw loginError;
      }

      window.location.reload();
    } catch (err: any) {
      setError("Login Gagal. Cek Email & Password Anda.");
      console.error("Login Error:", err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 p-4 transition-colors duration-150">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden transition-colors duration-150">
        <div className="p-6 md:p-8 w-full">
          <div className="text-center mb-8">
            <div className="bg-zinc-900 dark:bg-zinc-100 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-7 h-7 text-white dark:text-zinc-900" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 transition-colors duration-150">
              Login Langitan.co
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 font-medium transition-colors duration-150">
              Masuk Sistem Produksi
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2 tracking-[0.12em] transition-colors duration-150">
                Email
              </label>
              <input
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                className="w-full p-3 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 hover:border-[#49bfb4]/50 focus:ring-2 focus:ring-[#49bfb4] focus:border-[#49bfb4] outline-none transition-colors duration-150 font-medium text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
                placeholder="masukkan email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2 tracking-[0.12em] transition-colors duration-150">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full p-3 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 hover:border-[#49bfb4]/50 focus:ring-2 focus:ring-[#49bfb4] focus:border-[#49bfb4] outline-none transition-colors duration-150 font-medium text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 pr-12"
                  placeholder="masukkan password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-[#49bfb4] dark:hover:text-[#49bfb4] p-1 rounded-md transition-colors duration-150"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-xs text-center font-semibold bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-100 dark:border-red-800/50 transition-colors duration-150">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#124540] hover:bg-[#0d332f] text-white py-3 rounded-md font-semibold text-sm transition-colors duration-150 disabled:bg-zinc-400 dark:disabled:bg-zinc-700"
            >
              {loading ? "Memproses..." : "Login"}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors duration-150">
            Pastikan akun Anda sudah terdaftar untuk bisa melanjutkan.
          </div>
        </div>
      </div>
    </div>
  );
}
