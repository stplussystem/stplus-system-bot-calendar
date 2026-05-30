"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Navigation,
} from "lucide-react";

// เชื่อมต่อ Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function CheckinPage() {
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // 1. ดึงหัวข้องานทั้งหมดตอนเปิดหน้าเว็บ
  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    const { data, error } = await supabase
      .from("attendance_topics")
      .select("*")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      setTopics(data);
      setSelectedTopic(data[0].id); // ตั้งค่าเริ่มต้นเป็นหัวข้อแรก
    }
  };

  // 2. ฟังก์ชันกด Check-in
  const handleCheckIn = async () => {
    if (!selectedTopic) {
      alert("กรุณาเลือกหัวข้องานก่อนครับ");
      return;
    }

    setLoading(true);
    setStatus("idle");

    // เช็คว่ามือถือรองรับ GPS ไหม
    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMessage("เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่ง GPS");
      setLoading(false);
      return;
    }

    // 📍 เริ่มกระบวนการดึง GPS
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // จำลองรหัสพนักงานไปก่อน (เดี๋ยวเราค่อยเชื่อม liff.init() เพื่อเอา LINE ID จริงๆ)
          const mockUserId = "U_EMPLOYEE_TEST_001";

          const { error } = await supabase.from("attendance_logs").insert([
            {
              user_id: mockUserId,
              topic_id: selectedTopic,
              check_in_lat: latitude,
              check_in_lng: longitude,
              status: "checked_in",
            },
          ]);

          if (error) throw error;

          setStatus("success");
        } catch (err: any) {
          setStatus("error");
          setErrorMessage(err.message);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        // กรณีผู้ใช้ไม่อนุญาต หรือปิด GPS ไว้ (Workaround ข้อ 2.2)
        setStatus("error");
        setErrorMessage(
          "ไม่สามารถดึงตำแหน่งได้! กรุณาไปที่ การตั้งค่า > ความเป็นส่วนตัว > เปิดตำแหน่งที่ตั้งสำหรับแอป LINE หรือเบราว์เซอร์นี้ครับ",
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }, // บังคับดึง GPS แม่นยำสูง
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 flex flex-col items-center pt-10 font-sans">
      <div className="bg-white max-w-md w-full rounded-3xl shadow-sm border border-[#e2e8f0] overflow-hidden">
        {/* ส่วนหัว */}
        <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm mb-4">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">
              ลงเวลาเข้างาน
            </h1>
            <p className="text-blue-100 text-sm">ST PLUS SYSTEM</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* สถานะการบันทึกสำเร็จ */}
          {status === "success" && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-green-800">
                  Check-in สำเร็จแล้ว!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  ระบบบันทึกเวลาและพิกัดของคุณเรียบร้อยแล้ว
                </p>
              </div>
            </div>
          )}

          {/* สถานะแจ้งเตือน Error (โดยเฉพาะเรื่อง GPS) */}
          {status === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">เกิดข้อผิดพลาด</p>
                <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* ฟอร์มเลือกหัวข้อ (ซ่อนถ้าเข้างานสำเร็จแล้ว) */}
          {status !== "success" && (
            <>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  เลือกหัวข้องานวันนี้
                </label>

                {topics.length === 0 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                    ⏳ กำลังโหลดหัวข้องาน... (หรือยังไม่มีการสร้างหัวข้อ)
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topics.map((topic) => (
                      <label
                        key={topic.id}
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedTopic === topic.id
                            ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="topic"
                            className="hidden"
                            checked={selectedTopic === topic.id}
                            onChange={() => setSelectedTopic(topic.id)}
                          />
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedTopic === topic.id ? "border-blue-600" : "border-gray-300"}`}
                          >
                            {selectedTopic === topic.id && (
                              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {topic.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {topic.start_time.substring(0, 5)} -{" "}
                              {topic.end_time.substring(0, 5)} น.
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* ปุ่มลงเวลา */}
              <button
                onClick={handleCheckIn}
                disabled={loading || topics.length === 0}
                className="w-full bg-[#1e293b] hover:bg-gray-800 text-white font-bold py-4 px-4 rounded-xl transition-colors flex justify-center items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    กำลังดึงพิกัด GPS...
                  </div>
                ) : (
                  <>
                    <Navigation className="h-5 w-5" />
                    ลงเวลาเข้างาน (Check-in)
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                * ระบบจะบันทึกพิกัดสถานที่ปัจจุบันของคุณ
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
