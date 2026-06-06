"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  CalendarDays,
  MapPin,
  ClipboardCheck,
  Settings,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans selection:bg-blue-100">
      {/* 🌟 Header Section */}
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
      </div>

      {/* 🌟 Menu Grid Section */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            ยินดีต้อนรับ
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
