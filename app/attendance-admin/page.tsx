"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Camera,
  Save,
  LayoutDashboard,
  Radar,
  ImageOff,
  ImagePlus,
  CheckCircle2,
  XCircle,
  Edit,
  Power,
  Calendar,
  Infinity,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AttendanceAdminPage() {
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
    location_type: "office",
    radius_meters: 100,
    photo_mode: "none",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    is_active: true,
  });

  useEffect(() => {
    fetchTopics();
  }, []);

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
      location_type: topic.location_type,
      radius_meters: topic.radius_meters,
      photo_mode: topic.photo_mode,
      start_date: topic.start_date,
      end_date: topic.end_date,
      is_active: topic.is_active,
    });
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
        location_type: formData.location_type,
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
          message: `ต่ออายุ/แก้ไขหัวข้อเรียบร้อยแล้ว`,
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

  // 🌟 เช็คว่าเป็นงานแบบไม่มีวันหมดอายุหรือไม่
  const isPermanent = formData.end_date === "2099-12-31";

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 flex flex-col items-center pt-10 font-sans relative pb-20">
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

      {/* ================= แบบฟอร์ม ================= */}
      <div className="bg-white max-w-3xl w-full rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden mb-8 relative">
        {editingId && (
          <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-4 py-1 rounded-bl-xl shadow-sm animate-pulse">
            โหมดแก้ไขข้อมูล
          </div>
        )}

        <div className="border-b border-[#e2e8f0] bg-white p-6 flex items-center gap-3">
          <div
            className={`${editingId ? "bg-amber-50" : "bg-blue-50"} p-2 rounded-lg`}
          >
            <LayoutDashboard
              className={`h-6 w-6 ${editingId ? "text-amber-600" : "text-blue-600"}`}
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {editingId
                ? "แก้ไขหัวข้อ Check-in / Out"
                : "สร้างหัวข้อ Check-in / Out"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              กำหนดวันที่, กะเวลา, สถานที่ และการถ่ายรูป
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

          {/* 🌟 ระบบวันที่ + ปุ่มไม่มีวันหมดอายุ */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <label className="flex items-center gap-2 text-sm font-bold text-blue-900 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer"
                  checked={isPermanent}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, end_date: "2099-12-31" });
                    } else {
                      setFormData({
                        ...formData,
                        end_date: formData.start_date,
                      });
                    }
                  }}
                />
                <Infinity className="h-4 w-4 text-blue-600" />
                หัวข้องานประจำ (ไม่มีวันหมดอายุ)
              </label>
              <span className="text-xs text-gray-500 hidden md:block">
                เหมาะสำหรับ "เข้าออฟฟิศ"
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 text-gray-400" /> เริ่มวันที่
                </label>
                <input
                  type="date"
                  required
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
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
                    ไม่มีกำหนด (2099)
                  </div>
                ) : (
                  <input
                    type="date"
                    required
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
            <div>
              <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Power className="h-4 w-4 text-gray-500" />{" "}
                สถานะการเปิดให้ลงเวลา
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ถ้าปิด พนักงานจะไม่เห็นหัวข้อนี้ในหน้าระบบ
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

          <hr className="border-gray-100" />

          {/* กะเวลา */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Clock className="h-4 w-4 text-gray-400" /> รูปแบบกะเวลางาน
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

          {/* สถานที่และรัศมี GPS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <MapPin className="h-4 w-4 text-gray-400" /> สถานที่ Check-in
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <select
                  className="w-full border border-gray-300 rounded-lg py-3 pl-10 pr-3 text-sm outline-none appearance-none"
                  value={formData.location_type}
                  onChange={(e) =>
                    setFormData({ ...formData, location_type: e.target.value })
                  }
                >
                  <option value="office">ออฟฟิศ (ค่าเริ่มต้น)</option>
                  <option value="team_a">ทีม A (พี่หนุ่ม)</option>
                  <option value="team_b">ทีม B (พี่หนึ่ง)</option>
                  <option value="team_other">ทีม C (อื่นๆ)</option>
                </select>
              </div>
            </div>

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
                <option value={100}>100 เมตร (มาตรฐานออฟฟิศ)</option>
                <option value={200}>200 เมตร (ยืดหยุ่น)</option>
                <option value={300}>300 เมตร (ไซต์งานกว้าง)</option>
              </select>
            </div>
          </div>

          {/* โหมดรูปถ่าย */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Camera className="h-4 w-4 text-gray-400" /> การแนบรูปภาพ (Photo
              Check-in)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label
                className={`border p-4 rounded-xl cursor-pointer flex flex-col items-center text-center ${formData.photo_mode === "none" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 hover:bg-gray-50"}`}
              >
                <input
                  type="radio"
                  name="photo_mode"
                  value="none"
                  className="hidden"
                  checked={formData.photo_mode === "none"}
                  onChange={() =>
                    setFormData({ ...formData, photo_mode: "none" })
                  }
                />
                <ImageOff
                  className={`h-6 w-6 mb-2 ${formData.photo_mode === "none" ? "text-blue-600" : "text-gray-400"}`}
                />
                <span className="block text-sm font-bold text-gray-900">
                  ปิดระบบ
                </span>
              </label>
              <label
                className={`border p-4 rounded-xl cursor-pointer flex flex-col items-center text-center ${formData.photo_mode === "upload" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 hover:bg-gray-50"}`}
              >
                <input
                  type="radio"
                  name="photo_mode"
                  value="upload"
                  className="hidden"
                  checked={formData.photo_mode === "upload"}
                  onChange={() =>
                    setFormData({ ...formData, photo_mode: "upload" })
                  }
                />
                <ImagePlus
                  className={`h-6 w-6 mb-2 ${formData.photo_mode === "upload" ? "text-blue-600" : "text-gray-400"}`}
                />
                <span className="block text-sm font-bold text-gray-900">
                  เลือกรูปได้
                </span>
              </label>
              <label
                className={`border p-4 rounded-xl cursor-pointer flex flex-col items-center text-center ${formData.photo_mode === "camera" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 hover:bg-gray-50"}`}
              >
                <input
                  type="radio"
                  name="photo_mode"
                  value="camera"
                  className="hidden"
                  checked={formData.photo_mode === "camera"}
                  onChange={() =>
                    setFormData({ ...formData, photo_mode: "camera" })
                  }
                />
                <Camera
                  className={`h-6 w-6 mb-2 ${formData.photo_mode === "camera" ? "text-blue-600" : "text-gray-400"}`}
                />
                <span className="block text-sm font-bold text-gray-900">
                  ถ่ายรูปสด
                </span>
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex gap-4">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormData({ ...formData, title: "", is_active: true });
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

      {/* ================= รายการหัวข้อทั้งหมด ================= */}
      <div className="max-w-3xl w-full">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-gray-500" />{" "}
          รายการหัวข้องานทั้งหมด
        </h2>
        <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
          {topics.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              ยังไม่มีหัวข้องานในระบบ
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition-colors gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${topic.is_active ? "bg-green-500" : "bg-gray-300"}`}
                      ></span>
                      <h3 className="font-bold text-gray-900">{topic.title}</h3>
                      {topic.end_date === "2099-12-31" && (
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 border border-blue-200">
                          ประจำ
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {topic.end_date === "2099-12-31"
                          ? "ไม่มีวันหมดอายุ"
                          : `${topic.start_date} ถึง ${topic.end_date}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />{" "}
                        {topic.start_time.substring(0, 5)} -{" "}
                        {topic.end_time.substring(0, 5)} น.
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {topic.location_type} (
                        {topic.radius_meters}m)
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditClick(topic)}
                    className="shrink-0 bg-white border border-gray-200 text-gray-700 hover:border-blue-500 hover:text-blue-600 px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all shadow-sm w-full md:w-auto"
                  >
                    <Edit className="h-4 w-4" /> แก้ไข / ดูข้อมูล
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
