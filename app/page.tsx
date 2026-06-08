"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import liff from "@line/liff";
import { supabase } from "@/lib/supabase"; // ตรวจสอบ path ให้ตรงกับโปรเจกตของพี่แม็ค
import {
  LayoutDashboard,
  CalendarDays,
  MapPin,
  ClipboardCheck,
  Settings,
} from "lucide-react";

// 🌟 นำเข้า Component ProfileSettings
import ProfileSettings from "@/components/ProfileSettings"; // ตรวจสอบ path ให้ตรงกับโปรเจกต์ของพี่แม็ค

export default function DashboardPage() {
  // --- 🌟 State สำหรับจัดการข้อมูล LIFF และ User ---
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  // --- 🌟 ดักจับข้อมูลตอนโหลดหน้าเว็บ ---
  useEffect(() => {
    const initApp = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
        if (liff.isLoggedIn()) {
          const userProfile = await liff.getProfile();
          setProfile(userProfile);

          // เช็คข้อมูลใน Supabase
          const { data: userData } = await supabase
            .from("users")
            .select("*")
            .eq("line_user_id", userProfile.userId)
            .single();

          let currentUser = userData;

          // ถ้าไม่มีข้อมูลเลย (เข้ามาครั้งแรกสุดๆ) ให้สร้าง record เปล่าๆ รอไว้ก่อน
          if (!currentUser) {
            const { data: newUser } = await supabase
              .from("users")
              .insert([
                {
                  line_user_id: userProfile.userId,
                  display_name: userProfile.displayName,
                  picture_url: userProfile.pictureUrl,
                  is_active: false,
                },
              ])
              .select()
              .single();

            currentUser = newUser;
          }

          setDbUser(currentUser || {});

          // 🚨 จุดดักจับ: ถ้าข้อมูลสำคัญยังว่างเปล่า ให้เด้งไปหน้า Profile
          if (
            !currentUser?.full_name ||
            !currentUser?.nickname ||
            !currentUser?.department
          ) {
            setIsNewUser(true);
          } else {
            setIsNewUser(false);
          }
        } else {
          liff.login();
        }
      } catch (err) {
        console.error("LIFF Init Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  // --- 🌟 1. หน้าจอ Loading (ระหว่างรอดึงข้อมูล) ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="relative flex items-center justify-center w-24 h-24 mb-4">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
        </div>
        <span className="text-slate-500 font-medium text-sm animate-pulse">
          กำลังตรวจสอบข้อมูลผู้ใช้งาน...
        </span>
      </div>
    );
  }

  // --- 🌟 2. หน้าจอ Profile (กรณีข้อมูลไม่ครบ) ---
  if (profile && dbUser && (isNewUser || showProfileSettings)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-8 font-sans pb-10">
        <ProfileSettings
          profile={profile}
          dbUser={dbUser}
          isNewUser={isNewUser}
          setShowProfileSettings={setShowProfileSettings}
          supabase={supabase}
          onSaveSuccess={(updated) => {
            // พอบันทึกเสร็จ อัปเดต State ให้หลุดออกจากหน้า Profile
            setDbUser(updated);
            setIsNewUser(false);
            setShowProfileSettings(false);
          }}
        />
      </div>
    );
  }

  // --- 🌟 3. หน้าจอ Dashboard หลัก (กรณีข้อมูลครบถ้วนแล้ว) ---
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans selection:bg-blue-100">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight">
              ST PLUS SYSTEM
            </h1>
            <p className="text-xs font-bold text-gray-500">
              Workspace & Portal
            </p>
          </div>
        </div>

        {/* เพิ่มปุ่มตั้งค่า Profile ที่มุมขวาบน เพื่อให้คนที่เข้าได้แล้วกลับไปแก้ข้อมูลได้ */}
        <button
          onClick={() => setShowProfileSettings(true)}
          className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-500 transition-colors"
        >
          <img
            src={profile?.pictureUrl}
            alt="profile"
            className="w-8 h-8 rounded-full border border-slate-200"
          />
        </button>
      </div>

      {/* Menu Grid Section */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            ยินดีต้อนรับ, {dbUser?.nickname || "ผู้ใช้งาน"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            กรุณาเลือกระบบที่ต้องการเข้าใช้งาน
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card: Calendar */}
          <Link
            href="/calendar"
            className="group bg-white border border-gray-200 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 rounded-2xl p-6 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              ปฏิทินและคิวงาน
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              บันทึกนัดหมาย จัดการตารางงานส่วนตัว และปฏิทินทีม
            </p>
          </Link>

          {/* Card: Check-in */}
          <Link
            href="/checkin"
            className="group bg-white border border-gray-200 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 rounded-2xl p-6 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              ลงเวลาเข้า-ออกงาน
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              บันทึกพิกัดสถานที่ปฏิบัติงาน และดูประวัติการเข้างาน
            </p>
          </Link>

          {/* Card: Leave */}
          <Link
            href="/leave"
            className="group bg-white border border-gray-200 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/10 rounded-2xl p-6 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">ระบบลางาน</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              ยื่นขออนุมัติลางาน ตรวจสอบสถิติ และพิจารณาอนุมัติ
            </p>
          </Link>

          {/* Card: Settings */}
          <Link
            href="/settings"
            className="group bg-white border border-gray-200 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 rounded-2xl p-6 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Settings className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              การตั้งค่าระบบ
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              จัดการผู้ใช้งาน กำหนดสิทธิ์ และตั้งค่าระบบแจ้งเตือน
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
