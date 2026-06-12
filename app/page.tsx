"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Download, Users, Calendar, MapPin, Menu, X, Power } from "lucide-react";


export default function AdminDashboardPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false); // 🌟 เพิ่มสถานะ
  const router = useRouter(); // 🌟 สำหรับเด้งเปลี่ยนหน้า

  // 🌟 ตรวจสอบว่าเคย Login ไว้หรือยัง
  useEffect(() => {
    const isAuth = localStorage.getItem("stplus_admin_auth");
    if (isAuth !== "true") {
      router.push("/login"); // ถ้ายังไม่ Login เตะไปหน้า Login
    } else {
      setIsAuthorized(true); // อนุญาตให้แสดงผล
    }
  }, [router]);

  // ฟังก์ชันออกจากระบบ
  const handleLogout = () => {
    localStorage.removeItem("stplus_admin_auth");
    localStorage.removeItem("stplus_admin_user");
    router.push("/login");
  };

  // 🌟 ระหว่างโหลด หรือคนแปลกหน้า ให้ซ่อนหน้าเว็บไว้ก่อน
  if (!isAuthorized) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-gray-500">Authenticating...</div>;

  // ฟังก์ชันจำลองการโหลด Excel (CSV)
  const exportToExcel = () => {
    // โค้ดสำหรับดึงข้อมูลและ Export จะอยู่ตรงนี้
    alert("กำลังดาวน์โหลดไฟล์ Excel...");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* ================= HEADER สำหรับมือถือ ================= */}
      <div className="md:hidden bg-[#0033a0] text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <h1 className="font-bold text-lg">ST PLUS ADMIN</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* ================= SIDEBAR (เมนูด้านซ้าย) ================= */}
      {/* ซ่อนบนมือถือถ้าไม่ได้กดเปิด, แสดงตลอดเวลาบนคอม (md:block) */}
      <aside
        className={`
        ${isMobileMenuOpen ? "block" : "hidden"} 
        md:block w-full md:w-64 bg-white border-r border-gray-200 shadow-sm z-40
        md:sticky md:top-0 md:h-screen overflow-y-auto
      `}
      >
        <div className="p-6 hidden md:block">
          <h1 className="text-2xl font-black text-[#0033a0]">
            ST PLUS
            <br />
            <span className="text-sm text-gray-500 font-medium">
              System Admin
            </span>
          </h1>
        </div>
        <nav className="p-4 space-y-2">
          <a
            href="#"
            className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-xl font-bold transition-colors"
          >
            <Users className="w-5 h-5" /> สรุปข้อมูลลงเวลา
          </a>
          <a
            href="/calendar-admin"
            className="flex items-center gap-3 p-3 text-gray-600 hover:bg-gray-50 rounded-xl font-bold transition-colors"
          >
            <Calendar className="w-5 h-5" /> จัดการคิวงาน
          </a>
          <a
            href="/attendance-admin"
            className="flex items-center gap-3 p-3 text-gray-600 hover:bg-gray-50 rounded-xl font-bold transition-colors"
          >
            <MapPin className="w-5 h-5" /> จัดการหัวข้องาน
          </a>
        </nav>
        <div className="p-4 mt-auto absolute bottom-0 w-full md:w-64 border-t border-gray-100 bg-white">
          <button onClick={handleLogout} className="flex items-center justify-center w-full gap-2 p-3 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors">
            <Power className="w-4 h-4" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT (เนื้อหาหลัก) ================= */}
      <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
        {/* หัวข้อ และปุ่ม Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              สรุปข้อมูลการลงเวลาทำงาน
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              ข้อมูลทั้งหมดสามารถส่งออกเป็น Excel ได้
            </p>
          </div>
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <Download className="w-5 h-5" /> Export Excel
          </button>
        </div>

        {/* การ์ดสรุปข้อมูล (สถิติ) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {["พนักงานทั้งหมด", "เข้างานวันนี้", "ออกไซต์งาน", "ลางาน"].map(
            (title, i) => (
              <div
                key={i}
                className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm"
              >
                <p className="text-xs md:text-sm text-gray-500 font-bold mb-1">
                  {title}
                </p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-800">
                  0
                </h3>
              </div>
            ),
          )}
        </div>

        {/* ตารางข้อมูล (รองรับการปัดซ้ายขวาบนมือถือ) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-800">ข้อมูลล่าสุด</h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-sm text-gray-500">
                  <th className="p-4 font-bold">วันที่</th>
                  <th className="p-4 font-bold">ชื่อพนักงาน</th>
                  <th className="p-4 font-bold">หัวข้องาน</th>
                  <th className="p-4 font-bold text-center">เวลาเข้า</th>
                  <th className="p-4 font-bold text-center">เวลาออก</th>
                  <th className="p-4 font-bold">สถานะ</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {/* ตัวอย่างข้อมูล Mockup */}
                <tr className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="p-4">12/06/2569</td>
                  <td className="p-4 font-bold">สมชาย ใจดี</td>
                  <td className="p-4">ออฟฟิศ ST Plus</td>
                  <td className="p-4 text-center text-green-600 font-bold">
                    08:45
                  </td>
                  <td className="p-4 text-center text-red-500 font-bold">-</td>
                  <td className="p-4">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold">
                      เข้างานแล้ว
                    </span>
                  </td>
                </tr>
                {/* ถ้าไม่มีข้อมูล */}
                {/* <tr><td colSpan={6} className="p-8 text-center text-gray-400">ยังไม่มีข้อมูล</td></tr> */}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
