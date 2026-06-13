"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Lock, User, LogIn, AlertCircle, Eye, EyeOff } from "lucide-react"; // 🌟 เพิ่ม Eye, EyeOff

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🌟 State ใหม่สำหรับฟีเจอร์แสดงรหัสผ่าน และ จำชื่อผู้ใช้
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 🌟 ดึงชื่อผู้ใช้ที่จำไว้ตอนโหลดหน้าเว็บ
  useEffect(() => {
    const savedUsername = localStorage.getItem("stplus_admin_saved_username");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();

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

      if (!data) {
        setError("ชื่อผู้ใช้ หรือ รหัสผ่าน ไม่ถูกต้องครับ");
        setLoading(false);
        return;
      }

      // 🌟 ระบบ Remember Me (จำ/ลบ ชื่อผู้ใช้)
      if (rememberMe) {
        localStorage.setItem("stplus_admin_saved_username", cleanUsername);
      } else {
        localStorage.removeItem("stplus_admin_saved_username");
      }

      // บันทึกสถานะเข้าสู่ระบบ
      localStorage.setItem("stplus_admin_auth", "true");
      localStorage.setItem("stplus_admin_user", data.username);

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
              {/* 🌟 เปลี่ยน type ตามสถานะ showPassword */}
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {/* 🌟 ปุ่มรูปตาสำหรับสลับเปิด/ปิดรหัสผ่าน */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* 🌟 กล่องตัวเลือก Remember me */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
              />
              <span className="text-sm font-medium text-gray-600 group-hover:text-black select-none transition-colors">
                Remember me
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-gray-900 text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
