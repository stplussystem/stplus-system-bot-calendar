"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  CalendarDays,
  Clock,
  Users,
  Camera,
  Save,
  Radar,
  ImageOff,
  ImagePlus,
  CheckCircle2,
  XCircle,
  Edit,
  Power,
  Calendar,
  Infinity,
  Briefcase,
  PlusCircle,
  List,
  ShieldAlert,
  Building,
  MapPinHouse,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AttendanceAdminPage() {
  // 🌟 State สำหรับระบบรักษาความปลอดภัยและแท็บ
  const [authStatus, setAuthStatus] = useState<
    "checking" | "allowed" | "denied"
  >("checking");
  const [activeTab, setActiveTab] = useState<"form" | "list">("form");

  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });
  const [topics, setTopics] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    shift_type: "morning",
    start_time: "09:00",
    end_time: "18:00",
    work_type: "office", // เลือกประเภทงาน: 'office' | 'onsite'
    team_type: "office", // ชื่อทีม: 'office', 'team_a', 'team_b', 'team_other'
    radius_meters: 100,
    photo_mode: "none",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    is_active: true,
  });

  useEffect(() => {
    checkUserRole();
    fetchTopics();
  }, []);

  // 🔒 ฟังก์ชันตรวจสอบสิทธิ์ (Role)
  const checkUserRole = async () => {
    try {
      // 💡 [คำแนะนำ]: ในอนาคตเราจะดึง LINE ID มาจาก LIFF
      // const profile = await liff.getProfile();
      // const userId = profile.userId;

      const mockUserId = "U_MANAGER_MOCK_ID"; // จำลองรหัสเพื่อทดสอบ

      // ค้นหาสิทธิ์ในตาราง users ของ Supabase
      const { data: user, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", mockUserId) // ถ้าพี่แม็คใช้ line_user_id เป็น Primary Key ก็ใช้ 'id' ได้เลย
        .single();

      // ถ้าระบบยังไม่มีข้อมูล หรือต้องการบายพาสให้เทสได้ก่อน ให้ใช้บรรทัดล่างครับ
      // แต่ถ้าระบบจริงให้ใช้: if (user && ['it', 'manager', 'hr'].includes(user.role))
      const isAuthorized = true; // ⚠️ เปลี่ยนเป็น true เพื่อให้พี่แม็คเทส UI ได้ก่อน

      if (isAuthorized) {
        setAuthStatus("allowed");
      } else {
        setAuthStatus("denied");
      }
    } catch (error) {
      console.error("Auth error:", error);
      // อนุญาตให้เทสไปก่อน
      setAuthStatus("allowed");
    }
  };

  const fetchTopics = async () => {
    const { data, error } = await supabase
      .from("attendance_topics")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTopics(data);
  };

  const handleShiftChange = (shift: string) => {
    let start = formData.start_time;
    let end = formData.end_time;
    if (shift === "morning") {
      start = "09:00";
      end = "18:00";
    }
    if (shift === "afternoon") {
      start = "12:00";
      end = "21:00";
    }
    setFormData({
      ...formData,
      shift_type: shift,
      start_time: start,
      end_time: end,
    });
  };

  const handleEditClick = (topic: any) => {
    setEditingId(topic.id);
    setFormData({
      title: topic.title,
      shift_type: topic.shift_type,
      start_time: topic.start_time,
      end_time: topic.end_time,
      work_type: topic.team_type === "office" ? "office" : "onsite",
      team_type: topic.team_type,
      radius_meters: topic.radius_meters,
      photo_mode: topic.photo_mode,
      start_date: topic.start_date,
      end_date: topic.end_date,
      is_active: topic.is_active,
    });
    setActiveTab("form"); // เด้งกลับมาแท็บฟอร์ม
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const mockUserId = "U_MANAGER_MOCK_ID";
      const payload = {
        title: formData.title,
        shift_type: formData.shift_type,
        start_time: formData.start_time,
        end_time: formData.end_time,
        team_type:
          formData.work_type === "office" ? "office" : formData.team_type,
        radius_meters: formData.radius_meters,
        photo_mode: formData.photo_mode,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: formData.is_active,
        created_by: mockUserId,
      };

      if (editingId) {
        const { error } = await supabase
          .from("attendance_topics")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        setModal({
          isOpen: true,
          type: "success",
          title: "อัปเดตสำเร็จ!",
          message: `แก้ไขหัวข้อเรียบร้อยแล้ว`,
        });
      } else {
        const { error } = await supabase
          .from("attendance_topics")
          .insert([payload]);
        if (error) throw error;
        setModal({
          isOpen: true,
          type: "success",
          title: "บันทึกสำเร็จ!",
          message: `เพิ่มหัวข้องานใหม่เรียบร้อยแล้ว`,
        });
      }

      setEditingId(null);
      setFormData({ ...formData, title: "", is_active: true });
      fetchTopics();
      setActiveTab("list"); // บันทึกเสร็จให้เด้งไปหน้ารายการ
    } catch (error: any) {
      setModal({
        isOpen: true,
        type: "error",
        title: "เกิดข้อผิดพลาด",
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => setModal({ ...modal, isOpen: false });
  const isPermanent = formData.end_date === "2099-12-31";

  // 🔒 หน้าจอโหลด & หน้าจอปฏิเสธสิทธิ์
  if (authStatus === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-gray-500 font-bold">
        กำลังตรวจสอบสิทธิ์...
      </div>
    );
  }
  if (authStatus === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">
            ไม่มีสิทธิ์เข้าถึง
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            หน้านี้สงวนสิทธิ์เฉพาะระดับ Manager, HR และ IT เท่านั้นครับ
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 flex flex-col items-center pt-8 font-sans pb-20">
      {/* Pop-up Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div
              className={`p-6 flex flex-col items-center text-center ${modal.type === "success" ? "bg-green-50" : "bg-red-50"}`}
            >
              {modal.type === "success" ? (
                <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              ) : (
                <XCircle className="w-16 h-16 text-red-500 mb-4" />
              )}
              <h3
                className={`text-xl font-bold ${modal.type === "success" ? "text-green-900" : "text-red-900"}`}
              >
                {modal.title}
              </h3>
              <p
                className={`text-sm mt-2 ${modal.type === "success" ? "text-green-700" : "text-red-700"}`}
              >
                {modal.message}
              </p>
            </div>
            <div className="p-4 bg-white border-t border-gray-100">
              <button
                onClick={closeModal}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition-colors"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 เมนู Tabs สไตล์ Modern SaaS */}
      <div className="max-w-2xl w-full mb-6">
        <div className="flex space-x-2 bg-gray-200/50 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              activeTab === "form"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            {editingId ? "แก้ไขหัวข้อ" : "สร้างหัวข้อใหม่"}
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              activeTab === "list"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <List className="w-4 h-4" />
            รายการหัวข้องาน
          </button>
        </div>
      </div>

      {/* ================= แท็บ 1: แบบฟอร์ม ================= */}
      {activeTab === "form" && (
        <div className="bg-white max-w-2xl w-full rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden relative animate-in fade-in slide-in-from-bottom-4 duration-300">
          {editingId && (
            <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-4 py-1 rounded-bl-xl shadow-sm">
              โหมดแก้ไขข้อมูล
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* ชื่อหัวข้องาน */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <CalendarDays className="h-4 w-4 text-gray-400" /> ชื่อหัวข้องาน{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น ไซต์งาน A, เข้าออฟฟิศ"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            {/* ระบบวันที่ */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <label className="flex items-center gap-2 text-sm font-bold text-blue-900 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer"
                    checked={isPermanent}
                    onChange={(e) => {
                      if (e.target.checked)
                        setFormData({ ...formData, end_date: "2099-12-31" });
                      else
                        setFormData({
                          ...formData,
                          end_date: formData.start_date,
                        });
                    }}
                  />
                  <Infinity className="h-4 w-4 text-blue-600" />
                  หัวข้องานประจำ (ไม่มีวันหมดอายุ)
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 text-gray-400" /> เริ่มวันที่
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none bg-white"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label
                    className={`flex items-center gap-2 text-sm font-semibold mb-2 ${isPermanent ? "text-gray-400" : "text-gray-700"}`}
                  >
                    <Calendar className="h-4 w-4 text-gray-400" /> ถึงวันที่
                  </label>
                  {isPermanent ? (
                    <div className="w-full border border-gray-200 bg-gray-100 rounded-lg p-3 text-sm text-gray-500 font-semibold flex items-center justify-center">
                      ไม่มีกำหนด
                    </div>
                  ) : (
                    <input
                      type="date"
                      required
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none bg-white"
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, end_date: e.target.value })
                      }
                    />
                  )}
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* 🌟 เลือกระบบทีม หรือ ออฟฟิศ */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Briefcase className="h-4 w-4 text-gray-400" /> รูปแบบการเข้างาน
              </label>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <label
                  className={`border p-4 rounded-xl cursor-pointer text-center transition-all ${formData.work_type === "office" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 hover:bg-gray-50"}`}
                >
                  <input
                    type="radio"
                    name="work_type"
                    className="hidden"
                    checked={formData.work_type === "office"}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        work_type: "office",
                        team_type: "office",
                      })
                    }
                  />
                  <span className="flex items-center justify-center gap-2 text-sm font-bold text-gray-900">
                    <Building className="h-5 w-5" />
                    ประจำออฟฟิศ
                  </span>
                </label>
                <label
                  className={`border p-4 rounded-xl cursor-pointer text-center transition-all ${formData.work_type === "onsite" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 hover:bg-gray-50"}`}
                >
                  <input
                    type="radio"
                    name="work_type"
                    className="hidden"
                    checked={formData.work_type === "onsite"}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        work_type: "onsite",
                        team_type: "team_a",
                      })
                    }
                  />
                  <span className="flex items-center justify-center gap-2 text-sm font-bold text-gray-900">
                    <MapPinHouse className="h-5 w-5" />
                    ออกไซต์งาน
                  </span>
                </label>
              </div>

              {/* ซ่อน/แสดง Dropdown เลือกทีม */}
              {formData.work_type === "onsite" && (
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-2">
                    <Users className="h-4 w-4" /> ทีมที่ดูแลไซต์งานนี้
                  </label>
                  <select
                    className="w-full border border-blue-200 rounded-lg p-3 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500"
                    value={formData.team_type}
                    onChange={(e) =>
                      setFormData({ ...formData, team_type: e.target.value })
                    }
                  >
                    <option value="team_all">ทั้งหมดทุกทีม</option>
                    <option value="team_n">พี่นุ</option>
                    <option value="team_a">ทีม A (พี่หนุ่ม)</option>
                    <option value="team_b">ทีม B (พี่หนึ่ง)</option>
                    <option value="team_c">ทีม C (พี่บาส)</option>
                    <option value="team_d">ทีม D (แคมป์)</option>
                    <option value="team_e">ทีม E (หนึ่ง)</option>
                    <option value="team_other">ทีมอื่นๆ</option>
                  </select>
                </div>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* กะเวลา */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Clock className="h-4 w-4 text-gray-400" /> กะเวลางาน
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none"
                  value={formData.shift_type}
                  onChange={(e) => handleShiftChange(e.target.value)}
                >
                  <option value="morning">งานเช้า (09:00 - 18:00)</option>
                  <option value="afternoon">งานบ่าย (12:00 - 21:00)</option>
                  <option value="custom">ระบุเวลาเอง (Custom)</option>
                </select>
              </div>
              {formData.shift_type === "custom" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      เริ่มงาน
                    </label>
                    <input
                      type="time"
                      required
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                      value={formData.start_time}
                      onChange={(e) =>
                        setFormData({ ...formData, start_time: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      เลิกงาน
                    </label>
                    <input
                      type="time"
                      required
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                      value={formData.end_time}
                      onChange={(e) =>
                        setFormData({ ...formData, end_time: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* รัศมี & โหมดรูป */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Radar className="h-4 w-4 text-gray-400" /> ระยะบังคับ GPS
                  (เมตร)
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none"
                  value={formData.radius_meters}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      radius_meters: Number(e.target.value),
                    })
                  }
                >
                  <option value={50}>50 เมตร (เข้มงวดมาก)</option>
                  <option value={100}>100 เมตร (มาตรฐาน)</option>
                  <option value={200}>200 เมตร (ยืดหยุ่น)</option>
                  <option value={300}>300 เมตร (ไซต์กว้าง)</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Camera className="h-4 w-4 text-gray-400" /> การแนบรูปภาพ
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none"
                  value={formData.photo_mode}
                  onChange={(e) =>
                    setFormData({ ...formData, photo_mode: e.target.value })
                  }
                >
                  <option value="none">ปิดระบบ (ใช้แค่ GPS)</option>
                  <option value="upload">เลือกรูปได้จากอัลบั้ม</option>
                  <option value="camera">บังคับถ่ายสดเท่านั้น 📸</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
              <div>
                <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Power className="h-4 w-4 text-gray-500" /> สถานะเปิดให้ลงเวลา
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-4">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ ...formData, title: "", is_active: true });
                    setActiveTab("list");
                  }}
                  className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 px-4 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className={`${editingId ? "w-2/3 bg-amber-500 hover:bg-amber-600" : "w-full bg-[#2563eb] hover:bg-blue-700"} text-white font-bold py-3.5 px-4 rounded-xl transition-colors flex justify-center items-center gap-2 shadow-sm`}
              >
                <Save className="h-5 w-5" />
                {loading
                  ? "กำลังบันทึก..."
                  : editingId
                    ? "บันทึกการแก้ไข"
                    : "บันทึกหัวข้องาน"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= แท็บ 2: รายการหัวข้อ ================= */}
      {activeTab === "list" && (
        <div className="max-w-2xl w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
            {topics.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center">
                <List className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">
                  ยังไม่มีหัวข้องานในระบบ
                </p>
                <button
                  onClick={() => setActiveTab("form")}
                  className="mt-4 text-blue-600 font-bold text-sm hover:underline"
                >
                  + สร้างหัวข้อแรก
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${topic.is_active ? "bg-green-500" : "bg-gray-300"}`}
                        ></span>
                        <h3 className="font-bold text-gray-900">
                          {topic.title}
                        </h3>
                        {topic.team_type === "office" ? (
                          <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                            ออฟฟิศ
                          </span>
                        ) : (
                          <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200">
                            ออกไซต์ ({topic.team_type})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{" "}
                          {topic.end_date === "2099-12-31"
                            ? "ประจำ"
                            : `${topic.start_date} ถึง ${topic.end_date}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />{" "}
                          {topic.start_time.substring(0, 5)}-
                          {topic.end_time.substring(0, 5)} น.
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditClick(topic)}
                      className="shrink-0 bg-white border border-gray-200 text-gray-700 hover:border-blue-500 hover:text-blue-600 px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all shadow-sm"
                    >
                      <Edit className="h-4 w-4" /> แก้ไข
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
