"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Search,
  Star,
  Map,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ShieldCheck,
  Building2,
  Filter,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  UserMinus,
  Bot,
  FileText,
  Eye,
} from "lucide-react";

declare global {
  interface Window {
    google: any;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AttendanceAdminPage() {
  const [authStatus, setAuthStatus] = useState<
    "checking" | "allowed" | "denied"
  >("checking");
  const [activeTab, setActiveTab] = useState<"form" | "list" | "favorites">(
    "form",
  );
  const [loading, setLoading] = useState(false);

  const [activeTopics, setActiveTopics] = useState<any[]>([]);
  const [pastTopics, setPastTopics] = useState<any[]>([]);
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [allFavorites, setAllFavorites] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: null as string | null,
    type: "topic" as "topic" | "favorite",
    title: "",
    message: "",
  });

  const [formData, setFormData] = useState({
    title: "",
    location_name: "",
    shift_type: "morning",
    start_time: "09:00",
    end_time: "18:00",
    work_type: "onsite",
    team_type: "team_all",
    radius_meters: 1000,
    photo_mode: "none",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    is_active: true,
    maps_url: "",
    lat: "",
    lng: "",
    allowed_users: [] as string[],
    saveFavorite: false,
  });

  const [selectedFavId, setSelectedFavId] = useState<string>("");
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);

  // 🌟 ค่าวันที่ปัจจุบันสำหรับใช้ดักไม่ให้เลือกอดีต
  const todayStr = new Date().toISOString().split("T")[0];

  const teamLabels: { [key: string]: string } = {
    team_all: "ทั้งหมดทุกคน",
    team_n: "พี่นุ",
    team_a: "พี่หนุ่ม",
    team_b: "พี่หนึ่ง",
    team_c: "พี่บาส",
    team_d: "แคมป์",
    team_e: "หนึ่ง",
    team_f: "ทิ",
    team_g: "แม็ค",
    team_other: "อื่นๆ",
  };

  useEffect(() => {
    if (!window.google && GOOGLE_MAPS_API_KEY) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      document.body.appendChild(script);
      script.onload = () => setGoogleMapsLoaded(true);
    } else if (window.google) {
      setGoogleMapsLoaded(true);
    }
    checkUserRole();
    fetchTopics();
    fetchEmployees();
    fetchAllFavorites();
  }, []);

  useEffect(() => {
    if (activeTab === "favorites") fetchAllFavorites();
  }, [activeTab]);

  useEffect(() => {
    if (
      activeTab === "form" &&
      googleMapsLoaded &&
      autocompleteInputRef.current
    ) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        autocompleteInputRef.current,
        { fields: ["formatted_address", "geometry", "name"] },
      );
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry && place.geometry.location) {
          const newLat = place.geometry.location.lat();
          const newLng = place.geometry.location.lng();
          setFormData((prev) => ({
            ...prev,
            lat: newLat.toString(),
            lng: newLng.toString(),
            maps_url: `https://maps.google.com/?q=${newLat},${newLng}`,
            location_name: place.name || place.formatted_address || "",
          }));
          setSelectedFavId("");
          showToast("ดึงพิกัดจาก Google Maps สำเร็จ!", "success");
        }
      });
    }
  }, [activeTab, googleMapsLoaded, formData.work_type]);

  // 🌟 ระบบอัตโนมัติ: ดักเช็ควันที่ถ้าเป็นกะข้ามคืน
  useEffect(() => {
    if (formData.end_date === "2099-12-31") return; // ถ้าเป็นงานประจำ (ไม่มีกำหนด) ข้ามไปเลย
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);

    // ถ้ากะพิเศษ แล้วเวลาออก < เวลาเข้า (แปลว่าข้ามคืนชัวร์)
    if (
      formData.shift_type === "custom" &&
      formData.start_time &&
      formData.end_time &&
      formData.end_time < formData.start_time
    ) {
      const minEndDate = new Date(start);
      minEndDate.setDate(minEndDate.getDate() + 1); // บวกไป 1 วัน
      if (end < minEndDate) {
        setFormData((prev) => ({
          ...prev,
          end_date: minEndDate.toISOString().split("T")[0],
        }));
      }
    } else {
      // กะปกติ หรือไม่ได้ข้ามคืน วันสิ้นสุดห้ามน้อยกว่าวันเริ่มต้น
      if (end < start) {
        setFormData((prev) => ({ ...prev, end_date: formData.start_date }));
      }
    }
  }, [
    formData.start_date,
    formData.end_date,
    formData.start_time,
    formData.end_time,
    formData.shift_type,
  ]);

  const checkUserRole = async () => {
    setAuthStatus("allowed");
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("line_user_id, nickname")
        .order("nickname", { ascending: true });
      if (error) {
        setFetchError(`ดึงข้อมูลพนักงานไม่ได้: ${error.message}`);
        return;
      }
      if (data) {
        setEmployeeList(data);
        setFetchError(null);
      }
    } catch (error: any) {
      setFetchError("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    }
  };

  const fetchTopics = async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("attendance_topics")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const filteredData = data.filter((t) => t.team_type !== "office");
      setActiveTopics(
        filteredData.filter((t) => t.is_active && t.end_date >= todayStr),
      );
      setPastTopics(
        filteredData.filter((t) => !t.is_active || t.end_date < todayStr),
      );
    }
  };

  const fetchAllFavorites = async () => {
    const { data } = await supabase
      .from("saved_locations")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAllFavorites(data);
  };

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
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
      setSelectedFavId("");
      showToast("ดึงพิกัดสำเร็จ!", "success");
    }
  };

  const handleSelectFavorite = (favId: string) => {
    setSelectedFavId(favId);
    if (favId) {
      const fav = allFavorites.find((f) => f.id === favId);
      if (fav) {
        setFormData((prev) => ({
          ...prev,
          lat: fav.lat.toString(),
          lng: fav.lng.toString(),
          maps_url: `https://maps.google.com/?q=${fav.lat},${fav.lng}`,
        }));
        showToast("ดึงพิกัดจากสถานที่ประจำเรียบร้อย", "success");
      }
    }
  };

  const toggleUserAccess = (userId: string) => {
    setFormData((prev) => {
      const isSelected = prev.allowed_users.includes(userId);
      if (isSelected)
        return {
          ...prev,
          allowed_users: prev.allowed_users.filter((id) => id !== userId),
        };
      return { ...prev, allowed_users: [...prev.allowed_users, userId] };
    });
  };

  const handleEditClick = (topic: any) => {
    setEditingId(topic.id);
    setSelectedFavId("");
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
      maps_url: topic.maps_url || "",
      lat: topic.lat || "",
      lng: topic.lng || "",
      allowed_users: topic.allowed_users || [],
      saveFavorite: false,
    });
    setActiveTab("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (
    id: string,
    title: string,
    type: "topic" | "favorite",
    isOffice: boolean = false,
  ) => {
    if (isOffice)
      return showToast(
        "ไม่สามารถลบหัวข้อ Office ส่วนกลางได้ (ทำได้แค่ปิดสถานะ)",
        "error",
      );
    setConfirmModal({
      isOpen: true,
      id: id,
      type: type,
      title: type === "topic" ? "ยืนยันการลบหัวข้องาน" : "ยืนยันลบสถานที่ประจำ",
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบ "${title}" ?`,
    });
  };

  const confirmDelete = async () => {
    if (!confirmModal.id) return;
    try {
      if (confirmModal.type === "topic") {
        const { error } = await supabase
          .from("attendance_topics")
          .delete()
          .eq("id", confirmModal.id);
        if (error) throw error;
        showToast("ลบหัวข้อเรียบร้อยแล้ว", "success");
        fetchTopics();
      } else {
        const { error } = await supabase
          .from("saved_locations")
          .delete()
          .eq("id", confirmModal.id);
        if (error) throw error;
        showToast("ลบสถานที่ประจำเรียบร้อยแล้ว", "success");
        fetchAllFavorites();
      }
    } catch (error: any) {
      showToast("ลบไม่สำเร็จ: " + error.message, "error");
    } finally {
      setConfirmModal({
        isOpen: false,
        id: null,
        type: "topic",
        title: "",
        message: "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.saveFavorite && formData.lat && formData.lng && !editingId) {
        const favTitleToSave = formData.location_name || formData.title;
        const { data: existingFav } = await supabase
          .from("saved_locations")
          .select("id")
          .eq("title", favTitleToSave);
        if (existingFav && existingFav.length > 0) {
          showToast(
            "มีสถานที่ชื่อนี้ในระบบแล้ว ระบบจะไม่บันทึกซ้ำครับ",
            "error",
          );
        } else {
          await supabase.from("saved_locations").insert([
            {
              user_id: "admin_system",
              title: favTitleToSave,
              lat: parseFloat(formData.lat),
              lng: parseFloat(formData.lng),
            },
          ]);
          fetchAllFavorites();
        }
      }

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
        maps_url: formData.maps_url,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        allowed_users:
          formData.work_type === "office" ? [] : formData.allowed_users,
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
      setSelectedFavId("");
      setActiveTab("list");
      fetchTopics();
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const isPermanent = formData.end_date === "2099-12-31";

  const getEmployeeNames = (ids: string[]) => {
    if (!ids || ids.length === 0) return "เข้าร่วมทุกคน";
    const names = ids.map((id) => {
      const emp = employeeList.find((e) => e.line_user_id === id);
      return emp ? emp.nickname : id;
    });
    return names.join(", ");
  };

  const getUserNameForFav = (userId: string) => {
    if (!userId) return "พนักงาน (ไม่ระบุ)";
    if (userId === "admin_system") return "ส่วนกลาง (แอดมิน)";
    const emp = employeeList?.find((e) => e.line_user_id === userId);
    return emp ? emp.nickname : "พนักงาน (ไม่ระบุ)";
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
        <div className="flex space-x-1.5 bg-gray-200/50 p-1.5 rounded-2xl overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex-1 min-w-[120px] flex justify-center items-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === "form" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <PlusCircle className="w-4 h-4 shrink-0" />{" "}
            {editingId ? "แก้ไขหัวข้อ" : "สร้างหัวข้อใหม่"}
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 min-w-[120px] flex justify-center items-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === "list" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <List className="w-4 h-4 shrink-0" /> รายการหัวข้อ
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
              {/* <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <label className="flex items-center gap-2 text-sm font-bold text-blue-900 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    checked={isPermanent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        end_date: e.target.checked
                          ? "2099-12-31"
                          : formData.start_date,
                      })
                    }
                  />
                  <Infinity className="h-4 w-4 text-blue-600" /> หัวข้องานประจำ
                  (ไม่มีวันหมดอายุ)
                </label>
              </div> */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    เริ่มวันที่
                  </label>
                  <input
                    type="date"
                    required
                    min={editingId ? undefined : todayStr}
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
                      min={editingId ? undefined : formData.start_date}
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
                      <Users className="h-4 w-4" />{" "}
                      หัวหน้าทีมที่รับผิดชอบไซต์นี้
                    </label>
                    <select
                      className="w-full border border-blue-200 rounded-lg p-3 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500"
                      value={formData.team_type}
                      onChange={(e) =>
                        setFormData({ ...formData, team_type: e.target.value })
                      }
                    >
                      <option value="team_all">ทั้งหมดทุกคน</option>
                      <option value="team_n">พี่นุ</option>
                      <option value="team_a">พี่หนุ่ม</option>
                      <option value="team_b">พี่หนึ่ง</option>
                      <option value="team_c">พี่บาส</option>
                      <option value="team_d">แคมป์</option>
                      <option value="team_e">หนึ่ง</option>
                      <option value="team_f">ทิ</option>
                      <option value="team_g">แม็ค</option>
                      <option value="team_other">อื่นๆ</option>
                    </select>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4">
                      <MapPinHouse className="h-5 w-5 text-indigo-500" />{" "}
                      ค้นหา/ตั้งค่าพิกัดสถานที่ (3 รูปแบบ)
                    </label>

                    <div className="mb-4">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">
                        1. เลือกจากสถานที่ประจำ (Favorites)
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg p-3 text-xs text-gray-700 outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                        value={selectedFavId}
                        onChange={(e) => handleSelectFavorite(e.target.value)}
                      >
                        <option value="">-- ไม่เลือก (สร้างใหม่) --</option>
                        {allFavorites.map((fav) => (
                          <option key={fav.id} value={fav.id}>
                            {fav.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 mb-4 px-1">
                      <div className="flex-1 border-b border-gray-300"></div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">
                        หรือ
                      </span>
                      <div className="flex-1 border-b border-gray-300"></div>
                    </div>

                    <div className="relative mb-4">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">
                        2. ค้นหาด้วย Google Maps (Autocomplete)
                      </label>
                      <Map className="absolute left-3 top-[32px] w-5 h-5 text-blue-500" />
                      <input
                        type="text"
                        ref={autocompleteInputRef}
                        placeholder="พิมพ์ค้นหาสถานที่..."
                        className="w-full border border-gray-300 rounded-lg p-3 pl-10 text-sm font-bold outline-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                        onChange={() => setSelectedFavId("")}
                      />
                    </div>

                    <div className="flex items-center gap-2 mb-4 px-1">
                      <div className="flex-1 border-b border-gray-300"></div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">
                        หรือ
                      </span>
                      <div className="flex-1 border-b border-gray-300"></div>
                    </div>

                    <div className="mb-4">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">
                        3. วางพิกัด หรือลิงก์ Maps เอง (Manual)
                      </label>
                      <input
                        type="text"
                        placeholder="วางลิงก์ Maps แบบยาว หรือ พิกัด (เช่น 13.123, 100.456)"
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none bg-white mb-2"
                        value={formData.maps_url}
                        onChange={(e) => {
                          handleMapsUrlParse(e.target.value);
                          setSelectedFavId("");
                        }}
                      />
                    </div>

                    <div className="flex gap-4 mt-2">
                      <input
                        type="text"
                        placeholder="Lat (ละติจูด)"
                        className="w-1/2 border border-gray-300 rounded-lg p-2 text-xs bg-gray-100 text-gray-600 font-mono"
                        value={formData.lat}
                        readOnly
                      />
                      <input
                        type="text"
                        placeholder="Lng (ลองจิจูด)"
                        className="w-1/2 border border-gray-300 rounded-lg p-2 text-xs bg-gray-100 text-gray-600 font-mono"
                        value={formData.lng}
                        readOnly
                      />
                    </div>

                    {!selectedFavId && !editingId && (
                      <label className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 p-3 rounded-xl border border-orange-100 cursor-pointer mt-4 transition-all hover:bg-orange-100">
                        <input
                          type="checkbox"
                          checked={formData.saveFavorite}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              saveFavorite: e.target.checked,
                            })
                          }
                          className="w-4 h-4 accent-orange-600"
                        />
                        <Star className="w-4 h-4" /> บันทึกพิกัดนี้เข้า
                        "สถานที่ประจำ" ไว้ใช้ครั้งต่อไป
                      </label>
                    )}
                  </div>

                  <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                    <label className="flex items-center gap-2 text-sm font-semibold text-orange-900 mb-3">
                      <Users className="h-4 w-4" /> พนักงานที่เข้าร่วมไซต์นี้
                      (เว้นว่าง = เข้าร่วมทุกคน)
                    </label>
                    {fetchError && (
                      <div className="mb-3 p-3 bg-red-100 text-red-700 text-xs rounded-lg border border-red-200">
                        <strong>⚠️ แจ้งเตือน:</strong> {fetchError}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {employeeList.map((emp) => (
                        <label
                          key={emp.line_user_id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer text-xs font-bold transition-colors ${formData.allowed_users.includes(emp.line_user_id) ? "bg-orange-500 text-white border-orange-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={formData.allowed_users.includes(
                              emp.line_user_id,
                            )}
                            onChange={() => toggleUserAccess(emp.line_user_id)}
                          />
                          {emp.nickname}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-gray-100" />

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                <Clock className="h-4 w-4" /> ระบุกะเวลาทำงาน
              </label>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <label
                  className={`border p-3 rounded-xl cursor-pointer text-center transition-all ${formData.shift_type === "morning" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 hover:bg-gray-50"}`}
                >
                  <input
                    type="radio"
                    name="shift_type"
                    className="hidden"
                    checked={formData.shift_type === "morning"}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        shift_type: "morning",
                        start_time: "09:00",
                        end_time: "18:00",
                      })
                    }
                  />
                  <span className="block text-sm font-bold text-gray-900 mb-1">
                    กะเช้า
                  </span>
                  <span className="block text-[10px] text-gray-500">
                    09:00 - 18:00
                  </span>
                </label>
                <label
                  className={`border p-3 rounded-xl cursor-pointer text-center transition-all ${formData.shift_type === "afternoon" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 hover:bg-gray-50"}`}
                >
                  <input
                    type="radio"
                    name="shift_type"
                    className="hidden"
                    checked={formData.shift_type === "afternoon"}
                    onChange={() =>
                      setFormData({
                        ...formData,
                        shift_type: "afternoon",
                        start_time: "13:00",
                        end_time: "22:00",
                      })
                    }
                  />
                  <span className="block text-sm font-bold text-gray-900 mb-1">
                    กะบ่าย
                  </span>
                  <span className="block text-[10px] text-gray-500">
                    13:00 - 22:00
                  </span>
                </label>
                <label
                  className={`border p-3 rounded-xl cursor-pointer text-center transition-all ${formData.shift_type === "custom" ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 hover:bg-gray-50"}`}
                >
                  <input
                    type="radio"
                    name="shift_type"
                    className="hidden"
                    checked={formData.shift_type === "custom"}
                    onChange={() =>
                      setFormData({ ...formData, shift_type: "custom" })
                    }
                  />
                  <span className="block text-sm font-bold text-gray-900 mb-1">
                    ระบุเอง
                  </span>
                  <span className="block text-[10px] text-gray-500">
                    กำหนดอิสระ
                  </span>
                </label>
              </div>

              {formData.shift_type === "custom" && (
                <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                      เวลาเข้างาน
                    </label>
                    <div className="relative">
                      <Clock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        className="w-full p-3 pl-10 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                        className="w-full p-3 pl-10 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={formData.end_time}
                        onChange={(e) =>
                          setFormData({ ...formData, end_time: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-gray-100" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <label className="flex justify-between items-center text-sm font-semibold text-gray-700 mb-3">
                  <span className="flex items-center gap-2">
                    <Radar className="w-4 h-4 text-blue-600" /> ระยะบังคับ GPS
                  </span>
                  <span className="text-blue-700 font-bold bg-white px-3 py-1 rounded-md shadow-sm text-xs border border-blue-100">
                    {formData.radius_meters === 0
                      ? "❌ ปิดใช้งาน"
                      : `${formData.radius_meters} ม.`}
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="50"
                  className="w-full accent-blue-600"
                  value={formData.radius_meters}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      radius_meters: parseInt(e.target.value),
                    })
                  }
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-2">
                  <span>ปิดใช้งาน (0)</span>
                  <span>ยืดหยุ่น (1000)</span>
                </div>
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <label className="flex items-center gap-2 text-sm font-semibold text-emerald-900 mb-3">
                  <Camera className="w-4 h-4 text-emerald-600" /> การยืนยันตัวตน
                  (รูปถ่าย)
                </label>
                <select
                  className="w-full border border-emerald-200 rounded-lg p-3 text-sm outline-none bg-white focus:ring-2 focus:ring-emerald-500 appearance-none font-bold text-gray-700 cursor-pointer"
                  value={formData.photo_mode}
                  onChange={(e) =>
                    setFormData({ ...formData, photo_mode: e.target.value })
                  }
                >
                  <option value="none">ไม่ต้องแนบรูป</option>
                  <option value="camera">บังคับถ่ายจากกล้องสดเท่านั้น</option>
                  <option value="upload">
                    เลือกจากอัลบั้ม หรือ ถ่ายสดก็ได้
                  </option>
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
                    className="p-4 flex flex-row items-center justify-between hover:bg-gray-50 transition-colors gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-base truncate">
                        {topic.title}
                      </h3>
                      <div className="text-xs text-gray-500 flex flex-col gap-y-1.5 mt-2">
                        <div className="flex items-center">
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold text-[10px]">
                            หัวหน้า:{" "}
                            {teamLabels[topic.team_type] || topic.team_type}
                          </span>
                        </div>
                        {topic.team_type !== "office" && (
                          <p className="text-[10px] text-gray-500 font-medium truncate">
                            👥 ผู้เข้าร่วม:{" "}
                            <span className="text-orange-600 font-bold">
                              {getEmployeeNames(topic.allowed_users)}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-row items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleEditClick(topic)}
                        className="bg-white border border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-600 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteClick(
                            topic.id,
                            topic.title,
                            "topic",
                            topic.team_type === "office",
                          )
                        }
                        className="bg-white border border-red-100 hover:bg-red-50 hover:border-red-500 text-red-500 p-2 rounded-lg transition-colors"
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
