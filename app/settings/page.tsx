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

  // 🌟 รองรับการเลือกปี (ตั้งค่า Default เป็นปีปัจจุบัน พ.ศ.)
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

  // 🌟 State สำหรับเพิ่มวันหยุดใหม่
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
  }, [isLiffInit, activeView, holidayYear]); // 🌟 ดึงข้อมูลใหม่ทุกครั้งที่เปลี่ยนปี

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

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
        })
        .eq("id", selectedTopic.id);
      if (error) throw error;
      showToast("บันทึกออฟฟิศเรียบร้อย!", "success");
      setTimeout(() => setActiveView("menu"), 1500);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

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

  // 🌟 โหลด Template อัจฉริยะข้ามปี
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

  // 🌟 บันทึกเพิ่มวันหยุดใหม่ (Custom)
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
        กำลังโหลด...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-10">
      {toast.show && (
        <div
          className={`fixed top-4 left-4 right-4 md:w-96 z-[60] flex items-start gap-3 border shadow-2xl px-4 py-4 rounded-2xl ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-500" />
          )}
          <p className="text-sm font-bold">{toast.message}</p>
        </div>
      )}

      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h1 className="font-bold text-lg">System Settings</h1>
          </div>
        </div>
      </div>

      {activeView === "menu" && (
        <div className="p-4 md:p-6 max-w-lg w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setActiveView("office_form")}
              className="bg-white p-5 rounded-2xl shadow-sm border hover:border-blue-500 flex items-center gap-4 text-left"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                <Building2 className="w-7 h-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">สถานที่ประจำ (Office)</h3>
              </div>
            </button>
            <button
              onClick={() => setActiveView("holiday_form")}
              className="bg-white p-5 rounded-2xl shadow-sm border hover:border-orange-500 flex items-center gap-4 text-left"
            >
              <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                <CalendarDays className="w-7 h-7 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">วันหยุดประจำปี</h3>
              </div>
            </button>
          </div>
        </div>
      )}

      {activeView === "holiday_form" && (
        <div className="p-4 md:p-6 max-w-lg w-full mx-auto animate-in fade-in slide-in-from-right-4 space-y-5">
          <button
            onClick={() => setActiveView("menu")}
            className="flex items-center gap-1 text-sm font-bold text-gray-500 bg-white px-4 py-2 rounded-full border shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" /> กลับเมนูหลัก
          </button>

          {/* 🌟 1. แท็บเลือกปี */}
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {yearOptions.map((y) => (
              <button
                key={y}
                onClick={() => setHolidayYear(y)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all shrink-0 ${holidayYear === y ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}
              >
                วันหยุดปี {y}
              </button>
            ))}
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-600" />{" "}
              ประกาศวันหยุดของบริษัท
            </h3>
            {announcementUrl && (
              <a
                href={announcementUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-blue-50 text-blue-700 font-bold py-3 rounded-xl flex justify-center items-center gap-2 mb-3"
              >
                <Eye className="w-5 h-5" /> ดูประกาศปัจจุบัน
              </a>
            )}
            <label className="w-full bg-gray-50 border border-dashed border-gray-300 text-gray-600 font-bold py-3 rounded-xl flex justify-center items-center gap-2 cursor-pointer">
              {uploading ? (
                "กำลังอัปโหลด..."
              ) : (
                <>
                  <UploadCloud className="w-5 h-5" /> อัปโหลดรูปประกาศใหม่
                </>
              )}
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleUploadAnnouncement}
                disabled={uploading}
              />
            </label>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
            <div className="p-4 bg-slate-50 flex justify-between items-center border-b">
              <h3 className="font-bold text-sm">
                รายการวันหยุด ปี {holidayYear}
              </h3>
              <div className="flex gap-2">
                {holidays.length === 0 && (
                  <button
                    onClick={loadHolidayTemplate}
                    className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-600"
                  >
                    โหลดแม่แบบ
                  </button>
                )}
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1"
                >
                  <PlusCircle className="w-3 h-3" /> เพิ่มใหม่
                </button>
              </div>
            </div>

            <div className="p-4 bg-white">
              {/* 🌟 2. ฟอร์มเพิ่มวันหยุดเอง */}
              {showAddForm && (
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-col gap-3 mb-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">
                        วันที่ต้องการหยุด
                      </label>
                      <input
                        type="date"
                        value={newHoliday.date}
                        onChange={(e) =>
                          setNewHoliday({ ...newHoliday, date: e.target.value })
                        }
                        className="w-full p-2 border border-blue-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">
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
                        className="w-full p-2 border border-blue-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border rounded-lg shadow-sm"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleAddHoliday}
                      disabled={saving}
                      className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg shadow-sm"
                    >
                      บันทึกวันหยุดเพิ่ม
                    </button>
                  </div>
                </div>
              )}

              <div className="divide-y divide-gray-100">
                {holidays.map((h) => (
                  <div key={h.id} className="py-4 flex flex-col gap-3">
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
                          {h.is_changed && (
                            <div className="mt-2 bg-red-50 p-2.5 rounded-lg border border-red-100">
                              <p className="text-[11px] text-red-600 font-bold mb-1.5">
                                <ArrowRightLeft className="w-3 h-3 inline" />{" "}
                                ย้ายเป็น: {formatThaiDate(h.changed_date)}
                              </p>
                              {h.change_document_url ? (
                                <a
                                  href={h.change_document_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] bg-white border border-red-200 text-red-600 px-2 py-1 rounded inline-flex gap-1"
                                >
                                  <Eye className="w-3 h-3" /> ดูเอกสารอ้างอิง
                                </a>
                              ) : (
                                <label className="text-[10px] bg-white border border-gray-300 text-gray-600 px-2 py-1 rounded inline-flex gap-1 cursor-pointer">
                                  <UploadCloud className="w-3 h-3" />{" "}
                                  อัปโหลดเอกสารเลื่อน
                                  <input
                                    type="file"
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
                                is_changed: h.is_changed,
                                changed_date: h.changed_date || h.date,
                              });
                            }}
                            className="p-2 text-gray-400 hover:text-orange-500 border rounded-lg"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteHoliday(h.id)}
                            className="p-2 text-gray-400 hover:text-red-500 border rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                        <label className="text-sm font-bold flex gap-2 cursor-pointer mb-3">
                          <input
                            type="checkbox"
                            checked={moveHolidayData.is_changed}
                            onChange={(e) =>
                              setMoveHolidayData({
                                ...moveHolidayData,
                                is_changed: e.target.checked,
                              })
                            }
                            className="w-4 h-4"
                          />{" "}
                          มีการเลื่อนวันหยุด
                        </label>
                        {moveHolidayData.is_changed && (
                          <input
                            type="date"
                            value={moveHolidayData.changed_date}
                            onChange={(e) =>
                              setMoveHolidayData({
                                ...moveHolidayData,
                                changed_date: e.target.value,
                              })
                            }
                            className="w-full border p-2 text-sm mb-3 rounded-lg"
                          />
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingHolidayId(null)}
                            className="flex-1 bg-white border py-2 rounded-lg text-sm font-bold"
                          >
                            ยกเลิก
                          </button>
                          <button
                            onClick={() => saveMoveHoliday(h.id)}
                            className="flex-1 bg-orange-600 text-white py-2 rounded-lg text-sm font-bold"
                          >
                            บันทึก
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
