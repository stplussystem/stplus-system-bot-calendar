"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  MapPin,
  Clock,
  Camera,
  History,
  Send,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  LogOut,
  ChevronLeft,
  CalendarRange,
  UserCog,
  RefreshCw,
} from "lucide-react";
import { getAttendanceMessage } from "@/lib/lineFlex";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function CheckinPage() {
  // ==========================================
  // 1. Core States
  // ==========================================
  const [isLiffInit, setIsLiffInit] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"menu" | "checkin" | "history">(
    "menu",
  );

  // ==========================================
  // 2. Check-in States
  // ==========================================
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [shift, setShift] = useState<string>("เช้า");
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentLog, setCurrentLog] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // ==========================================
  // 3. History States
  // ==========================================
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("month"); // "week", "month", "custom"
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // ==========================================
  // 4. UI/Modal States
  // ==========================================
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    nickname: "",
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [cpNote, setCpNote] = useState("");
  const [showCpModal, setShowCpModal] = useState(false);

  // ==========================================
  // ▶️ Lifecycle & Initialization
  // ==========================================
  useEffect(() => {
    // 🌟 ดักจับ URL จาก LINE Rich Menu
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "checkin" || params.get("tab") === "checkin")
      setActiveTab("checkin");
    if (params.get("action") === "history" || params.get("tab") === "history")
      setActiveTab("history");
    if (params.get("action") === "profile" || params.get("tab") === "profile")
      setShowProfileSettings(true);

    const initLiff = async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({
          liffId: process.env.NEXT_PUBLIC_LIFF_ID || "2010143328-wyg8T4P5",
        });

        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setUserProfile(profile);
          await checkAndAddUser(profile);
        } else {
          liff.login();
        }
      } catch (error) {
        console.error("LIFF Init Error:", error);
      } finally {
        setIsLiffInit(true);
      }
    };
    initLiff();
    fetchTopics();
  }, []);

  useEffect(() => {
    if (userProfile && activeTab === "history") {
      fetchHistory();
    }
  }, [historyFilter, userProfile, activeTab]);

  useEffect(() => {
    if (userProfile && activeTab === "checkin") {
      checkTodayStatus();
    }
  }, [userProfile, activeTab]);

  // ==========================================
  // ▶️ Data Fetching
  // ==========================================
  const fetchTopics = async () => {
    const { data } = await supabase
      .from("attendance_topics")
      .select("*")
      .eq("is_active", true)
      .order("title");
    if (data) setTopics(data);
  };

  const checkAndAddUser = async (profile: any) => {
    let { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("line_user_id", profile.userId)
      .single();
    if (!user) {
      const { data: newUser } = await supabase
        .from("users")
        .insert([
          {
            line_user_id: profile.userId,
            full_name: profile.displayName,
            picture_url: profile.pictureUrl,
            role: "user",
          },
        ])
        .select()
        .single();
      user = newUser;
      setShowProfileSettings(true); // บังคับตั้งค่าชื่อถ้ามาครั้งแรก
    } else if (!user.full_name || user.full_name === profile.displayName) {
      setShowProfileSettings(true); // บังคับอัปเดตชื่อจริง
    }
    setDbUser(user);
    setProfileForm({
      full_name: user?.full_name || "",
      nickname: user?.nickname || "",
    });
  };

  const checkTodayStatus = async () => {
    if (!userProfile) return;
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("attendance_logs")
      .select("*")
      .eq("user_id", userProfile.userId)
      .gte("check_in_time", `${today}T00:00:00+07:00`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    setCurrentLog(data || null);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    let start = new Date();
    let end = new Date();

    if (historyFilter === "week") {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
    } else if (historyFilter === "month") {
      // 🌟 ตัดรอบวันที่ 21 ถึง 20
      const todayDate = start.getDate();
      if (todayDate <= 20) {
        start.setMonth(start.getMonth() - 1);
        start.setDate(21);
        end.setDate(20);
      } else {
        start.setDate(21);
        end.setMonth(end.getMonth() + 1);
        end.setDate(20);
      }
    }

    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}T00:00:00+07:00`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}T23:59:59+07:00`;

    // 🌟 ดึงข้อมูล Logs + Checkpoints พ่วงมาด้วย
    const { data } = await supabase
      .from("attendance_logs")
      .select(
        `*, attendance_topics ( title, team_type ), attendance_checkpoints ( * )`,
      )
      .eq("user_id", userProfile?.userId)
      .gte("check_in_time", startStr)
      .lte("check_in_time", endStr)
      .order("check_in_time", { ascending: false });

    if (data) setLogs(data);
    setLoadingHistory(false);
  };

  // ==========================================
  // ▶️ Actions (Save Profile, Geolocation, Actions)
  // ==========================================
  const showToastMsg = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3000,
    );
  };

  const handleUpdateProfile = async () => {
    if (!profileForm.full_name)
      return showToastMsg("กรุณากรอกชื่อ-นามสกุล", "error");
    setUpdatingProfile(true);
    await supabase
      .from("users")
      .update({
        full_name: profileForm.full_name,
        nickname: profileForm.nickname,
      })
      .eq("line_user_id", userProfile.userId);
    setDbUser({ ...dbUser, ...profileForm });
    showToastMsg("บันทึกข้อมูลสำเร็จ");
    setShowProfileSettings(false);
    setUpdatingProfile(false);
  };

  const getLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject("Browser not support");
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
      });
    });
  };

  // ==========================================
  // ▶️ Check-in / Check-out / Checkpoint
  // ==========================================
  const handleCheckIn = async () => {
    if (!selectedTopic) return showToastMsg("กรุณาเลือกหัวข้องาน", "error");
    setLoading(true);
    try {
      const pos = await getLocation();
      const topicDetails = topics.find((t) => t.id === selectedTopic);
      const inTime = new Date().toISOString();
      const locStr = `พิกัด: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;

      const { data, error } = await supabase
        .from("attendance_logs")
        .insert([
          {
            user_id: userProfile.userId,
            topic_id: selectedTopic,
            shift: shift,
            check_in_time: inTime,
            check_in_lat: pos.coords.latitude,
            check_in_lng: pos.coords.longitude,
            photo_url: photo || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      showToastMsg("ลงชื่อเข้างานสำเร็จ");
      checkTodayStatus();
      setPhoto(null);

      // ส่งข้อความ Flex Message
      const liff = (await import("@line/liff")).default;
      if (liff.isInClient()) {
        const dStr = formatThaiDate(inTime);
        const tStr = formatTime(inTime);
        const flex = getAttendanceMessage(
          true,
          {
            shift: shift,
            date: dStr,
            team: topicDetails?.team_type || "-",
            topic: topicDetails?.title || "-",
            inTime: tStr,
            inLocation: topicDetails?.title || locStr,
            outTime: "",
            outLocation: "",
          },
          `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}?action=checkin`,
        );

        await liff.sendMessages([flex as any]);
        setTimeout(() => liff.closeWindow(), 1000);
      }
    } catch (err) {
      showToastMsg("เกิดข้อผิดพลาดในการลงเวลา", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCheckpoint = async () => {
    if (!currentLog) return;
    setLoading(true);
    try {
      const pos = await getLocation();
      const cpTime = new Date().toISOString();

      const { error } = await supabase.from("attendance_checkpoints").insert([
        {
          log_id: currentLog.id,
          checkpoint_time: cpTime,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          note: `แวะจุด: ${cpNote || "จุดแวะทำงาน"}`,
        },
      ]);

      if (error) throw error;
      showToastMsg("บันทึกจุดแวะสำเร็จ");
      setShowCpModal(false);
      setCpNote("");
    } catch (err) {
      showToastMsg("เกิดข้อผิดพลาดในการบันทึกจุดแวะ", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentLog) return;
    setLoading(true);
    try {
      const pos = await getLocation();
      const outTime = new Date().toISOString();

      const { error } = await supabase
        .from("attendance_logs")
        .update({
          check_out_time: outTime,
          check_out_lat: pos.coords.latitude,
          check_out_lng: pos.coords.longitude,
        })
        .eq("id", currentLog.id);

      if (error) throw error;
      showToastMsg("ลงเวลาออกงานสำเร็จ");
      checkTodayStatus();

      // ส่งข้อความ Flex Message
      const liff = (await import("@line/liff")).default;
      if (liff.isInClient()) {
        const { data: fullLog } = await supabase
          .from("attendance_logs")
          .select("*, attendance_topics(title, team_type)")
          .eq("id", currentLog.id)
          .single();
        const dStr = formatThaiDate(fullLog.check_in_time);
        const flex = getAttendanceMessage(
          false,
          {
            shift: fullLog.shift || "เช้า",
            date: dStr,
            team: fullLog.attendance_topics?.team_type || "-",
            topic: fullLog.attendance_topics?.title || "-",
            inTime: formatTime(fullLog.check_in_time),
            inLocation: fullLog.attendance_topics?.title || "-",
            outTime: formatTime(outTime),
            outLocation: fullLog.attendance_topics?.title || "-",
          },
          "",
        );

        await liff.sendMessages([flex as any]);
        setTimeout(() => liff.closeWindow(), 1000);
      }
    } catch (err) {
      showToastMsg("เกิดข้อผิดพลาดในการลงเวลาออก", "error");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ▶️ Format Helpers
  // ==========================================
  const formatTime = (isoStr: string) => {
    if (!isoStr) return "-";
    return new Date(isoStr).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const formatThaiDate = (isoStr: string) => {
    if (!isoStr) return "-";
    return new Date(isoStr).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!isLiffInit) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20">
      {/* 🔴 Toast */}
      {toast.show && (
        <div
          className={`fixed top-4 left-4 right-4 md:w-96 z-[110] flex items-start gap-3 border shadow-2xl px-4 py-4 rounded-2xl animate-in slide-in-from-top-5 fade-in duration-300 ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
          )}
          <p className="text-sm font-bold leading-relaxed">{toast.message}</p>
        </div>
      )}

      {/* 🌟 Modal 1: ตั้งค่าโปรไฟล์ */}
      {showProfileSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-blue-600" /> ข้อมูลส่วนตัวของคุณ
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              กรุณาตรวจสอบและอัปเดตชื่อ-นามสกุลจริง เพื่อใช้ในระบบของบริษัทครับ
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">
                  ชื่อ-นามสกุล (ภาษาไทย) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      full_name: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">
                  ชื่อเล่น (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  value={profileForm.nickname}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, nickname: e.target.value })
                  }
                  className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="เช่น บอย"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {dbUser?.full_name && (
                <button
                  onClick={() => setShowProfileSettings(false)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-sm hover:bg-gray-200"
                >
                  ปิด
                </button>
              )}
              <button
                onClick={handleUpdateProfile}
                disabled={updatingProfile}
                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl text-sm shadow-sm hover:bg-blue-700"
              >
                {updatingProfile ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Modal 2: เพิ่มจุดแวะ */}
      {showCpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" /> เช็คอินจุดแวะทำงาน
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              ระบุชื่อสถานที่ หรือ จุดที่แวะปฏิบัติงานระหว่างวัน
            </p>
            <input
              type="text"
              value={cpNote}
              onChange={(e) => setCpNote(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-6"
              placeholder="เช่น มหาวิทยาลัยธรรมศาสตร์..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCpModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-sm hover:bg-gray-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddCheckpoint}
                disabled={loading || !cpNote}
                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl text-sm shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                บันทึกจุดแวะ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Modal 3: รายละเอียดประวัติ (อัปเกรดแผนที่ + รูปกล้อง + เรียงบรรทัดใหม่) */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <History className="w-5 h-5" /> รายละเอียดการลงเวลา
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-black/20 hover:bg-black/40 p-1.5 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar">
              {/* รูปถ่าย */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500">
                  📸 รูปถ่ายลงชื่อ
                </p>
                {selectedLog.photo_url ? (
                  <img
                    src={selectedLog.photo_url}
                    className="w-full rounded-2xl aspect-video object-cover border border-gray-200 shadow-sm"
                  />
                ) : (
                  <div className="w-full aspect-video bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-dashed border-gray-300">
                    <Camera className="w-12 h-12 text-gray-300 mb-2" />
                    <span className="text-sm font-bold text-gray-400">
                      ไม่มีรูปภาพ
                    </span>
                  </div>
                )}
              </div>

              {/* รายละเอียดเข้า-ออก-จุดแวะ */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-gray-100 space-y-4 shadow-inner">
                {/* หัวข้องาน */}
                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-500 mb-0.5 flex items-center gap-1">
                    📍 หัวข้องาน
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {selectedLog.attendance_topics?.title || "-"}
                  </p>
                </div>

                <div className="space-y-3">
                  {/* บรรทัดที่ 1: เข้างาน */}
                  <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-green-100 shadow-sm">
                    <div className="flex-1 pr-2 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0"></div>
                        <span className="text-xs font-bold text-gray-600 truncate">
                          ลงชื่อเข้างาน
                        </span>
                      </div>
                      <p className="text-lg font-black text-green-600">
                        {formatTime(selectedLog.check_in_time)}
                      </p>
                    </div>
                    {selectedLog.check_in_lat && selectedLog.check_in_lng && (
                      <a
                        href={`https://maps.google.com/?q=${selectedLog.check_in_lat},${selectedLog.check_in_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex shrink-0 items-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-[11px] font-bold border border-blue-100 transition-colors shadow-sm"
                      >
                        <MapPin className="w-3 h-3" /> ดูพิกัดแผนที่
                      </a>
                    )}
                  </div>

                  {/* บรรทัดกลาง: จุดแวะ */}
                  {selectedLog.attendance_checkpoints &&
                    selectedLog.attendance_checkpoints.length > 0 &&
                    selectedLog.attendance_checkpoints
                      .sort(
                        (a: any, b: any) =>
                          new Date(a.checkpoint_time).getTime() -
                          new Date(b.checkpoint_time).getTime(),
                      )
                      .map((cp: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm ml-6 relative"
                        >
                          <div className="absolute -left-4 top-1/2 w-4 border-t-2 border-dashed border-gray-300"></div>
                          <div className="flex-1 pr-2 min-w-0">
                            <div className="flex items-start gap-1.5 mb-0.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-1"></div>
                              <span className="text-xs font-bold text-gray-600 line-clamp-2">
                                {cp.note
                                  ? cp.note.replace("แวะจุด: ", "")
                                  : "จุดแวะ"}
                              </span>
                            </div>
                            <p className="text-lg font-black text-blue-600">
                              {formatTime(cp.checkpoint_time)}
                            </p>
                          </div>
                          {cp.lat && cp.lng && (
                            <a
                              href={`https://maps.google.com/?q=${cp.lat},${cp.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex shrink-0 items-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full text-[11px] font-bold border border-blue-100 transition-colors shadow-sm"
                            >
                              <MapPin className="w-3 h-3" /> ดูพิกัดแผนที่
                            </a>
                          )}
                        </div>
                      ))}

                  {/* บรรทัดสุดท้าย: ออกงาน */}
                  <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-red-100 shadow-sm">
                    <div className="flex-1 pr-2 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></div>
                        <span className="text-xs font-bold text-gray-600 truncate">
                          ลงชื่อออกงาน
                        </span>
                      </div>
                      <p className="text-lg font-black text-red-500">
                        {selectedLog.check_out_time
                          ? formatTime(selectedLog.check_out_time)
                          : "ยังไม่ได้ลงชื่อ"}
                      </p>
                    </div>
                    {selectedLog.check_out_lat && selectedLog.check_out_lng && (
                      <a
                        href={`https://maps.google.com/?q=${selectedLog.check_out_lat},${selectedLog.check_out_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex shrink-0 items-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-full text-[11px] font-bold border border-red-100 transition-colors shadow-sm"
                      >
                        <MapPin className="w-3 h-3" /> ดูพิกัดแผนที่
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 หน้าเมนูหลัก (Portal Dashboard) */}
      {activeTab === "menu" && (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
          <div className="mb-10 text-center space-y-3">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-blue-600/20 mb-4">
              <Clock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              ST PLUS SYSTEM
            </h2>
            <p className="text-sm font-bold text-gray-500">
              สวัสดี,{" "}
              <span className="text-blue-600">
                {dbUser?.full_name || userProfile?.displayName || "พนักงาน"}
              </span>{" "}
              👋
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <button
              onClick={() => setActiveTab("checkin")}
              className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all active:scale-95"
            >
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <span className="font-bold text-gray-800 text-sm">ลงเวลางาน</span>
            </button>

            <button
              onClick={() => (window.location.href = "/leave")}
              className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center gap-4 hover:border-orange-300 hover:shadow-md transition-all active:scale-95"
            >
              <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
                <CalendarRange className="w-6 h-6" />
              </div>
              <span className="font-bold text-gray-800 text-sm">ระบบลางาน</span>
            </button>

            <button
              onClick={() => setShowProfileSettings(true)}
              className="col-span-2 bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-center gap-3 hover:border-purple-300 hover:shadow-md transition-all active:scale-95"
            >
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                <UserCog className="w-5 h-5" />
              </div>
              <span className="font-bold text-gray-800 text-sm">
                ข้อมูลส่วนตัว / ตั้งค่า
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 🌟 Header สำหรับหน้าลงเวลา / ประวัติ */}
      {(activeTab === "checkin" || activeTab === "history") && (
        <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("menu")}
                className="bg-black/20 hover:bg-black/30 p-1.5 rounded-full backdrop-blur-sm transition-colors mr-1"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <Clock className="w-5 h-5" />
              <h1 className="font-bold text-lg">ST PLUS</h1>
            </div>
            {userProfile && (
              <button
                onClick={() => setShowProfileSettings(true)}
                className="flex items-center gap-2 bg-black/20 hover:bg-black/30 py-1.5 px-3 rounded-full backdrop-blur-sm transition-colors active:scale-95"
              >
                <span className="text-xs font-bold truncate max-w-[100px]">
                  {dbUser?.full_name || userProfile.displayName}
                </span>
                <img
                  src={userProfile.pictureUrl}
                  alt="profile"
                  className="w-6 h-6 rounded-full border border-white/50 shadow-sm"
                />
              </button>
            )}
          </div>
          <div className="flex">
            <button
              onClick={() => setActiveTab("checkin")}
              className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === "checkin" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
            >
              <MapPin className="w-4 h-4" /> ลงเวลาทำงาน
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
            >
              <History className="w-4 h-4" /> ประวัติของฉัน
            </button>
          </div>
        </div>
      )}

      {/* 🌟 เนื้อหาหลัก: ลงเวลาทำงาน */}
      {activeTab === "checkin" && (
        <div className="p-4 md:p-6 max-w-lg w-full mx-auto space-y-4 animate-in fade-in slide-in-from-right-4">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
            <label className="text-xs font-bold text-gray-500 block mb-2">
              📌 เลือกหัวข้องาน / ทีมที่ทำ
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              disabled={currentLog !== null}
              className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 disabled:bg-gray-100 disabled:opacity-70"
            >
              <option value="">-- กรุณาเลือกหัวข้องาน --</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.team_type})
                </option>
              ))}
            </select>

            <label className="text-xs font-bold text-gray-500 block mt-4 mb-2">
              ⏰ เลือกกะการทำงาน
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["เช้า", "บ่าย", "ดึก"].map((s) => (
                <button
                  key={s}
                  disabled={currentLog !== null}
                  onClick={() => setShift(s)}
                  className={`py-2 rounded-xl text-sm font-bold border transition-colors ${shift === s ? "bg-blue-50 border-blue-500 text-blue-700" : "border-gray-200 text-gray-500"} disabled:opacity-50`}
                >
                  กะ{s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 text-center">
            {currentLog ? (
              !currentLog.check_out_time ? (
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-green-100">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">
                    ลงชื่อเข้างานแล้ว
                  </h2>
                  <p className="text-sm text-gray-500 font-bold bg-gray-50 p-3 rounded-xl">
                    เข้างานเวลา:{" "}
                    <span className="text-blue-600">
                      {formatTime(currentLog.check_in_time)} น.
                    </span>
                  </p>

                  <button
                    onClick={() => setShowCpModal(true)}
                    disabled={loading}
                    className="w-full bg-blue-50 text-blue-600 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    <MapPin className="w-5 h-5" /> แวะจุดปฏิบัติงาน
                    (เช็คอินระหว่างทาง)
                  </button>

                  <button
                    onClick={handleCheckOut}
                    disabled={loading}
                    className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-red-700 transition-colors"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <LogOut className="w-5 h-5" /> ลงเวลาออกงาน
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="py-6 space-y-3">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-10 h-10 text-gray-400" />
                  </div>
                  <h2 className="text-lg font-black text-gray-700">
                    ลงเวลาครบถ้วนแล้ว
                  </h2>
                  <p className="text-sm text-gray-500">
                    สำหรับวันนี้คุณได้ลงเวลาเข้าและออกเรียบร้อยแล้วครับ
                  </p>
                </div>
              )
            ) : (
              <button
                onClick={handleCheckIn}
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95"
              >
                {loading ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <MapPin className="w-6 h-6" /> ลงเวลาเข้างาน
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 🌟 เนื้อหาหลัก: ประวัติการลงเวลา */}
      {activeTab === "history" && (
        <div className="p-4 md:p-6 max-w-lg w-full mx-auto space-y-4 animate-in fade-in slide-in-from-right-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex">
            <button
              onClick={() => setHistoryFilter("week")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${historyFilter === "week" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-50"}`}
            >
              สัปดาห์นี้
            </button>
            <button
              onClick={() => setHistoryFilter("month")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${historyFilter === "month" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-50"}`}
            >
              รอบเดือนนี้
            </button>
          </div>

          <div className="space-y-3">
            {loadingHistory ? (
              <div className="text-center py-10">
                <RefreshCw className="w-8 h-8 text-blue-300 animate-spin mx-auto" />
              </div>
            ) : logs.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-500">
                  ไม่พบประวัติการลงเวลา
                </p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-3 cursor-pointer hover:border-blue-300 transition-colors active:scale-95"
                >
                  {log.photo_url ? (
                    <img
                      src={log.photo_url}
                      className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-gray-200"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-200">
                      <Camera className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm truncate">
                      {log.attendance_topics?.title || "ไม่ระบุหัวข้องาน"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatThaiDate(log.check_in_time)}
                    </p>
                    {log.attendance_checkpoints &&
                      log.attendance_checkpoints.length > 0 && (
                        <div className="mt-1.5 inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-blue-100">
                          <MapPin className="w-3 h-3" /> แวะ{" "}
                          {log.attendance_checkpoints.length} จุด
                        </div>
                      )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold text-green-600 mb-0.5">
                      เข้า {formatTime(log.check_in_time)}
                    </p>
                    <p className="text-[11px] font-bold text-red-500">
                      ออก{" "}
                      {log.check_out_time
                        ? formatTime(log.check_out_time)
                        : "-"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
