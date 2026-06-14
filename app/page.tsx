"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  CalendarRange,
  UserCog,
} from "lucide-react";
import ProfileSettings from "@/components/ProfileSettings";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function DashboardPage() {
  const [isLiffInit, setIsLiffInit] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [dbUser, setDbUser] = useState<any>(null);

  // 🌟 State สำหรับเก็บข้อมูลวันลาเพื่อทำ Dashboard
  const [leaveSummary, setLeaveSummary] = useState({
    personal: 0,
    sick: 0,
    annual: 0,
    absent: 0,
  });

  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "profile" || params.get("tab") === "profile")
      setShowProfileSettings(true);

    const initLiff = async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({
          liffId: process.env.NEXT_PUBLIC_LIFF_ID || "2010143328-wyg8T4P5",
        });

        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setUserProfile(profile);
          await checkAndAddUser(profile);
        } else {
          liff.login();
        }
      } catch (error) {
        console.error("LIFF Init Error:", error);
      } finally {
        setIsLiffInit(true);
      }
    };
    initLiff();
  }, []);

  useEffect(() => {
    if (userProfile) fetchLeaveSummary();
  }, [userProfile]);

  const checkAndAddUser = async (profile: any) => {
    let { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("line_user_id", profile.userId)
      .single();
    if (!user) {
      const { data: newUser } = await supabase
        .from("users")
        .insert([
          {
            line_user_id: profile.userId,
            full_name: profile.displayName,
            picture_url: profile.pictureUrl,
            role: "user",
          },
        ])
        .select()
        .single();
      user = newUser;
      setShowProfileSettings(true);
    } else if (!user.full_name || user.full_name === profile.displayName) {
      setShowProfileSettings(true);
    }
    setDbUser(user);
  };

  // 🌟 ฟังก์ชันดึงสรุปวันลาของพนักงานคนนี้
  const fetchLeaveSummary = async () => {
    if (!userProfile) return;
    const { data } = await supabase
      .from("leave_requests")
      .select("leave_type, duration_days")
      .eq("line_user_id", userProfile.userId)
      .eq("status", "approved");

    if (data) {
      const summary = { personal: 0, sick: 0, annual: 0, absent: 0 };
      data.forEach((req: any) => {
        if (req.leave_type === "personal")
          summary.personal += req.duration_days;
        if (req.leave_type === "sick") summary.sick += req.duration_days;
        if (req.leave_type === "annual") summary.annual += req.duration_days;
        if (req.leave_type === "absent") summary.absent += req.duration_days;
      });
      setLeaveSummary(summary);
    }
  };

  // 🌟 ฟังก์ชันปิดหน้าต่าง LIFF
  const handleCloseApp = async () => {
    const liff = (await import("@line/liff")).default;
    if (liff.isInClient()) {
      liff.closeWindow();
    } else {
      window.close(); // สำหรับกรณีเปิดในเบราว์เซอร์
    }
  };

  if (!isLiffInit) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-10 relative">
      {toast.show && (
        <div
          className={`fixed top-4 left-4 right-4 md:w-96 z-[110] flex items-start gap-3 border shadow-2xl px-4 py-4 rounded-2xl animate-in slide-in-from-top-5 fade-in duration-300 ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
          )}
          <p className="text-sm font-bold leading-relaxed">{toast.message}</p>
        </div>
      )}

      {showProfileSettings && userProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <ProfileSettings
            profile={userProfile}
            dbUser={dbUser}
            isNewUser={
              !dbUser?.full_name ||
              dbUser?.full_name === userProfile.displayName
            }
            setShowProfileSettings={setShowProfileSettings}
            onSaveSuccess={(updatedUser) => {
              setDbUser(updatedUser);
              setShowProfileSettings(false);
            }}
            supabase={supabase}
          />
        </div>
      )}

      {/* 🌟 หน้าเมนูหลัก (Portal Dashboard) แบบคลีนๆ */}
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
        <div className="mb-8 text-center space-y-3 mt-4">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-blue-600/20 mb-4">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            {" "}
            ST PLUS SYSTEM{" "}
          </h2>
          <p className="text-sm font-bold text-gray-500">
            สวัสดี,{" "}
            <span className="text-blue-600">
              {dbUser?.full_name || userProfile?.displayName || "พนักงาน"}
            </span>{" "}
            👋
          </p>
        </div>

        {/* 🌟 Dashboard สรุปการลาของฉัน */}
        <div className="w-full max-w-sm mb-6 bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-blue-500" /> สรุปการใช้วันลา
            (อนุมัติแล้ว)
          </h3>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-blue-50 rounded-2xl p-3 text-center border border-blue-100">
              <p className="text-[10px] font-bold text-blue-600 mb-1">ลากิจ</p>
              <p className="text-lg font-black text-blue-700">
                {leaveSummary.personal}
              </p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-3 text-center border border-purple-100">
              <p className="text-[10px] font-bold text-purple-600 mb-1">
                พักร้อน
              </p>
              <p className="text-lg font-black text-purple-700">
                {leaveSummary.annual}
              </p>
            </div>
            <div className="bg-orange-50 rounded-2xl p-3 text-center border border-orange-100">
              <p className="text-[10px] font-bold text-orange-600 mb-1">
                ลาป่วย
              </p>
              <p className="text-lg font-black text-orange-700">
                {leaveSummary.sick}
              </p>
            </div>
            <div className="bg-red-50 rounded-2xl p-3 text-center border border-red-100">
              <p className="text-[10px] font-bold text-red-600 mb-1">ขาดงาน</p>
              <p className="text-lg font-black text-red-700">
                {leaveSummary.absent}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-6">
          <button
            onClick={() => (window.location.href = "/checkin")}
            className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:border-blue-300 hover:shadow-md transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-800 text-sm">ลงเวลางาน</span>
          </button>

          <button
            onClick={() => (window.location.href = "/leave")}
            className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:border-orange-300 hover:shadow-md transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
              <CalendarRange className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-800 text-sm">ระบบลางาน</span>
          </button>

          <button
            onClick={() => setShowProfileSettings(true)}
            className="col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center gap-3 hover:border-purple-300 hover:shadow-md transition-all active:scale-95"
          >
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
              <UserCog className="w-4 h-4" />
            </div>
            <span className="font-bold text-gray-800 text-sm">
              ข้อมูลส่วนตัว / ตั้งค่า
            </span>
          </button>
        </div>

        {/* 🌟 ปุ่มกลับหน้าแชท LINE */}
        <button
          onClick={handleCloseApp}
          className="w-full max-w-sm py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors active:scale-95"
        >
          <X className="w-5 h-5" /> ปิดหน้าต่างกลับไปที่แชท
        </button>
      </div>
    </div>
  );
}
