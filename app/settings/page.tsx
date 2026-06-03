"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Settings,
  MapPin,
  Clock,
  Save,
  CheckCircle2,
  AlertTriangle,
  Camera,
  MapPinHouse,
  ShieldCheck,
  Building2,
  Link as LinkIcon, // 🌟 เพิ่มไอคอนลิงก์
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function SettingsPage() {
  const [isLiffInit, setIsLiffInit] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const [officeTopics, setOfficeTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // 🌟 เพิ่ม maps_url เข้ามาในฟอร์ม
  const [formData, setFormData] = useState({
    title: "",
    start_time: "",
    end_time: "",
    maps_url: "",
    lat: "",
    lng: "",
    radius_meters: 100,
    photo_mode: "none",
  });

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: "2010143328-wyg8T4P5" });
        if (liff.isLoggedIn()) {
          setUserProfile(await liff.getProfile());
        } else {
          liff.login();
        }
      } catch (error) {
        setUserProfile({
          userId: "U_LOCAL_TESTER",
          displayName: "Dev Mode (Admin)",
          pictureUrl: "https://ui-avatars.com/api/?name=Admin",
        });
      } finally {
        setIsLiffInit(true);
      }
    };
    initLiff();
  }, []);

  useEffect(() => {
    if (isLiffInit) {
      fetchOfficeSettings();
    }
  }, [isLiffInit]);

  const fetchOfficeSettings = async () => {
    setLoading(true);
    // 🌟 ดึงมาเฉพาะหัวข้อที่เป็น "office" เท่านั้น
    const { data, error } = await supabase
      .from("attendance_topics")
      .select("*")
      .eq("team_type", "office")
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      setOfficeTopics(data);
      handleSelectTopic(data[0]);
    }
    setLoading(false);
  };

  const handleSelectTopic = (topic: any) => {
    setSelectedTopic(topic);
    setFormData({
      title: topic.title || "",
      start_time: topic.start_time ? topic.start_time.substring(0, 5) : "08:00",
      end_time: topic.end_time ? topic.end_time.substring(0, 5) : "17:00",
      maps_url: topic.maps_url || "", // 🌟 ดึงลิงก์เดิมมาแสดง
      lat: topic.lat || "",
      lng: topic.lng || "",
      radius_meters: topic.radius_meters || 100,
      photo_mode: topic.photo_mode || "none",
    });
  };

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  // 🌟 เพิ่มฟังก์ชันตัดลิงก์ Google Maps อัตโนมัติ (ยกมาจากหน้า Admin)
  const handleMapsUrlParse = (url: string) => {
    setFormData((prev) => ({ ...prev, maps_url: url }));
    if (!url) return;
    const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)|q=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = url.match(regex);
    if (match) {
      const lat = match[1] || match[3];
      const lng = match[2] || match[4];
      setFormData((prev) => ({ ...prev, lat, lng }));
      showToast("ดึงพิกัดจากลิงก์สำเร็จ!", "success");
    }
  };

  const handleSave = async () => {
    if (!selectedTopic) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("attendance_topics")
        .update({
          title: formData.title,
          start_time: `${formData.start_time}:00`,
          end_time: `${formData.end_time}:00`,
          maps_url: formData.maps_url, // 🌟 บันทึกลิงก์กลับไปที่ฐานข้อมูลด้วย
          lat: parseFloat(formData.lat) || null,
          lng: parseFloat(formData.lng) || null,
          radius_meters: parseInt(formData.radius_meters.toString()) || 100,
          photo_mode: formData.photo_mode,
        })
        .eq("id", selectedTopic.id);

      if (error) throw error;

      showToast("บันทึกการตั้งค่าออฟฟิศเรียบร้อยแล้ว!", "success");
      fetchOfficeSettings(); // โหลดข้อมูลใหม่
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isLiffInit || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-sans">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-gray-500">
          กำลังโหลดการตั้งค่า...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-10">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[60] flex items-start gap-3 border shadow-2xl px-4 py-4 rounded-2xl animate-in slide-in-from-top-5 fade-in duration-300 ${
            toast.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
          )}
          <p className="text-sm font-bold leading-relaxed">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h1 className="font-bold text-lg">System Settings</h1>
          </div>
          {userProfile && (
            <div className="flex items-center gap-2 bg-white/10 py-1.5 px-3 rounded-full backdrop-blur-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold truncate max-w-[100px]">
                Admin Mode
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-lg w-full mx-auto animate-in fade-in duration-300">
        <div className="mb-6">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" /> ตั้งค่าสถานที่ประจำ
            (Office)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            ปรับแต่งพิกัด GPS รัศมี และเวลาทำงาน สำหรับพนักงานที่เข้าออฟฟิศ
          </p>
        </div>

        {officeTopics.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 text-center">
            <p className="font-bold text-gray-600">
              ไม่พบหัวข้องานประเภท "ออฟฟิศ" ในระบบ
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* เลือกออฟฟิศ (เผื่ออนาคตมีหลายสาขา) */}
            {officeTopics.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {officeTopics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => handleSelectTopic(topic)}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                      selectedTopic?.id === topic.id
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-100 bg-white text-gray-600 hover:border-blue-200"
                    }`}
                  >
                    {topic.title}
                  </button>
                ))}
              </div>
            )}

            {/* ฟอร์มแก้ไข */}
            {selectedTopic && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                      ชื่อสถานที่ (แสดงในแอป)
                    </label>
                    <input
                      type="text"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                        เวลาเข้างาน
                      </label>
                      <div className="relative">
                        <Clock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="time"
                          className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          value={formData.start_time}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              start_time: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                        เวลาออกงาน
                      </label>
                      <div className="relative">
                        <Clock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="time"
                          className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          value={formData.end_time}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              end_time: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-b border-gray-100 bg-slate-50 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPinHouse className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-gray-900">
                      การตั้งค่า GPS & รัศมี
                    </h3>
                  </div>

                  {/* 🌟 กล่องวางลิงก์ Google Maps แบบเดียวกับหน้า Admin */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      <LinkIcon className="h-4 w-4" /> วางลิงก์ Google Maps
                      เพื่อดึงพิกัด
                    </label>
                    <input
                      type="text"
                      placeholder="https://maps.google.com/..."
                      className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50 mb-3"
                      value={formData.maps_url}
                      onChange={(e) => handleMapsUrlParse(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">
                          ละติจูด (Lat)
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 bg-gray-100 border border-gray-200 rounded-lg font-mono text-xs text-gray-500 cursor-not-allowed"
                          value={formData.lat}
                          readOnly
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-400 mb-1">
                          ลองจิจูด (Lng)
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 bg-gray-100 border border-gray-200 rounded-lg font-mono text-xs text-gray-500 cursor-not-allowed"
                          value={formData.lng}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider flex justify-between">
                      <span>รัศมีที่อนุญาตให้ลงเวลา (เมตร)</span>
                      <span className="text-indigo-600">
                        {formData.radius_meters} ม.
                      </span>
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="1000"
                      step="50"
                      className="w-full accent-indigo-600"
                      value={formData.radius_meters}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          radius_meters: parseInt(e.target.value),
                        })
                      }
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1">
                      <span>เข้มงวด (50m)</span>
                      <span>ยืดหยุ่น (1000m)</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 border-b border-gray-100 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold text-gray-900">การยืนยันตัวตน</h3>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                      โหมดรูปถ่าย
                    </label>
                    <select
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none"
                      value={formData.photo_mode}
                      onChange={(e) =>
                        setFormData({ ...formData, photo_mode: e.target.value })
                      }
                    >
                      <option value="none">❌ ไม่ต้องแนบรูป</option>
                      <option value="camera">
                        📸 บังคับถ่ายจากกล้องสดเท่านั้น
                      </option>
                      <option value="gallery">
                        🖼️ เลือกจากอัลบั้ม หรือ ถ่ายสดก็ได้
                      </option>
                    </select>
                  </div>
                </div>

                <div className="p-5 bg-gray-50">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 px-4 rounded-2xl transition-transform active:scale-95 flex justify-center items-center gap-2 shadow-lg shadow-gray-200 disabled:opacity-50 disabled:active:scale-100"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Save className="h-5 w-5" /> บันทึกการตั้งค่าออฟฟิศ
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
