"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Edit,
  Users,
  Bot,
  ToggleLeft,
  ToggleRight,
  Filter,
  ShieldAlert,
  UserMinus,
  Map,
  Search,
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
  const [dbUser, setDbUser] = useState<any>(null);

  const [activeView, setActiveView] = useState<
    "menu" | "office_form" | "holiday_form" | "roles_form" | "cron_form"
  >("menu");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // === State: Office ===
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

  // 🌟 State & Refs สำหรับ Google Maps
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);

  // === State: Holidays ===
  const [holidays, setHolidays] = useState<any[]>([]);
  const [announcementUrl, setAnnouncementUrl] = useState("");
  const currentYearNum = new Date().getFullYear() + 543;
  const [holidayYear, setHolidayYear] = useState<string>(
    currentYearNum.toString(),
  );
  const yearOptions = [
    (currentYearNum - 1).toString(),
    currentYearNum.toString(),
    (currentYearNum + 1).toString(),
  ];
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [editHolidayData, setEditHolidayData] = useState({
    date: "",
    title: "",
    is_changed: false,
    changed_date: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: "", title: "" });

  // === State: Roles & Users ===
  const [usersList, setUsersList] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<any>(null);

  const [confirmHolidayModal, setConfirmHolidayModal] = useState({
    show: false,
    action: "",
    id: "",
    title: "",
    message: "",
  });

  const [confirmRoleModal, setConfirmRoleModal] = useState({
    show: false,
    user: null as any,
    newRole: "",
  });
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({
    show: false,
    user: null as any,
  });

  // === State: Cron Job ===
  const [cronTime, setCronTime] = useState("07:00");
  const [cronTargetRoles, setCronTargetRoles] = useState<string[]>([
    "manager",
    "admin",
  ]);
  const [cronTargetUsers, setCronTargetUsers] = useState<string[]>([]);

  // โหลด Google Maps Script
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
  }, []);

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({
          liffId: process.env.NEXT_PUBLIC_LIFF_ID || "2010143328-wyg8T4P5",
        });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setUserProfile(profile);
          const { data } = await supabase
            .from("users")
            .select("*")
            .eq("line_user_id", profile.userId)
            .single();
          setDbUser(data || { role: "user", full_name: profile.displayName });
        } else liff.login();
      } catch (error) {
        setUserProfile({ userId: "U_LOCAL", displayName: "Admin Mode" });
        setDbUser({ role: "admin", full_name: "Local Admin" });
      } finally {
        setIsLiffInit(true);
      }
    };
    initLiff();
  }, []);

  useEffect(() => {
    if (isLiffInit && dbUser) {
      if (activeView === "office_form") fetchOfficeSettings();
      if (activeView === "holiday_form") {
        fetchHolidays();
        fetchAnnouncementUrl();
      }
      if (activeView === "roles_form") fetchUsers();
      if (activeView === "cron_form") {
        fetchCronSettings();
        fetchUsers();
      }
    }
  }, [isLiffInit, activeView, holidayYear, dbUser]);

  // ตั้งค่า Google Places Autocomplete สำหรับหน้า Office Form
  useEffect(() => {
    if (
      activeView === "office_form" &&
      googleMapsLoaded &&
      autocompleteInputRef.current
    ) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        autocompleteInputRef.current,
        {
          fields: ["formatted_address", "geometry", "name"],
        },
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
          }));
          showToast("ดึงพิกัดจาก Google Maps สำเร็จ!", "success");
        }
      });
    }
  }, [activeView, googleMapsLoaded]);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  const isAdminOrManager =
    dbUser?.role === "admin" || dbUser?.role === "manager";
  const isHR = dbUser?.role === "hr";
  const canManageHolidays = isAdminOrManager || isHR;

  // ==========================================
  // ฟังก์ชัน Roles & Users
  // ==========================================
  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    setUsersList(data || []);
    setLoading(false);
  };

  const triggerRoleChange = (user: any, newRole: string) => {
    if (user.role === newRole) return;
    setConfirmRoleModal({ show: true, user, newRole });
  };

  const executeRoleUpdate = async () => {
    const { user, newRole } = confirmRoleModal;
    if (!user) return;
    try {
      const { error } = await supabase
        .from("users")
        .update({ role: newRole })
        .eq("line_user_id", user.line_user_id);
      if (error) throw error;
      showToast("อัปเดตสิทธิ์สำเร็จ", "success");
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setConfirmRoleModal({ show: false, user: null, newRole: "" });
    }
  };

  const handleToggleActive = async (
    lineUserId: string,
    currentStatus: boolean,
  ) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_active: !currentStatus })
        .eq("line_user_id", lineUserId);
      if (error) throw error;
      showToast(
        currentStatus ? "ระงับการใช้งานสำเร็จ" : "เปิดการใช้งานสำเร็จ",
        "success",
      );
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const triggerDeleteUser = (user: any) => {
    setConfirmDeleteModal({ show: true, user });
  };

  const executeDeleteUser = async () => {
    const { user } = confirmDeleteModal;
    if (!user) return;
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("line_user_id", user.line_user_id);
      if (error) throw error;
      showToast("ลบผู้ใช้งานสำเร็จ", "success");
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setConfirmDeleteModal({ show: false, user: null });
    }
  };

  const saveUserEdit = async () => {
    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: editingUser.full_name,
          nickname: editingUser.nickname,
          department: editingUser.department,
          gmail: editingUser.gmail,
        })
        .eq("line_user_id", editingUser.line_user_id);
      if (error) throw error;
      showToast("อัปเดตข้อมูลพนักงานสำเร็จ", "success");
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // ==========================================
  // ฟังก์ชัน Cron Job
  // ==========================================
  const fetchCronSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("company_settings")
      .select("*")
      .in("setting_key", ["cron_bot_time", "cron_bot_target"]);
    if (data) {
      const timeObj = data.find((d) => d.setting_key === "cron_bot_time");
      const targetObj = data.find((d) => d.setting_key === "cron_bot_target");
      if (timeObj) setCronTime(timeObj.setting_value);
      if (targetObj) {
        try {
          const parsed = JSON.parse(targetObj.setting_value);
          if (Array.isArray(parsed)) {
            setCronTargetRoles(parsed);
            setCronTargetUsers([]);
          } else {
            setCronTargetRoles(parsed.roles || []);
            setCronTargetUsers(parsed.users || []);
          }
        } catch (e) {
          setCronTargetRoles(["manager", "admin"]);
          setCronTargetUsers([]);
        }
      }
    }
    setLoading(false);
  };

  const handleSaveCronSettings = async () => {
    setSaving(true);
    try {
      const targetData = { roles: cronTargetRoles, users: cronTargetUsers };
      const upsertData = [
        { setting_key: "cron_bot_time", setting_value: cronTime },
        {
          setting_key: "cron_bot_target",
          setting_value: JSON.stringify(targetData),
        },
      ];
      const { error } = await supabase
        .from("company_settings")
        .upsert(upsertData, { onConflict: "setting_key" });
      if (error) throw error;
      showToast("บันทึกการตั้งค่าบอทสำเร็จ", "success");
      setTimeout(() => setActiveView("menu"), 1500);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ฟังก์ชัน Office
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
      showToast("บันทึกข้อมูลเรียบร้อย!", "success");
      setTimeout(() => setActiveView("menu"), 1500);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ฟังก์ชัน Holidays
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

  const triggerLoadTemplate = () => {
    if (holidays.length > 0) {
      setConfirmHolidayModal({
        show: true,
        action: "load_template",
        id: "",
        title: "ยืนยันการโหลดแม่แบบ",
        message:
          "มีวันหยุดในระบบแล้ว คุณต้องการโหลดแม่แบบทับเพิ่มเข้าไปใช่หรือไม่?",
      });
    } else {
      executeLoadTemplate();
    }
  };

  const triggerDeleteHoliday = (id: string) => {
    setConfirmHolidayModal({
      show: true,
      action: "delete",
      id,
      title: "ยืนยันลบวันหยุด",
      message: "คุณต้องการลบรายการวันหยุดนี้ออกจากระบบใช่หรือไม่?",
    });
  };

  const executeHolidayAction = async () => {
    const { action, id } = confirmHolidayModal;
    setConfirmHolidayModal({ ...confirmHolidayModal, show: false });

    if (action === "load_template") {
      executeLoadTemplate();
    } else if (action === "delete") {
      const { error } = await supabase
        .from("company_holidays")
        .delete()
        .eq("id", id);
      if (error) showToast(error.message, "error");
      else fetchHolidays();
    }
  };

  const executeLoadTemplate = async () => {
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
      showToast("โหลดแม่แบบสำเร็จ!", "success");
      fetchHolidays();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHoliday.date || !newHoliday.title)
      return showToast("กรุณากรอกวันที่และชื่อ", "error");
    setSaving(true);
    try {
      const { error } = await supabase
        .from("company_holidays")
        .insert([
          { year: holidayYear, date: newHoliday.date, title: newHoliday.title },
        ]);
      if (error) throw error;
      showToast("เพิ่มวันหยุดเรียบร้อย", "success");
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
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage
      .from("holidays")
      .upload(fileName, file);
    if (error) throw error;
    return supabase.storage.from("holidays").getPublicUrl(fileName).data
      .publicUrl;
  };

  const handleUploadAnnouncement = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const publicUrl = await uploadImageToStorage(e.target.files[0]);
      const upsertData = [
        { setting_key: "holiday_announcement_url", setting_value: publicUrl },
      ];
      const { error } = await supabase
        .from("company_settings")
        .upsert(upsertData, { onConflict: "setting_key" });
      if (error) throw error;
      setAnnouncementUrl(publicUrl);
      showToast("อัปโหลดสำเร็จ", "success");
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
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const publicUrl = await uploadImageToStorage(e.target.files[0]);
      const { error } = await supabase
        .from("company_holidays")
        .update({ change_document_url: publicUrl })
        .eq("id", holidayId);
      if (error) throw error;
      showToast("แนบเอกสารสำเร็จ", "success");
      fetchHolidays();
    } catch (err: any) {
      showToast("อัปโหลดพลาด", "error");
    } finally {
      setUploading(false);
    }
  };

  const saveEditHoliday = async (id: string) => {
    if (!editHolidayData.date || !editHolidayData.title)
      return showToast("กรุณากรอกข้อมูลให้ครบ", "error");
    try {
      const { error } = await supabase
        .from("company_holidays")
        .update({
          date: editHolidayData.date,
          title: editHolidayData.title,
          is_changed: editHolidayData.is_changed,
          changed_date: editHolidayData.is_changed
            ? editHolidayData.changed_date
            : null,
        })
        .eq("id", id);
      if (error) throw error;
      showToast("บันทึกสำเร็จ", "success");
      setEditingHolidayId(null);
      fetchHolidays();
    } catch (err: any) {
      showToast(err.message, "error");
    }
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

  if (!isLiffInit || (loading && activeView === "menu")) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdminOrManager && !isHR) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <ShieldCheck className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700">
          ไม่มีสิทธิ์เข้าถึงหน้านี้
        </h2>
        <p className="text-sm text-gray-500 mt-2 text-center">
          หน้านี้สงวนไว้สำหรับผู้ดูแลระบบเท่านั้นครับ
        </p>
      </div>
    );
  }

  const filteredUsersList =
    roleFilter === "all"
      ? usersList
      : usersList.filter((u) => u.role === roleFilter);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-10">
      {/* 🌟 Toast Notification */}
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

      {/* 🌟 Modal ยืนยันการเปลี่ยน Role */}
      {confirmRoleModal.show && confirmRoleModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-gray-900 text-center mb-2">
              ยืนยันการเปลี่ยนสิทธิ์?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              คุณต้องการเปลี่ยนสิทธิ์ของ{" "}
              <span className="font-bold text-gray-800">
                {confirmRoleModal.user.full_name || "พนักงาน"}
              </span>{" "}
              เป็น{" "}
              <span className="font-bold text-purple-600 uppercase">
                {confirmRoleModal.newRole}
              </span>{" "}
              ใช่หรือไม่?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setConfirmRoleModal({ show: false, user: null, newRole: "" })
                }
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={executeRoleUpdate}
                className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl text-sm shadow-sm hover:bg-purple-700 transition-colors"
              >
                ยืนยันการเปลี่ยน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Modal ยืนยันการลบผู้ใช้งาน */}
      {confirmDeleteModal.show && confirmDeleteModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserMinus className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-gray-900 text-center mb-2">
              ยืนยันการลบผู้ใช้งาน?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              คุณต้องการลบ{" "}
              <span className="font-bold text-red-600">
                {confirmDeleteModal.user.full_name || "พนักงาน"}
              </span>{" "}
              ออกจากระบบถาวรใช่หรือไม่?
              <br />
              <span className="text-xs text-red-400">
                การลบนี้จะลบข้อมูลที่เกี่ยวข้องทั้งหมด
              </span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setConfirmDeleteModal({ show: false, user: null })
                }
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={executeDeleteUser}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl text-sm shadow-sm hover:bg-red-700 transition-colors"
              >
                ลบถาวร
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Modal แก้ไขข้อมูลผู้ใช้งาน */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <Edit className="w-5 h-5 text-purple-600" /> แก้ไขข้อมูลพนักงาน
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  ชื่อ-สกุล (จริง)
                </label>
                <input
                  type="text"
                  value={editingUser.full_name || ""}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      full_name: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  ชื่อเล่น
                </label>
                <input
                  type="text"
                  value={editingUser.nickname || ""}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, nickname: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  แผนก/ตำแหน่ง
                </label>
                <input
                  type="text"
                  value={editingUser.department || ""}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      department: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  อีเมล (Gmail)
                </label>
                <input
                  type="email"
                  value={editingUser.gmail || ""}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, gmail: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveUserEdit}
                className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl text-sm shadow-sm hover:bg-purple-700 transition-colors"
              >
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Modal: ยืนยันจัดการวันหยุด */}
      {confirmHolidayModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95 text-center">
            {confirmHolidayModal.action === "delete" ? (
              <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-3" />
            ) : (
              <FileText className="w-12 h-12 text-orange-500 mx-auto mb-3" />
            )}
            <h3 className="text-lg font-black text-gray-900 mb-2">
              {confirmHolidayModal.title}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {confirmHolidayModal.message}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setConfirmHolidayModal({
                    show: false,
                    action: "",
                    id: "",
                    title: "",
                    message: "",
                  })
                }
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-sm hover:bg-gray-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={executeHolidayAction}
                className={`flex-1 text-white font-bold py-3 rounded-xl text-sm shadow-sm ${confirmHolidayModal.action === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}`}
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h1 className="font-bold text-lg">System Settings</h1>
          </div>
          <div className="flex items-center gap-2 bg-white/10 py-1.5 px-3 rounded-full backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold truncate max-w-[100px] uppercase">
              {dbUser?.role} MODE
            </span>
          </div>
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
            {isAdminOrManager && (
              <button
                onClick={() => setActiveView("office_form")}
                className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all flex items-center gap-4 text-left group"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                  <Building2 className="w-7 h-7 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base mb-1">
                    สถานที่ประจำ (Office)
                  </h3>
                  <p className="text-xs text-gray-500">
                    พิกัด GPS, รัศมี และเวลาทำงาน
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            )}
            {canManageHolidays && (
              <button
                onClick={() => setActiveView("holiday_form")}
                className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200 hover:border-orange-500 hover:shadow-md transition-all flex items-center gap-4 text-left group"
              >
                <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors">
                  <CalendarDays className="w-7 h-7 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base mb-1">
                    วันหยุดประจำปี
                  </h3>
                  <p className="text-xs text-gray-500">
                    จัดการปฏิทินวันหยุดบริษัท
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            )}
            {isAdminOrManager && (
              <button
                onClick={() => setActiveView("roles_form")}
                className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200 hover:border-purple-500 hover:shadow-md transition-all flex items-center gap-4 text-left group"
              >
                <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                  <Users className="w-7 h-7 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base mb-1">
                    สิทธิ์ผู้ใช้งาน (Roles)
                  </h3>
                  <p className="text-xs text-gray-500">
                    จัดการสิทธิ์, เปิด/ปิด และลบผู้ใช้
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-purple-50 transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            )}
            {isAdminOrManager && (
              <button
                onClick={() => setActiveView("cron_form")}
                className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all flex items-center gap-4 text-left group"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                  <Bot className="w-7 h-7 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base mb-1">
                    ตั้งค่าบอทปฏิทิน (Cron)
                  </h3>
                  <p className="text-xs text-gray-500">
                    กำหนดเวลาและผู้รับสรุปคิวงาน
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            )}
            {isAdminOrManager && (
              <button
                // 🌟 เปลี่ยนจาก setActiveView เป็นการลิงก์ข้ามหน้า พร้อมแนบ ?menu=admins
                onClick={() =>
                  (window.location.href = "/admin-stplus?menu=admins")
                }
                className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200 hover:border-rose-500 hover:shadow-md transition-all flex items-center gap-4 text-left group"
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0 group-hover:bg-rose-100 transition-colors">
                  <Users className="w-7 h-7 text-rose-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base mb-1">
                    สิทธิ์ผู้ใช้งาน (ระบบหลังบ้าน)
                  </h3>
                  <p className="text-xs text-gray-500">
                    จัดการสิทธิ์, เปิด/ปิด เพิ่มและลบผู้ใช้งานในระบบหลังบ้าน
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-rose-50 transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 🌟 View 2: Office Form */}
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
              <div className="p-6 border-b border-gray-100 space-y-5 bg-white">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                    ชื่อสถานที่ (แสดงในแอป)
                  </label>
                  <input
                    type="text"
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      เวลาเข้างาน
                    </label>
                    <div className="relative">
                      <Clock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        className="w-full p-3.5 pl-11 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                      เวลาออกงาน
                    </label>
                    <div className="relative">
                      <Clock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        className="w-full p-3.5 pl-11 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={formData.end_time}
                        onChange={(e) =>
                          setFormData({ ...formData, end_time: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-b border-gray-100 bg-slate-50 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <MapPinHouse className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-gray-900">
                    การตั้งค่า GPS & รัศมี
                  </h3>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                    <LinkIcon className="h-4 w-4" /> พิกัดออฟฟิศ
                  </label>

                  {/* 🌟 เพิ่มระบบค้นหาด้วย Google Maps */}
                  <div className="relative mb-3">
                    <Map className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                    <input
                      type="text"
                      ref={autocompleteInputRef}
                      placeholder="🔍 ค้นหาที่ตั้งออฟฟิศด้วย Google Maps..."
                      className="w-full border border-blue-300 rounded-lg p-3 pl-10 text-sm font-bold outline-none bg-white focus:ring-2 focus:ring-blue-500 shadow-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="flex-1 border-b border-gray-300"></div>
                    <span className="text-xs text-gray-500 font-bold">
                      หรือวางลิงก์เอง
                    </span>
                    <div className="flex-1 border-b border-gray-300"></div>
                  </div>

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
                        2. <b>แตะค้าง</b> (Long Press)
                        ตรงจุดที่ต้องการให้ขึ้นหมุดสีแดง (Dropped Pin)
                      </p>
                      <p>
                        3. เลื่อนดูรายละเอียดด้านล่าง จะเห็นตัวเลขพิกัด (เช่น{" "}
                        <code className="bg-white px-1.5 py-0.5 rounded text-blue-600 border border-blue-200 shadow-sm font-mono">
                          13.7563, 100.5018
                        </code>
                        ) ให้กดค้างเพื่อก๊อปปี้ตัวเลขมาวางได้เลย
                      </p>
                      <p>
                        4. *** ห้ามใส่วงเล็บในกรณีก็อบเฉพาะตัวเลขมา
                        ให้เอาวงเล็บออก <b>13.7563, 100.5018</b>
                      </p>
                    </div>
                  </details>
                  <input
                    type="text"
                    placeholder="วางลิงก์ Maps หรือ วางพิกัด"
                    className="w-full border border-gray-200 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50 mb-4"
                    value={formData.maps_url}
                    onChange={(e) => handleMapsUrlParse(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase">
                        ละติจูด (Lat)
                      </label>
                      <input
                        type="text"
                        className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-lg font-mono text-xs text-gray-500 cursor-not-allowed"
                        value={formData.lat}
                        readOnly
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase">
                        ลองจิจูด (Lng)
                      </label>
                      <input
                        type="text"
                        className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-lg font-mono text-xs text-gray-500 cursor-not-allowed"
                        value={formData.lng}
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider flex justify-between">
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
                  <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-2">
                    <span>เข้มงวด (50m)</span>
                    <span>ยืดหยุ่น (1000m)</span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-b border-gray-100 space-y-4 bg-white">
                <div className="flex items-center gap-2 mb-1">
                  <Camera className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-gray-900">การยืนยันตัวตน</h3>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                    โหมดรูปถ่าย
                  </label>
                  <select
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none"
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

              <div className="p-6 bg-gray-50">
                <button
                  onClick={handleSaveOffice}
                  disabled={saving}
                  className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl flex justify-center items-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50"
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

      {/* 🌟 View 3: Holiday Form */}
      {activeView === "holiday_form" && (
        <div className="p-4 md:p-6 max-w-lg w-full mx-auto animate-in fade-in slide-in-from-right-4 space-y-5">
          <button
            onClick={() => setActiveView("menu")}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-full border shadow-sm w-fit"
          >
            <ChevronLeft className="w-4 h-4" /> กลับเมนูหลัก
          </button>
          <div className="flex gap-2 overflow-x-auto pb-1 pt-1 custom-scrollbar">
            {yearOptions.map((y) => (
              <button
                key={y}
                onClick={() => setHolidayYear(y)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all shrink-0 ${holidayYear === y ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm" : "border-gray-100 bg-white text-gray-500"}`}
              >
                วันหยุดปี {y}
              </button>
            ))}
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-600" /> ประกาศวันหยุดรวม
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
              {uploading ? "กำลังอัปโหลด..." : "อัปโหลดรูปประกาศใหม่"}
              <input
                type="file"
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
                    onClick={triggerLoadTemplate}
                    className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                  >
                    โหลดแม่แบบ
                  </button>
                )}
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <PlusCircle className="w-3 h-3" /> เพิ่ม
                </button>
              </div>
            </div>
            <div className="p-0 bg-white">
              {showAddForm && (
                <div className="bg-blue-50/50 p-4 m-4 rounded-xl border border-blue-100">
                  <input
                    type="date"
                    value={newHoliday.date}
                    onChange={(e) =>
                      setNewHoliday({ ...newHoliday, date: e.target.value })
                    }
                    className="w-full p-2.5 border rounded-lg text-sm mb-3 outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={newHoliday.title}
                    onChange={(e) =>
                      setNewHoliday({ ...newHoliday, title: e.target.value })
                    }
                    placeholder="ชื่อวันหยุด"
                    className="w-full p-2.5 border rounded-lg text-sm mb-3 outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-xs font-bold bg-white border rounded-lg"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleAddHoliday}
                      className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg"
                    >
                      บันทึก
                    </button>
                  </div>
                </div>
              )}
              <div className="divide-y divide-gray-100">
                {holidays.map((h) => (
                  <div key={h.id} className="p-4">
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
                            <div className="mt-3 bg-red-50 p-3 rounded-xl border border-red-100/50">
                              <p className="text-[12px] text-red-600 font-bold mb-2">
                                ย้ายไปหยุดวันที่:{" "}
                                {formatThaiDate(h.changed_date)}
                              </p>
                              {h.change_document_url ? (
                                <a
                                  href={h.change_document_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] bg-white text-red-600 px-3 py-1.5 rounded-lg border font-bold"
                                >
                                  ดูเอกสาร
                                </a>
                              ) : (
                                <label className="text-[11px] bg-white text-gray-600 px-3 py-1.5 rounded-lg border cursor-pointer font-bold">
                                  อัปโหลดเอกสาร
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
                        <div className="flex gap-1.5 ml-3">
                          <button
                            onClick={() => {
                              setEditingHolidayId(h.id);
                              setEditHolidayData({
                                date: h.date,
                                title: h.title,
                                is_changed: h.is_changed || false,
                                changed_date: h.changed_date || h.date,
                              });
                            }}
                            className="p-2 text-gray-400 hover:text-orange-500 border rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => triggerDeleteHoliday(h.id)}
                            className="p-2 text-gray-400 hover:text-red-500 border rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-orange-50/80 p-4 rounded-xl border border-orange-200 space-y-4">
                        <input
                          type="date"
                          value={editHolidayData.date}
                          onChange={(e) =>
                            setEditHolidayData({
                              ...editHolidayData,
                              date: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg p-2.5 text-sm outline-none focus:border-orange-500"
                        />
                        <input
                          type="text"
                          value={editHolidayData.title}
                          onChange={(e) =>
                            setEditHolidayData({
                              ...editHolidayData,
                              title: e.target.value,
                            })
                          }
                          className="w-full border rounded-lg p-2.5 text-sm outline-none focus:border-orange-500"
                        />
                        <label className="text-sm font-bold flex gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editHolidayData.is_changed}
                            onChange={(e) =>
                              setEditHolidayData({
                                ...editHolidayData,
                                is_changed: e.target.checked,
                              })
                            }
                            className="w-4 h-4 text-orange-600"
                          />{" "}
                          มีการเลื่อนวันหยุดนี้
                        </label>
                        {editHolidayData.is_changed && (
                          <input
                            type="date"
                            value={editHolidayData.changed_date}
                            onChange={(e) =>
                              setEditHolidayData({
                                ...editHolidayData,
                                changed_date: e.target.value,
                              })
                            }
                            className="w-full border rounded-lg p-2.5 text-sm outline-none focus:border-orange-500"
                          />
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingHolidayId(null)}
                            className="flex-1 bg-white border font-bold py-2.5 rounded-xl text-sm"
                          >
                            ยกเลิก
                          </button>
                          <button
                            onClick={() => saveEditHoliday(h.id)}
                            className="flex-1 bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm"
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

      {/* 🌟 View 4: Roles & Users */}
      {activeView === "roles_form" && (
        <div className="p-4 md:p-6 max-w-lg w-full mx-auto animate-in fade-in slide-in-from-right-4 space-y-5">
          <button
            onClick={() => setActiveView("menu")}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-full border shadow-sm w-fit"
          >
            <ChevronLeft className="w-4 h-4" /> กลับเมนูหลัก
          </button>
          <div className="mb-4">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-600" />{" "}
              จัดการสิทธิ์ผู้ใช้งาน
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              เปลี่ยนสิทธิ์ เปิด/ปิดระงับไอดี และแก้ไขข้อมูล
            </p>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-sm text-gray-800">
                พนักงานทั้งหมด ({filteredUsersList.length})
              </h3>
              <div className="relative">
                <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full sm:w-40 bg-white border border-gray-200 text-xs font-bold text-gray-600 rounded-lg py-2 pl-8 pr-3 outline-none focus:border-purple-500 appearance-none shadow-sm cursor-pointer"
                >
                  <option value="all">ดูทุกสิทธิ์ (All)</option>
                  <option value="user">พนักงานทั่วไป (USER)</option>
                  <option value="hr">ฝ่ายบุคคล (HR)</option>
                  <option value="it">SUPPORT (ฝ่ายสนับสนุน)</option>
                  <option value="manager">หัวหน้างาน (MANAGER)</option>
                  <option value="admin">ผู้ดูแลระบบ (ADMIN)</option>
                </select>
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto custom-scrollbar">
              {filteredUsersList.length === 0 ? (
                <div className="p-10 text-center text-gray-400 font-bold text-sm">
                  ไม่พบข้อมูลผู้ใช้งาน
                </div>
              ) : (
                filteredUsersList.map((u) => (
                  <div
                    key={u.id}
                    className={`p-4 flex flex-col gap-3 transition-colors ${u.is_active === false ? "bg-red-50/30 grayscale opacity-70" : "hover:bg-gray-50"}`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          u.picture_url ||
                          "https://cdn-icons-png.flaticon.com/512/847/847969.png"
                        }
                        alt="profile"
                        className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          {u.full_name || "ไม่ได้ตั้งชื่อ"}
                          <button
                            onClick={() => setEditingUser(u)}
                            className="text-purple-600 bg-purple-50 p-1 rounded-md hover:bg-purple-100"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {u.department || "ไม่ระบุตำแหน่ง"}{" "}
                          {u.nickname && `(${u.nickname})`}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleToggleActive(
                            u.line_user_id,
                            u.is_active !== false,
                          )
                        }
                        className="p-2"
                      >
                        {u.is_active !== false ? (
                          <ToggleRight className="w-8 h-8 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        value={u.role || "user"}
                        onChange={(e) => triggerRoleChange(u, e.target.value)}
                        disabled={u.is_active === false}
                        className="flex-1 bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-lg p-2.5 outline-none focus:border-purple-500 shadow-sm cursor-pointer"
                      >
                        <option value="user">พนักงานทั่วไป (USER)</option>
                        <option value="hr">ฝ่ายบุคคล (HR)</option>
                        <option value="it">SUPPORT (ฝ่ายสนับสนุน)</option>
                        <option value="manager">หัวหน้างาน (MANAGER)</option>
                        <option value="admin">ผู้ดูแลระบบ (ADMIN)</option>
                      </select>
                      <button
                        onClick={() => triggerDeleteUser(u)}
                        className="p-2.5 text-gray-400 hover:text-red-500 bg-white border border-gray-200 rounded-lg shadow-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {u.is_active === false && (
                      <p className="text-[10px] font-bold text-red-500 text-center bg-red-100 py-1 rounded-md">
                        บัญชีนี้ถูกระงับการใช้งาน
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🌟 View 5: Cron Job Bot */}
      {activeView === "cron_form" && (
        <div className="p-4 md:p-6 max-w-lg w-full mx-auto animate-in fade-in slide-in-from-right-4 space-y-5">
          <button
            onClick={() => setActiveView("menu")}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-full border shadow-sm w-fit"
          >
            <ChevronLeft className="w-4 h-4" /> กลับเมนูหลัก
          </button>
          <div className="mb-4">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Bot className="w-6 h-6 text-emerald-600" /> ตั้งค่าบอทปฏิทิน
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              กำหนดเวลาและผู้ที่จะได้รับสรุปคิวงานประจำวัน
            </p>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden p-6">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-emerald-100">
              <Clock className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="font-bold text-gray-800 mb-2 text-center">
              เวลาแจ้งเตือนประจำวัน
            </h3>
            <input
              type="time"
              value={cronTime}
              onChange={(e) => setCronTime(e.target.value)}
              className="w-full max-w-[200px] text-center text-3xl font-black text-emerald-700 bg-emerald-50 border-2 border-emerald-200 p-4 rounded-2xl outline-none focus:border-emerald-500 mx-auto block mb-6 shadow-inner"
            />
            <div className="mb-6 border-t border-gray-100 pt-6">
              <h3 className="font-bold text-sm text-gray-800 mb-3 text-center">
                1. ส่งสรุปให้กลุ่มสิทธิ์ (Role)
              </h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {["admin", "manager", "hr", "it", "user"].map((role) => (
                  <label
                    key={role}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer border-2 transition-all select-none ${cronTargetRoles.includes(role) ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm" : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50"}`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={cronTargetRoles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked)
                          setCronTargetRoles([...cronTargetRoles, role]);
                        else
                          setCronTargetRoles(
                            cronTargetRoles.filter((r) => r !== role),
                          );
                      }}
                    />
                    {role === "it" ? "SUPPORT" : role.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-8 border-t border-gray-100 pt-6">
              <h3 className="font-bold text-sm text-gray-800 mb-3 text-center">
                2. ส่งสรุปให้รายบุคคล (เจาะจงคน)
              </h3>
              <div className="max-h-56 overflow-y-auto custom-scrollbar border border-gray-200 rounded-xl p-2 bg-gray-50">
                {usersList.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-6">
                    กำลังโหลดรายชื่อ...
                  </p>
                ) : (
                  usersList.map((u) => (
                    <label
                      key={u.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${cronTargetUsers.includes(u.line_user_id) ? "bg-emerald-100/50" : "hover:bg-white"}`}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                        checked={cronTargetUsers.includes(u.line_user_id)}
                        onChange={(e) => {
                          if (e.target.checked)
                            setCronTargetUsers([
                              ...cronTargetUsers,
                              u.line_user_id,
                            ]);
                          else
                            setCronTargetUsers(
                              cronTargetUsers.filter(
                                (id) => id !== u.line_user_id,
                              ),
                            );
                        }}
                      />
                      <img
                        src={
                          u.picture_url ||
                          "https://cdn-icons-png.flaticon.com/512/847/847969.png"
                        }
                        alt="profile"
                        className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-800">
                          {u.full_name || "ไม่ได้ตั้งชื่อ"}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase">
                          {u.role}
                        </span>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-3 text-center bg-gray-100 p-2 rounded-lg">
                💡 หากเลือกทั้ง Role และรายบุคคล
                ระบบจะส่งให้ทั้งสองกลุ่มโดยไม่ซ้ำซ้อนกันครับ
              </p>
            </div>
            <button
              onClick={handleSaveCronSettings}
              disabled={saving}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl flex justify-center items-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-5 h-5" /> บันทึกการตั้งค่าบอท
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
