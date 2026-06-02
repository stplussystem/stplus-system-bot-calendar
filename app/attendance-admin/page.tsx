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
  Building,
  MapPinHouse,
  Trash2,
  Link as LinkIcon,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AttendanceAdminPage() {
  const [authStatus, setAuthStatus] = useState<
    "checking" | "allowed" | "denied"
  >("checking");
  const [activeTab, setActiveTab] = useState<"form" | "list">("form");
  const [loading, setLoading] = useState(false);

  const [activeTopics, setActiveTopics] = useState<any[]>([]);
  const [pastTopics, setPastTopics] = useState<any[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    topicId: null as string | null,
    title: "",
    message: "",
  });

  const [formData, setFormData] = useState({
    title: "",
    shift_type: "morning",
    start_time: "09:00",
    end_time: "18:00",
    work_type: "onsite",
    radius_meters: 100,
    photo_mode: "camera",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    is_active: true,
    maps_url: "",
    lat: "",
    lng: "",
    allowed_users: [] as string[], // 🌟 ตอนนี้จะใช้เก็บ ID ของ "หัวหน้าทีม" แทนครับ
  });

  // 👥 รายชื่อ "หัวหน้าทีม" (Team Leaders)
  const teamLeaderList = [
    { id: "team_n", name: "พี่นุ" },
    { id: "team_a", name: "พี่หนุ่ม" },
    { id: "team_b", name: "พี่หนึ่ง" },
    { id: "team_c", name: "พี่บาส" },
    { id: "team_d", name: "แคมป์" },
    { id: "team_e", name: "หนึ่ง" },
    { id: "team_f", name: "ทิ" },
    { id: "team_g", name: "พี่แม็ค" },
  ];

  useEffect(() => {
    checkUserRole();
    fetchTopics();
  }, []);

  const checkUserRole = async () => {
    setAuthStatus("allowed");
  };

  const fetchTopics = async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("attendance_topics")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const active = data.filter((t) => t.is_active && t.end_date >= todayStr);
      const past = data.filter((t) => !t.is_active || t.end_date < todayStr);
      setActiveTopics(active);
      setPastTopics(past);
    }
  };

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
  };

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

  // 🌟 ฟังก์ชันสลับการเลือกหัวหน้าทีม
  const toggleTeamLeader = (leaderId: string) => {
    setFormData((prev) => {
      const isSelected = prev.allowed_users.includes(leaderId);
      if (isSelected) {
        return {
          ...prev,
          allowed_users: prev.allowed_users.filter((id) => id !== leaderId),
        };
      } else {
        return { ...prev, allowed_users: [...prev.allowed_users, leaderId] };
      }
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
      radius_meters: topic.radius_meters,
      photo_mode: topic.photo_mode,
      start_date: topic.start_date,
      end_date: topic.end_date,
      is_active: topic.is_active,
      maps_url: topic.maps_url || "",
      lat: topic.lat || "",
      lng: topic.lng || "",
      allowed_users: topic.allowed_users || [], // ดึงรายชื่อหัวหน้าทีมที่เคยเลือกไว้
    });
    setActiveTab("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (
    topicId: string,
    topicTitle: string,
    isOffice: boolean,
  ) => {
    if (isOffice) {
      showToast(
        "ไม่สามารถลบหัวข้อ Office ส่วนกลางได้ (ทำได้แค่ปิดสถานะ)",
        "error",
      );
      return;
    }
    setConfirmModal({
      isOpen: true,
      topicId: topicId,
      title: "ยืนยันการลบข้อมูล",
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบหัวข้อ "${topicTitle}" ?`,
    });
  };

  const confirmDelete = async () => {
    if (!confirmModal.topicId) return;
    try {
      const { error } = await supabase
        .from("attendance_topics")
        .delete()
        .eq("id", confirmModal.topicId);
      if (error) throw error;
      showToast("ลบข้อมูลสำเร็จเรียบร้อยแล้ว", "success");
      fetchTopics();
    } catch (error: any) {
      showToast("ลบไม่สำเร็จ: " + error.message, "error");
    } finally {
      setConfirmModal({ isOpen: false, topicId: null, title: "", message: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        title: formData.title,
        shift_type: formData.shift_type,
        start_time: formData.start_time,
        end_time: formData.end_time,
        team_type: formData.work_type === "office" ? "office" : "onsite", // ใช้เป็น flag แยกประเภท
        radius_meters: formData.radius_meters,
        photo_mode: formData.photo_mode,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: formData.is_active,
        maps_url: formData.maps_url,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        allowed_users:
          formData.work_type === "office" ? [] : formData.allowed_users, // ถ้าเป็นออฟฟิศให้เคลียร์สิทธิ์หัวหน้าทีมทิ้ง (เห็นทุกคน)
        created_by: "U_MANAGER_MOCK_ID",
      };

      if (editingId) {
        const { error } = await supabase
          .from("attendance_topics")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        showToast("อัปเดตข้อมูลสำเร็จ!", "success");
      } else {
        const { error } = await supabase
          .from("attendance_topics")
          .insert([payload]);
        if (error) throw error;
        showToast("บันทึกหัวข้อใหม่สำเร็จ!", "success");
      }

      setEditingId(null);
      setActiveTab("list");
      fetchTopics();
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const isPermanent = formData.end_date === "2099-12-31";

  // 🌟 ฟังก์ชันแปลง ID หัวหน้าทีม เป็นชื่อแสดงผล
  const getLeaderNames = (ids: string[]) => {
    if (!ids || ids.length === 0) return "เห็นทุกคนทุกทีม";
    const names = ids.map(
      (id) => teamLeaderList.find((l) => l.id === id)?.name || id,
    );
    return names.join(", ");
  };

  if (authStatus === "checking")
    return (
      <div className="min-h-screen flex justify-center items-center">
        กำลังโหลด...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 flex flex-col items-center pt-8 font-sans pb-20 relative">
      {toast.show && (
        <div className="fixed top-6 right-6 z-[60] flex items-center gap-3 bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)] px-5 py-4 rounded-xl animate-in slide-in-from-top-5 fade-in duration-300">
          {toast.type === "success" ? (
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          ) : (
            <XCircle className="w-6 h-6 text-red-500" />
          )}
          <p className="text-sm font-bold text-gray-800">{toast.message}</p>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-8 flex flex-col items-center text-center bg-red-50">
              <Trash2 className="w-10 h-10 text-red-600 mb-3" />
              <h3 className="text-xl font-bold text-red-900">
                {confirmModal.title}
              </h3>
              <p className="text-sm mt-3 text-red-700/80">
                {confirmModal.message}
              </p>
            </div>
            <div className="p-4 bg-white flex gap-3">
              <button
                onClick={() =>
                  setConfirmModal({ ...confirmModal, isOpen: false })
                }
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-sm shadow-red-200"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl w-full mb-6">
        <div className="flex space-x-2 bg-gray-200/50 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex-1 flex justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === "form" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <PlusCircle className="w-4 h-4" />
            {editingId ? "แก้ไขหัวข้อ" : "สร้างหัวข้อใหม่"}
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 flex justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === "list" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <List className="w-4 h-4" />
            รายการหัวข้องาน
          </button>
        </div>
      </div>

      {activeTab === "form" && (
        <div className="bg-white max-w-2xl w-full rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden relative animate-in fade-in slide-in-from-bottom-4 duration-300">
          {editingId && (
            <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-4 py-1 rounded-bl-xl shadow-sm">
              โหมดแก้ไขข้อมูล
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                ชื่อหัวข้องาน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น ไซต์งานติดตั้งคณะราษฎร"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <label className="flex items-center gap-2 text-sm font-bold text-blue-900 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
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
                  <Infinity className="h-4 w-4 text-blue-600" /> หัวข้องานประจำ
                  (ไม่มีวันหมดอายุ)
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    เริ่มวันที่
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
                    className={`text-sm font-semibold mb-2 block ${isPermanent ? "text-gray-400" : "text-gray-700"}`}
                  >
                    ถึงวันที่
                  </label>
                  {isPermanent ? (
                    <div className="w-full border border-gray-200 bg-gray-100 rounded-lg p-3 text-sm text-gray-500 font-semibold text-center">
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

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Briefcase className="h-4 w-4" /> รูปแบบการเข้างาน
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
                      setFormData({ ...formData, work_type: "office" })
                    }
                  />
                  <span className="flex items-center justify-center gap-2 text-sm font-bold text-gray-900">
                    <Building className="h-5 w-5" /> ประจำออฟฟิศ
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
                      setFormData({ ...formData, work_type: "onsite" })
                    }
                  />
                  <span className="flex items-center justify-center gap-2 text-sm font-bold text-gray-900">
                    <MapPinHouse className="h-5 w-5" /> ออกไซต์งาน
                  </span>
                </label>
              </div>

              {formData.work_type === "onsite" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <label className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-2">
                      <LinkIcon className="h-4 w-4" /> วางลิงก์ Google Maps
                      เพื่อดึงพิกัด
                    </label>
                    <input
                      type="text"
                      placeholder="https://maps.google.com/..."
                      className="w-full border border-blue-200 rounded-lg p-3 text-sm outline-none bg-white mb-2"
                      value={formData.maps_url}
                      onChange={(e) => handleMapsUrlParse(e.target.value)}
                    />
                    <div className="flex gap-4">
                      <input
                        type="text"
                        placeholder="ละติจูด (Lat)"
                        className="w-1/2 border border-gray-300 rounded-lg p-2 text-xs bg-gray-100 text-gray-600 font-mono"
                        value={formData.lat}
                        readOnly
                      />
                      <input
                        type="text"
                        placeholder="ลองจิจูด (Lng)"
                        className="w-1/2 border border-gray-300 rounded-lg p-2 text-xs bg-gray-100 text-gray-600 font-mono"
                        value={formData.lng}
                        readOnly
                      />
                    </div>
                  </div>

                  {/* 🌟 ปรับปรุง: การเลือกหัวหน้าทีมแทนการเลือกพนักงานทั่วไป */}
                  <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                    <label className="flex items-center gap-2 text-sm font-semibold text-orange-900 mb-3">
                      <Users className="h-4 w-4" />{" "}
                      เลือกหัวหน้าทีมที่รับผิดชอบไซต์นี้ (เว้นว่าง = เห็นทุกคน)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {teamLeaderList.map((leader) => (
                        <label
                          key={leader.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer text-xs font-bold transition-colors ${formData.allowed_users.includes(leader.id) ? "bg-orange-500 text-white border-orange-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={formData.allowed_users.includes(leader.id)}
                            onChange={() => toggleTeamLeader(leader.id)}
                          />
                          {leader.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-gray-100" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ระยะบังคับ GPS (เมตร)
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
                  <option value={50}>50 เมตร (เข้มงวด)</option>
                  <option value={100}>100 เมตร (มาตรฐาน)</option>
                  <option value={200}>200 เมตร (ยืดหยุ่น)</option>
                  <option value={0}>ไม่กำหนดระยะบังคับ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  การแนบรูปภาพ
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none"
                  value={formData.photo_mode}
                  onChange={(e) =>
                    setFormData({ ...formData, photo_mode: e.target.value })
                  }
                >
                  <option value="none">ไม่บังคับถ่ายรูป</option>
                  <option value="upload">เลือกรูปได้</option>
                  <option value="camera">บังคับเปิดกล้องถ่ายสด</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
              <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Power className="h-4 w-4" /> สถานะเปิดให้ลงเวลา
              </p>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors flex justify-center items-center gap-2"
            >
              <Save className="h-5 w-5" />{" "}
              {loading
                ? "กำลังบันทึก..."
                : editingId
                  ? "บันทึกการแก้ไข"
                  : "บันทึกหัวข้องาน"}
            </button>
          </form>
        </div>
      )}

      {/* ================= แท็บ 2: รายการหัวข้อ ================= */}
      {activeTab === "list" && (
        <div className="max-w-2xl w-full animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-gray-500 mb-3 pl-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>{" "}
              กำลังใช้งาน
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden divide-y divide-gray-100">
              {activeTopics.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  ไม่มีหัวข้อที่กำลังใช้งาน
                </div>
              ) : (
                activeTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors gap-4"
                  >
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {topic.title}
                      </h3>
                      <div className="text-xs text-gray-500 flex flex-wrap gap-2 mt-2">
                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                          {topic.team_type === "office" ? "ออฟฟิศ" : "ออกไซต์"}
                        </span>
                        {topic.team_type !== "office" && (
                          <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                            <Users className="w-3 h-3" />{" "}
                            {getLeaderNames(topic.allowed_users)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(topic)}
                        className="bg-white border border-gray-200 hover:border-blue-500 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-bold"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteClick(
                            topic.id,
                            topic.title,
                            topic.team_type === "office",
                          )
                        }
                        className="bg-white border border-gray-200 hover:border-red-500 text-red-500 px-3 py-1.5 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="opacity-60 grayscale">
            <h2 className="text-sm font-bold text-gray-500 mb-3 pl-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>{" "}
              ผ่านไปแล้ว / ปิดใช้งาน
            </h2>
            <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-200">
              {pastTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-gray-600 text-sm line-through">
                      {topic.title}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      หมดอายุ: {topic.end_date}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEditClick(topic)}
                    className="text-xs font-bold text-gray-500 hover:text-blue-500 underline"
                  >
                    ดูข้อมูล/นำกลับมาใช้
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
