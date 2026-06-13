"use client";

import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Lock, User, LogIn, AlertCircle } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();

      // 🌟 เปลี่ยนจาก .single() เป็น .maybeSingle() เพื่อไม่ให้ระบบฟ้อง Error เวลาพิมพ์รหัสผิด
      const { data, error: fetchError } = await supabase
        .from("admin_users")
        .select("*")
        .eq("username", cleanUsername)
        .eq("password", cleanPassword)
        .maybeSingle();

      if (fetchError) {
        setError(`เชื่อมต่อฐานข้อมูลไม่ได้: ${fetchError.message}`);
        setLoading(false);
        return;
      }

      // 🌟 ถ้าไม่มีข้อมูล (พิมพ์ผิด หรือไม่มีชื่อในระบบ)
      if (!data) {
        setError("ชื่อผู้ใช้ หรือ รหัสผ่าน ไม่ถูกต้องครับ");
        setLoading(false);
        return;
      }

      // ถ้าถูกต้อง ให้บันทึกสถานะลง Browser (localStorage)
      localStorage.setItem("stplus_admin_auth", "true");
      localStorage.setItem("stplus_admin_user", data.username);

      // เด้งไปหน้า Dashboard ทันที
      window.location.href = "/admin-stplus";
    } catch (err) {
      setError("เกิดข้อผิดพลาดในระบบเครือข่าย");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 font-sans text-gray-900">
      <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-500">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">ST PLUS</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            System Administration
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-sm font-bold animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">Username</label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-gray-900 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
          >
            {loading ? (
              "Authenticating..."
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
