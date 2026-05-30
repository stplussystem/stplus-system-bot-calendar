"use client";

import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// เชื่อมต่อ Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AttendanceAdminPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    shift_type: "morning",
    start_time: "09:00",
    end_time: "18:00",
    location_type: "office",
    radius_meters: 100,
    photo_mode: "none",
  });

  // ลอจิกจัดการเปลี่ยนกะเวลาอัตโนมัติ
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

  // ลอจิกบันทึกข้อมูลลงฐานข้อมูล
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ดึง LINE User ID จำลอง หรือใช้ Session จริง (เดี๋ยวเราค่อยมาเชื่อมกับระบบ Login ทีหลัง)
      const mockUserId = "U_MANAGER_MOCK_ID";

      const { error } = await supabase.from("attendance_topics").insert([
        {
          title: formData.title,
          shift_type: formData.shift_type,
          start_time: formData.start_time,
          end_time: formData.end_time,
          location_type: formData.location_type,
          radius_meters: formData.radius_meters,
          photo_mode: formData.photo_mode,
          created_by: mockUserId,
        },
      ]);

      if (error) throw error;
      alert("✅ สร้างหัวข้องานสำเร็จ!");
      setFormData({ ...formData, title: "" }); // ล้างแค่ชื่อหัวข้อ
    } catch (error: any) {
      alert("❌ เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex justify-center items-start pt-10">
      <div className="bg-white max-w-2xl w-full rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* ส่วนหัว */}
        <div className="border-b border-gray-100 bg-white p-6">
          <h1 className="text-xl font-bold text-gray-900">
            ตั้งค่าหัวข้อ Check-in / Out
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            กำหนดรูปแบบกะเวลา สถานที่ และเงื่อนไขการถ่ายรูป
          </p>
        </div>

        {/* ฟอร์มกรอกข้อมูล */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* ชื่อหัวข้องาน */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ชื่อหัวข้องาน <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น เข้าออฟฟิศปกติ, ตรวจไซต์งาน A"
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>

          {/* กะเวลา */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                รูปแบบกะเวลางาน
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.shift_type}
                onChange={(e) => handleShiftChange(e.target.value)}
              >
                <option value="morning">งานเช้า (09:00 - 18:00)</option>
                <option value="afternoon">งานบ่าย (12:00 - 21:00)</option>
                <option value="custom">ระบุเวลาเอง (Custom)</option>
              </select>
            </div>

            {/* จะแสดงให้แก้เวลาได้ ก็ต่อเมื่อเลือก "ระบุเวลาเอง" */}
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

          <hr className="border-gray-100" />

          {/* สถานที่และรัศมี GPS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                สถานที่ Check-in
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.location_type}
                onChange={(e) =>
                  setFormData({ ...formData, location_type: e.target.value })
                }
              >
                <option value="office">🏢 ออฟฟิศ (ค่าเริ่มต้น)</option>
                <option value="team_a">👷‍♂️ ทีม A (พี่หนุ่ม)</option>
                <option value="team_b">👷‍♂️ ทีม B (พี่หนึ่ง)</option>
                <option value="team_other">🌍 ทีม C (อื่นๆ)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ระยะบังคับ GPS (เมตร)
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              การแนบรูปภาพ (Photo Check-in)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label
                className={`border p-4 rounded-xl cursor-pointer transition-all ${formData.photo_mode === "none" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 hover:bg-gray-50"}`}
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
                <span className="block text-sm font-bold text-gray-900">
                  ปิดระบบ
                </span>
                <span className="block text-xs text-gray-500 mt-1">
                  บันทึกแค่พิกัด GPS
                </span>
              </label>
              <label
                className={`border p-4 rounded-xl cursor-pointer transition-all ${formData.photo_mode === "upload" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 hover:bg-gray-50"}`}
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
                <span className="block text-sm font-bold text-gray-900">
                  เลือกรูปได้
                </span>
                <span className="block text-xs text-gray-500 mt-1">
                  อัปโหลดจากอัลบั้มได้
                </span>
              </label>
              <label
                className={`border p-4 rounded-xl cursor-pointer transition-all ${formData.photo_mode === "camera" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 hover:bg-gray-50"}`}
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
                <span className="block text-sm font-bold text-gray-900">
                  ถ่ายรูปสด 📸
                </span>
                <span className="block text-xs text-gray-500 mt-1">
                  บังคับเปิดกล้องถ่ายเท่านั้น
                </span>
              </label>
            </div>
          </div>

          {/* ปุ่ม Submit */}
          <div className="pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center"
            >
              {loading ? "กำลังบันทึกข้อมูล..." : "บันทึกหัวข้องาน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
