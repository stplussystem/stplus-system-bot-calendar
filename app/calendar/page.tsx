"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  CalendarDays,
  ShieldCheck,
  Hammer,
  Sparkles,
  ChevronLeft,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function CalendarAdminPage() {
  const [isLiffInit, setIsLiffInit] = useState(false);
  const [dbUser, setDbUser] = useState<any>(null);

  const currentYearThai = (new Date().getFullYear() + 543).toString();

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({
          liffId: process.env.NEXT_PUBLIC_LIFF_ID || "2010143328-wyg8T4P5",
        });

        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          const { data } = await supabase
            .from("users")
            .select("*")
            .eq("line_user_id", profile.userId)
            .single();
          setDbUser(data || { role: "user", full_name: profile.displayName });
        } else {
          liff.login();
        }
      } catch (error) {
        setDbUser({ role: "admin", full_name: "Local Admin" });
      } finally {
        setIsLiffInit(true);
      }
    };
    initLiff();
  }, []);

  if (!isLiffInit) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-10">
      {/* 🌟 Top Navigation Bar (แบบเดียวกับหน้า Settings) */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            <h1 className="font-bold text-lg">Calendar Admin</h1>
          </div>
          <div className="flex items-center gap-2 bg-white/10 py-1.5 px-3 rounded-full backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold truncate max-w-[100px] uppercase">
              {dbUser?.role || "USER"} MODE
            </span>
          </div>
        </div>
      </div>

      {/* 🌟 Header Gradient */}
      <div className="bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] pt-12 pb-16 px-6 text-white text-center rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-90" />
        <h1 className="text-2xl font-black mb-1">จัดการปฏิทิน</h1>
        <p className="text-blue-100 text-sm font-medium">
          ST PLUS SYSTEM ปี {currentYearThai}
        </p>
      </div>

      {/* 🌟 Main Content: Coming Soon */}
      <div className="px-4 md:px-6 -mt-8 max-w-2xl w-full mx-auto relative z-10 space-y-4">
        <button
          onClick={() => {
            import("@line/liff").then((liff) => {
              if (liff.default.isInClient()) liff.default.closeWindow();
              else window.history.back();
            });
          }}
          className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 w-fit transition-all active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" /> ปิดหน้าต่าง
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden p-10 flex flex-col items-center justify-center text-center min-h-[400px] animate-in fade-in zoom-in duration-500">
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center border-4 border-blue-100">
              <Hammer className="w-12 h-12 text-blue-600 animate-bounce" />
            </div>
            <Sparkles className="w-8 h-8 text-orange-400 absolute -top-2 -right-2 animate-pulse" />
          </div>

          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Coming Soon
          </h2>
          <p className="text-gray-500 text-sm max-w-[250px] leading-relaxed">
            ระบบจัดการปฏิทินรวมกำลังอยู่ระหว่างการพัฒนา จะเปิดให้ใช้งานเร็วๆ
            นี้ครับ
          </p>

          <div className="mt-8 pt-6 border-t border-gray-100 w-full">
            <div className="flex justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping delay-100"></span>
              <span className="w-2 h-2 rounded-full bg-blue-200 animate-ping delay-200"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
