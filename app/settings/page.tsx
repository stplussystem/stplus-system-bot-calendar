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

// 🌟 Template ฐาน (ไม่มีปีติดมาด้วย) เพื่อให้ปรับใช้ได้กับทุกปี
const thaiHolidaysTemplateBase = [
  { month: "01", day: "01", title: "วันขึ้นปีใหม่" },
  { month: "03", day: "03", title: "วันมาฆบูชา" },
  {
    month: "04",
    day: "06",
    title: "วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช",
  },
  { month: "04", day: "13", title: "วันสงกรานต์" },
  { month: "04", day: "14", title: "วันสงกรานต์" },
  { month: "04", day: "15", title: "วันสงกรานต์" },
  { month: "05", day: "01", title: "วันแรงงานแห่งชาติ" },
  {
    month: "06",
    day: "03",
    title: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดาฯ",
  },
  {
    month: "07",
    day: "28",
    title: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว",
  },
  { month: "07", day: "29", title: "วันอาสาฬหบูชา" },
  { month: "08", day: "12", title: "วันเฉลิมพระชนมพรรษาฯ และวันแม่แห่งชาติ" },
  {
    month: "10",
    day: "13",
    title: "วันคล้ายวันสวรรคตพระบาทสมเด็จพระบรมชนกาธิเบศรฯ",
  },
  { month: "10", day: "23", title: "วันปิยมหาราช" },
  {
    month: "12",
    day: "05",
    title: "วันคล้ายวันพระบรมราชสมภพฯ และวันพ่อแห่งชาติ",
  },
  { month: "12", day: "10", title: "วันรัฐธรรมนูญ" },
  { month: "12", day: "31", title: "วันสิ้นปี" },
];

export default function SettingsPage() {
  const [isLiffInit, setIsLiffInit] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

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

  // ==========================================
  // State สำหรับ Office
  // ==========================================
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

  // ==========================================
  // State สำหรับ Holidays
  // ==========================================
  const [holidays, setHolidays] = useState<any[]>([]);
  const [announcementUrl, setAnnouncementUrl] = useState("");

  // รองรับการเลือกปี (ตั้งค่า Default เป็นปีปัจจุบัน พ.ศ.)
  const currentYearNum = new Date().getFullYear() + 543;
  const [holidayYear, setHolidayYear] = useState<string>(
    currentYearNum.toString(),
  );

  // ตัวเลือกปี: ปีที่แล้ว, ปีนี้, ปีหน้า
  const yearOptions = [
    (currentYearNum - 1).toString(),
    currentYearNum.toString(),
    (currentYearNum + 1).toString(),
  ];

  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [moveHolidayData, setMoveHolidayData] = useState({
    is_changed: false,
    changed_date: "",
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: "", title: "" });

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: "2010143328-wyg8T4P5" });
        if (liff.isLoggedIn()) setUserProfile(await liff.getProfile());
        else liff.login();
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
  }, [isLiffInit, activeView, holidayYear]);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  // === ฟังก์ชัน Office ===
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
      showToast("บันทึกข้อมูลเรียบร้อย! ระบบกำลังปิดหน้าต่าง...", "success");
      setTimeout(async () => {
        try {
          const liff = (await import("@line/liff")).default;
          if (liff.isLoggedIn()) liff.closeWindow();
          else setActiveView("menu");
        } catch (e) {
          setActiveView("menu");
        }
      }, 1500);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // === ฟังก์ชัน Holidays ===
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
      const gregorianYear = parseInt(holidayYear) - 543;
      const insertData = thaiHolidaysTemplateBase.map((h) => ({
        year: holidayYear,
        date: `${gregorianYear}-${h.month}-${h.day}`,
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

  const handleAddHoliday = async () => {
    if (!newHoliday.date || !newHoliday.title)
      return showToast("กรุณากรอกวันที่และชื่อวันหยุด", "error");
    setSaving(true);
    try {
      const { error } = await supabase.from("company_holidays").insert([
        {
          year: holidayYear,
          date: newHoliday.date,
          title: newHoliday.title,
        },
      ]);
      if (error) throw error;
      showToast("เพิ่มวันหยุดใหม่เรียบร้อย", "success");
      setNewHoliday({ date: "", title: "" });
      setShowAddForm(false);
      fetchHolidays();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const uploadImageToStorage = async (file: File) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("holidays")
      .upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from("holidays").getPublicUrl(fileName);
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
      if (exist)
        await supabase
          .from("company_settings")
          .update({ setting_value: publicUrl })
          .eq("setting_key", "holiday_announcement_url");
      else
        await supabase
          .from("company_settings")
          .insert([
            {
              setting_key: "holiday_announcement_url",
              setting_value: publicUrl,
            },
          ]);
      setAnnouncementUrl(publicUrl);
      showToast("อัปโหลดประกาศสำเร็จ", "success");
    } catch (err: any) {
      showToast("อัปโหลดพลาด", "error");
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
      showToast("แนบเอกสารสำเร็จ", "success");
      fetchHolidays();
    } catch (err: any) {
      showToast("อัปโหลดพลาด", "error");
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
  };

  if (!isLiffInit || (loading && activeView === "menu"))
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-10">
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
            <button
              onClick={() => setActiveView("office_form")}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all flex items-center gap-4 text-left group"
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
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
              </div>
            </button>

            <button
              onClick={() => setActiveView("holiday_form")}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-orange-500 hover:shadow-md transition-all flex items-center gap-4 text-left group"
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
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 🌟 View 2: Office Form (ฟอร์มตัวเต็ม) */}
      {activeView === "office_form" && (
        <div className="p-4 md:p-6 max-w-lg w-full mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
          <button
            onClick={() => setActiveView("menu")}
            className="mb-5 flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 w-fit"
          >
            <ChevronLeft className="w-4 h-4" /> กลับเมนูหลัก
          </button>
          <div className="mb-6">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />{" "}
              ตั้งค่าสถานที่ประจำ
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              ปรับแต่งพิกัด GPS รัศมี และเวลาทำงาน สำหรับออฟฟิศ
            </p>
          </div>

          {selectedTopic && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden space-y-0">
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
                <div className="grid grid-cols-2 gap-6">
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
                          setFormData({ ...formData, end_time: e.target.value })
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
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                    <LinkIcon className="h-4 w-4" /> วางลิงก์ Google Maps หรือ
                    พิกัด
                  </label>
                  <details className="mb-3 group">
                    <summary className="text-xs text-blue-600 font-bold cursor-pointer hover:text-blue-700 list-none flex items-center gap-1.5 select-none">
                      <span className="bg-blue-100 text-blue-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px] shrink-0">
                        ?
                      </span>
                      วิธีดูพิกัดจากมือถือ (คลิก)
                    </summary>
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-[11px] text-gray-700 space-y-1.5 leading-relaxed">
                      <p>
                        1. เปิดแอป <b>Google Maps</b>
                      </p>
                      <p>
                        2. <b>แตะค้าง</b> ตรงจุดที่ต้องการให้ขึ้นหมุดสีแดง
                        (Dropped Pin)
                      </p>
                      <p>
                        3. เลื่อนดูรายละเอียดด้านล่าง จะเห็นตัวเลขพิกัด (เช่น{" "}
                        <code className="bg-white px-1.5 py-0.5 rounded text-blue-600 border border-blue-200 shadow-sm font-mono">
                          13.7563, 100.5018
                        </code>
                        ) ให้ก๊อปปี้ตัวเลขมาวางได้เลย
                      </p>
                    </div>
                  </details>
                  <input
                    type="text"
                    placeholder="วางลิงก์ Maps หรือ วางพิกัด (เช่น 13.123, 100.456)"
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
                    <option value="none">ไม่ต้องแนบรูป</option>
                    <option value="camera">ต้องถ่ายจากกล้องเท่านั้น</option>
                    <option value="gallery">
                      เลือกจากอัลบั้ม หรือ ถ่ายสดก็ได้
                    </option>
                  </select>
                </div>
              </div>

              <div className="p-5 bg-gray-50">
                <button
                  onClick={handleSaveOffice}
                  disabled={saving}
                  className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 px-4 rounded-2xl transition-transform active:scale-95 flex justify-center items-center gap-2 shadow-lg shadow-gray-200 disabled:opacity-50"
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

      {/* 🌟 View 3: Holiday Form (ฟอร์มจัดเต็มเรื่องวันหยุด) */}
      {activeView === "holiday_form" && (
        <div className="p-4 md:p-6 max-w-lg w-full mx-auto animate-in fade-in slide-in-from-right-4 space-y-5">
          <button
            onClick={() => setActiveView("menu")}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm w-fit transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> กลับเมนูหลัก
          </button>

          {/* แท็บเลือกปี (สไลด์ซ้ายขวาได้) */}
          <div className="flex gap-2 overflow-x-auto pb-1 pt-1 custom-scrollbar">
            {yearOptions.map((y) => (
              <button
                key={y}
                onClick={() => setHolidayYear(y)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all shrink-0 ${holidayYear === y ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm" : "border-gray-100 bg-white text-gray-500 hover:border-gray-200 hover:bg-gray-50"}`}
              >
                วันหยุดปี {y}
              </button>
            ))}
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-600" />{" "}
              เอกสารประกาศวันหยุดของบริษัท
            </h3>
            {announcementUrl && (
              <a
                href={announcementUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-blue-50 text-blue-700 font-bold py-3 rounded-xl flex justify-center items-center gap-2 mb-3 hover:bg-blue-100 transition-colors"
              >
                <Eye className="w-5 h-5" /> ดูประกาศวันหยุดปัจจุบัน
              </a>
            )}
            <label className="w-full bg-gray-50 border border-dashed border-gray-300 text-gray-600 font-bold py-3 rounded-xl flex justify-center items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors">
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

          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-slate-50 flex justify-between items-center border-b border-gray-100">
              <h3 className="font-bold text-sm text-gray-800">
                รายการวันหยุด ปี {holidayYear}
              </h3>
              <div className="flex gap-2">
                {holidays.length === 0 && (
                  <button
                    onClick={loadHolidayTemplate}
                    className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors shadow-sm"
                  >
                    โหลดแม่แบบ {holidayYear}
                  </button>
                )}
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm"
                >
                  <PlusCircle className="w-3 h-3" /> เพิ่มใหม่
                </button>
              </div>
            </div>

            <div className="p-0 bg-white">
              {/* ฟอร์มเพิ่มวันหยุดเอง (จะโชว์เมื่อกดปุ่ม "เพิ่มใหม่") */}
              {showAddForm && (
                <div className="bg-blue-50/50 p-4 m-4 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-col gap-3 mb-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1.5">
                        วันที่ต้องการหยุด
                      </label>
                      <input
                        type="date"
                        value={newHoliday.date}
                        onChange={(e) =>
                          setNewHoliday({ ...newHoliday, date: e.target.value })
                        }
                        className="w-full p-2.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1.5">
                        ชื่อเรียกวันหยุด
                      </label>
                      <input
                        type="text"
                        value={newHoliday.title}
                        onChange={(e) =>
                          setNewHoliday({
                            ...newHoliday,
                            title: e.target.value,
                          })
                        }
                        placeholder="เช่น วันเกิดบริษัท, หยุดชดเชยพิเศษ"
                        className="w-full p-2.5 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleAddHoliday}
                      disabled={saving}
                      className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700"
                    >
                      บันทึกวันหยุดเพิ่ม
                    </button>
                  </div>
                </div>
              )}

              {/* 🌟 รายการวันหยุด (กลับมาใช้ดีไซน์ Expanded แบบโปร่งสวยงามเหมือนเดิม) */}
              <div className="divide-y divide-gray-100">
                {holidays.length === 0 && !showAddForm ? (
                  <div className="p-8 text-center text-sm text-gray-400 font-medium">
                    ยังไม่มีข้อมูลวันหยุด
                    <br />
                    กดโหลดแม่แบบ หรือ เพิ่มใหม่ ได้เลยครับ
                  </div>
                ) : (
                  holidays.map((h) => (
                    <div
                      key={h.id}
                      className="p-4 flex flex-col gap-3 hover:bg-gray-50/80 transition-colors"
                    >
                      {editingHolidayId !== h.id ? (
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p
                              className={`text-sm font-bold leading-relaxed ${h.is_changed ? "text-gray-400 line-through" : "text-gray-900"}`}
                            >
                              {h.title}
                            </p>
                            <p
                              className={`text-xs mt-0.5 ${h.is_changed ? "text-gray-400 line-through" : "text-blue-600 font-bold"}`}
                            >
                              {formatThaiDate(h.date)}
                            </p>

                            {/* กรณีย้ายวันหยุด */}
                            {h.is_changed && (
                              <div className="mt-3 bg-red-50 p-3 rounded-xl border border-red-100/50">
                                <p className="text-[12px] text-red-600 font-bold flex items-center gap-1.5 mb-2">
                                  <ArrowRightLeft className="w-3.5 h-3.5" />{" "}
                                  ย้ายไปหยุดวันที่:{" "}
                                  {formatThaiDate(h.changed_date)}
                                </p>
                                {h.change_document_url ? (
                                  <a
                                    href={h.change_document_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-sm hover:bg-red-50 transition-colors font-bold"
                                  >
                                    <Eye className="w-3.5 h-3.5" />{" "}
                                    ดูเอกสารอ้างอิง
                                  </a>
                                ) : (
                                  <label className="text-[11px] bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-sm hover:bg-gray-50 transition-colors font-bold">
                                    <UploadCloud className="w-3.5 h-3.5" />{" "}
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
                          <div className="flex gap-1.5 ml-3">
                            <button
                              onClick={() => {
                                setEditingHolidayId(h.id);
                                setMoveHolidayData({
                                  is_changed: h.is_changed || false,
                                  changed_date: h.changed_date || h.date,
                                });
                              }}
                              className="p-2 text-gray-400 hover:text-orange-500 bg-white border border-gray-200 rounded-lg shadow-sm transition-colors"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteHoliday(h.id)}
                              className="p-2 text-gray-400 hover:text-red-500 bg-white border border-gray-200 rounded-lg shadow-sm transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* โหมดแก้ไข (เลื่อนวันหยุด) */
                        <div className="bg-orange-50/80 p-4 rounded-xl border border-orange-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
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
                                className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                              />
                              มีการเลื่อนวันหยุดนี้
                            </label>
                          </div>
                          {moveHolidayData.is_changed && (
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1.5">
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
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          )}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => setEditingHolidayId(null)}
                              className="flex-1 bg-white border border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl text-sm shadow-sm hover:bg-gray-50 transition-colors"
                            >
                              ยกเลิก
                            </button>
                            <button
                              onClick={() => saveMoveHoliday(h.id)}
                              className="flex-1 bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm shadow-sm hover:bg-orange-700 transition-colors"
                            >
                              บันทึกข้อมูล
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
        </div>
      )}
    </div>
  );
}
