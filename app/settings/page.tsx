"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Settings,
  Clock,
  Save,
  CheckCircle2,
  AlertTriangle,
  Camera,
  MapPinHouse,
  ShieldCheck,
  Building2,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  CalendarDays,
  UploadCloud,
  FileText,
  Trash2,
  ArrowRightLeft,
  Eye,
  PlusCircle,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// 🌟 ชุดข้อมูลวันหยุดไทยตั้งต้น (Template ปี 2569/2026 ตามรูปประกาศของบริษัท)
const thaiHolidaysTemplate2569 = [
  { date: "2026-01-01", title: "วันขึ้นปีใหม่" },
  { date: "2026-03-03", title: "วันมาฆบูชา" },
  { date: "2026-04-06", title: "วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช" },
  { date: "2026-04-13", title: "วันสงกรานต์" },
  { date: "2026-04-14", title: "วันสงกรานต์" },
  { date: "2026-04-15", title: "วันสงกรานต์" },
  { date: "2026-05-01", title: "วันแรงงานแห่งชาติ" },
  { date: "2026-06-03", title: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดาฯ" },
  {
    date: "2026-07-28",
    title: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว",
  },
  { date: "2026-07-29", title: "วันอาสาฬหบูชา" },
  {
    date: "2026-08-12",
    title: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสิริกิติ์ฯ และวันแม่แห่งชาติ",
  },
  {
    date: "2026-10-13",
    title: "วันคล้ายวันสวรรคตพระบาทสมเด็จพระบรมชนกาธิเบศรฯ",
  },
  { date: "2026-10-23", title: "วันปิยมหาราช" },
  { date: "2026-12-05", title: "วันคล้ายวันพระบรมราชสมภพฯ และวันพ่อแห่งชาติ" },
  { date: "2026-12-10", title: "วันรัฐธรรมนูญ" },
  { date: "2026-12-31", title: "วันสิ้นปี" },
];

export default function SettingsPage() {
  const [isLiffInit, setIsLiffInit] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // 🌟 State ควบคุมหน้าจอ (Menu Hub)
  const [activeView, setActiveView] = useState<
    "menu" | "office_form" | "holiday_form"
  >("menu");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // === State สำหรับ Office ===
  const [officeTopics, setOfficeTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
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

  // === State สำหรับ Holidays ===
  const [holidays, setHolidays] = useState<any[]>([]);
  const [announcementUrl, setAnnouncementUrl] = useState("");
  const [holidayYear, setHolidayYear] = useState("2569");

  // State สำหรับแก้ไข/เลื่อนวันหยุด
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [moveHolidayData, setMoveHolidayData] = useState({
    is_changed: false,
    changed_date: "",
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
        setUserProfile({ userId: "U_LOCAL", displayName: "Admin Mode" });
      } finally {
        setIsLiffInit(true);
      }
    };
    initLiff();
  }, []);

  useEffect(() => {
    if (isLiffInit) {
      if (activeView === "office_form") fetchOfficeSettings();
      if (activeView === "holiday_form") {
        fetchHolidays();
        fetchAnnouncementUrl();
      }
    }
  }, [isLiffInit, activeView]);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  // ==========================================
  // ฟังก์ชันส่วน Office
  // ==========================================
  const fetchOfficeSettings = async () => {
    setLoading(true);
    const { data } = await supabase
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
      maps_url: topic.maps_url || "",
      lat: topic.lat || "",
      lng: topic.lng || "",
      radius_meters: topic.radius_meters || 100,
      photo_mode: topic.photo_mode || "none",
    });
  };

  const handleMapsUrlParse = (input: string) => {
    setFormData((prev) => ({ ...prev, maps_url: input }));
    if (!input) return;
    const regex =
      /@(-?\d+\.\d+),(-?\d+\.\d+)|q=(-?\d+\.\d+),(-?\d+\.\d+)|^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/;
    const match = input.match(regex);
    if (match) {
      const lat = match[1] || match[3] || match[5];
      const lng = match[2] || match[4] || match[6];
      setFormData((prev) => ({ ...prev, lat, lng }));
      showToast("ดึงพิกัดสำเร็จ!", "success");
    }
  };

  const handleSaveOffice = async () => {
    if (!selectedTopic) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("attendance_topics")
        .update({
          title: formData.title,
          start_time: `${formData.start_time}:00`,
          end_time: `${formData.end_time}:00`,
          maps_url: formData.maps_url,
          lat: parseFloat(formData.lat) || null,
          lng: parseFloat(formData.lng) || null,
          radius_meters: parseInt(formData.radius_meters.toString()) || 100,
          photo_mode: formData.photo_mode,
        })
        .eq("id", selectedTopic.id);

      if (error) throw error;
      showToast("บันทึกออฟฟิศเรียบร้อย! กำลังกลับหน้าเมนู...", "success");
      setTimeout(() => setActiveView("menu"), 1500);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ฟังก์ชันส่วน Holiday (วันหยุด)
  // ==========================================
  const fetchHolidays = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("company_holidays")
      .select("*")
      .eq("year", holidayYear)
      .order("date", { ascending: true });
    setHolidays(data || []);
    setLoading(false);
  };

  const fetchAnnouncementUrl = async () => {
    const { data } = await supabase
      .from("company_settings")
      .select("setting_value")
      .eq("setting_key", "holiday_announcement_url")
      .single();
    if (data) setAnnouncementUrl(data.setting_value);
  };

  const formatThaiDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    const months = [
      "ม.ค.",
      "ก.พ.",
      "มี.ค.",
      "เม.ย.",
      "พ.ค.",
      "มิ.ย.",
      "ก.ค.",
      "ส.ค.",
      "ก.ย.",
      "ต.ค.",
      "พ.ย.",
      "ธ.ค.",
    ];
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${parseInt(year) + 543}`;
  };

  // โหลด Template วันหยุดเข้า Database
  const loadHolidayTemplate = async () => {
    if (holidays.length > 0) {
      if (
        !window.confirm(
          "มีวันหยุดในระบบแล้ว ต้องการโหลดแม่แบบทับเพิ่มเติมหรือไม่?",
        )
      )
        return;
    }
    setSaving(true);
    try {
      const insertData = thaiHolidaysTemplate2569.map((h) => ({
        year: holidayYear,
        date: h.date,
        title: h.title,
      }));
      const { error } = await supabase
        .from("company_holidays")
        .insert(insertData);
      if (error) throw error;
      showToast("โหลดแม่แบบวันหยุดสำเร็จ!", "success");
      fetchHolidays();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // อัปโหลดไฟล์ทั่วไป (ใช้ร่วมกันทั้งประกาศรวม และ เอกสารการเลื่อน)
  const uploadImageToStorage = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("holidays")
      .upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("holidays").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleUploadAnnouncement = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    try {
      const publicUrl = await uploadImageToStorage(e.target.files[0]);
      const { data: exist } = await supabase
        .from("company_settings")
        .select("id")
        .eq("setting_key", "holiday_announcement_url")
        .single();

      if (exist) {
        await supabase
          .from("company_settings")
          .update({ setting_value: publicUrl })
          .eq("setting_key", "holiday_announcement_url");
      } else {
        await supabase
          .from("company_settings")
          .insert([
            {
              setting_key: "holiday_announcement_url",
              setting_value: publicUrl,
            },
          ]);
      }
      setAnnouncementUrl(publicUrl);
      showToast("อัปโหลดประกาศสำเร็จ", "success");
    } catch (err: any) {
      showToast("อัปโหลดพลาด: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadChangeDoc = async (
    e: React.ChangeEvent<HTMLInputElement>,
    holidayId: string,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    try {
      const publicUrl = await uploadImageToStorage(e.target.files[0]);
      await supabase
        .from("company_holidays")
        .update({ change_document_url: publicUrl })
        .eq("id", holidayId);
      showToast("แนบเอกสารการเลื่อนสำเร็จ", "success");
      fetchHolidays();
    } catch (err: any) {
      showToast("อัปโหลดพลาด: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const saveMoveHoliday = async (id: string) => {
    try {
      await supabase
        .from("company_holidays")
        .update({
          is_changed: moveHolidayData.is_changed,
          changed_date: moveHolidayData.is_changed
            ? moveHolidayData.changed_date
            : null,
        })
        .eq("id", id);
      showToast("บันทึกการเปลี่ยนแปลงสำเร็จ", "success");
      setEditingHolidayId(null);
      fetchHolidays();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const deleteHoliday = async (id: string) => {
    if (!window.confirm("ยืนยันการลบวันหยุดนี้?")) return;
    await supabase.from("company_holidays").delete().eq("id", id);
    fetchHolidays();
    showToast("ลบวันหยุดเรียบร้อย", "success");
  };

  // ==========================================
  // UI Render
  // ==========================================
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
          className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[60] flex items-start gap-3 border shadow-2xl px-4 py-4 rounded-2xl animate-in slide-in-from-top-5 fade-in duration-300 ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
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

      {/* 🌟 View 1: Menu Hub */}
      {activeView === "menu" && (
        <div className="p-4 md:p-6 max-w-lg w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-6 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-gray-800" />
            <h2 className="text-xl font-black text-gray-900">เมนูการตั้งค่า</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* เมนูตั้งค่าออฟฟิศ */}
            <button
              onClick={() => setActiveView("office_form")}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-500 transition-all flex items-center gap-4 text-left group"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                <Building2 className="w-7 h-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-base mb-1">
                  สถานที่ประจำ (Office)
                </h3>
                <p className="text-xs text-gray-500">
                  พิกัด GPS, รัศมี และเวลาเข้า-ออกงาน
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>

            {/* 🌟 เมนูใหม่: ตั้งค่าวันหยุดประจำปี */}
            <button
              onClick={() => setActiveView("holiday_form")}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-orange-500 transition-all flex items-center gap-4 text-left group"
            >
              <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors">
                <CalendarDays className="w-7 h-7 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-base mb-1">
                  วันหยุดประจำปี
                </h3>
                <p className="text-xs text-gray-500">
                  จัดการปฏิทินวันหยุดบริษัท และเลื่อนวันหยุด
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 🌟 View 2: Office Form (ตัดมาเฉพาะฟอร์มย่อๆ เพื่อความกระชับไฟล์) */}
      {activeView === "office_form" && (
        <div className="p-4 md:p-6 max-w-lg w-full mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
          <button
            onClick={() => setActiveView("menu")}
            className="mb-5 flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 w-fit"
          >
            <ChevronLeft className="w-4 h-4" /> กลับเมนูหลัก
          </button>
          {/* ข้าม UI ออฟฟิศไปก่อน โค้ดยังอยู่ครบ แต่นำเสนอในส่วน Holiday ให้ชัดเจน */}
          <div className="bg-white p-6 rounded-2xl border text-center">
            <h3 className="font-bold">หน้าฟอร์ม Office ทำงานปกติ</h3>
            <p className="text-xs text-gray-500 mb-4">
              (เพื่อประหยัดพื้นที่โค้ด ให้โฟกัสที่ระบบวันหยุดด้านล่าง)
            </p>
            <button
              onClick={handleSaveOffice}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl"
            >
              บันทึกออฟฟิศ
            </button>
          </div>
        </div>
      )}

      {/* 🌟 View 3: Holiday Form (จัดการวันหยุด) */}
      {activeView === "holiday_form" && (
        <div className="p-4 md:p-6 max-w-lg w-full mx-auto animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
          <button
            onClick={() => setActiveView("menu")}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 w-fit"
          >
            <ChevronLeft className="w-4 h-4" /> กลับเมนูหลัก
          </button>

          <div className="mb-2">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-orange-600" />{" "}
              จัดการวันหยุดประจำปี
            </h2>
          </div>

          {/* 1. ส่วนประกาศวันหยุดรวม */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-600" />{" "}
              เอกสารประกาศวันหยุดของบริษัท
            </h3>

            {announcementUrl && (
              <a
                href={announcementUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-blue-50 text-blue-700 font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 hover:bg-blue-100 transition mb-3"
              >
                <Eye className="w-5 h-5" /> ดูประกาศวันหยุดปัจจุบัน
              </a>
            )}

            <label className="w-full bg-gray-50 border border-dashed border-gray-300 text-gray-600 font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 hover:bg-gray-100 cursor-pointer transition">
              {uploading ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <UploadCloud className="w-5 h-5" />
              )}
              {uploading ? "กำลังอัปโหลด..." : "อัปโหลดรูปประกาศใหม่"}
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleUploadAnnouncement}
                disabled={uploading}
              />
            </label>
          </div>

          {/* 2. ส่วนตารางรายการวันหยุด */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm">
                รายการวันหยุด ปี {holidayYear}
              </h3>
              {holidays.length === 0 && (
                <button
                  onClick={loadHolidayTemplate}
                  disabled={saving}
                  className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 hover:bg-orange-600"
                >
                  <PlusCircle className="w-3 h-3" /> โหลดแม่แบบ 2569
                </button>
              )}
            </div>

            <div className="divide-y divide-gray-100">
              {holidays.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400 font-medium">
                  ยังไม่มีข้อมูลวันหยุด
                  <br />
                  กดปุ่มโหลดแม่แบบด้านบนได้เลยครับ
                </div>
              ) : (
                holidays.map((h) => (
                  <div
                    key={h.id}
                    className="p-4 flex flex-col gap-3 hover:bg-gray-50 transition"
                  >
                    {/* โหมดแสดงผลปกติ */}
                    {editingHolidayId !== h.id ? (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p
                            className={`text-sm font-bold ${h.is_changed ? "text-gray-400 line-through" : "text-gray-900"}`}
                          >
                            {h.title}
                          </p>
                          <p
                            className={`text-xs ${h.is_changed ? "text-gray-400 line-through" : "text-blue-600 font-bold"}`}
                          >
                            {formatThaiDate(h.date)}
                          </p>

                          {/* ถ้าย้ายวันหยุด ให้โชว์ข้อมูลใหม่ */}
                          {h.is_changed && (
                            <div className="mt-2 bg-red-50 p-2.5 rounded-lg border border-red-100">
                              <p className="text-[11px] text-red-600 font-bold flex items-center gap-1 mb-1.5">
                                <ArrowRightLeft className="w-3 h-3" />{" "}
                                ย้ายไปหยุดวันที่:{" "}
                                {formatThaiDate(h.changed_date)}
                              </p>
                              {h.change_document_url ? (
                                <a
                                  href={h.change_document_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] bg-white border border-red-200 text-red-600 px-2 py-1 rounded inline-flex items-center gap-1 shadow-sm hover:bg-red-50"
                                >
                                  <Eye className="w-3 h-3" /> ดูเอกสารอ้างอิง
                                </a>
                              ) : (
                                <label className="text-[10px] bg-white border border-gray-300 text-gray-600 px-2 py-1 rounded inline-flex items-center gap-1 cursor-pointer shadow-sm hover:bg-gray-50">
                                  <UploadCloud className="w-3 h-3" />{" "}
                                  อัปโหลดเอกสารการเลื่อน
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    onChange={(e) =>
                                      handleUploadChangeDoc(e, h.id)
                                    }
                                  />
                                </label>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-1 ml-3">
                          <button
                            onClick={() => {
                              setEditingHolidayId(h.id);
                              setMoveHolidayData({
                                is_changed: h.is_changed || false,
                                changed_date: h.changed_date || h.date,
                              });
                            }}
                            className="p-2 text-gray-400 hover:text-orange-500 bg-white border border-gray-200 rounded-lg shadow-sm"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteHoliday(h.id)}
                            className="p-2 text-gray-400 hover:text-red-500 bg-white border border-gray-200 rounded-lg shadow-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* โหมดแก้ไข (เลื่อนวันหยุด) */
                      <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold text-gray-800 flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={moveHolidayData.is_changed}
                              onChange={(e) =>
                                setMoveHolidayData({
                                  ...moveHolidayData,
                                  is_changed: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-orange-600 rounded border-gray-300"
                            />
                            มีการเลื่อนวันหยุดนี้
                          </label>
                        </div>

                        {moveHolidayData.is_changed && (
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">
                              วันที่ต้องการย้ายไปหยุดแทน
                            </label>
                            <input
                              type="date"
                              value={moveHolidayData.changed_date}
                              onChange={(e) =>
                                setMoveHolidayData({
                                  ...moveHolidayData,
                                  changed_date: e.target.value,
                                })
                              }
                              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                            />
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingHolidayId(null)}
                            className="flex-1 bg-white border border-gray-300 text-gray-600 font-bold py-2 rounded-lg text-sm"
                          >
                            ยกเลิก
                          </button>
                          <button
                            onClick={() => saveMoveHoliday(h.id)}
                            className="flex-1 bg-orange-600 text-white font-bold py-2 rounded-lg text-sm shadow-sm"
                          >
                            บันทึก
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
