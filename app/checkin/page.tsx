"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  MapPin,
  Clock,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  History,
  CalendarDays,
  Calendar as CalendarIcon,
  XCircle,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function CheckinPage() {
  const [activeTab, setActiveTab] = useState<"checkin" | "history">("checkin");

  // 🌟 State สำหรับ LINE LIFF
  const [isLiffInit, setIsLiffInit] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [logs, setLogs] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<
    "today" | "week" | "month" | "custom"
  >("today");
  const [customDate, setCustomDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ================= 1. เริ่มต้นระบบ LINE LIFF =================
  useEffect(() => {
    const initLiff = async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: "2010143328-wyg8T4P5" }); // 🚀 ใส่ LIFF ID ของพี่แม็คที่นี่!

        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setUserProfile(profile);
        } else {
          // ถ้าไม่ได้เปิดในแอป LINE ให้บังคับ Login
          liff.login();
        }
      } catch (error) {
        console.error("LIFF Init Error:", error);
        // Fallback: เผื่อพี่แม็คเปิดเทสบนคอมผ่าน localhost
        setUserProfile({
          userId: "U_LOCAL_TESTER",
          displayName: "Developer Mode",
          pictureUrl:
            "https://ui-avatars.com/api/?name=Dev&background=0D8ABC&color=fff",
        });
      } finally {
        setIsLiffInit(true);
      }
    };
    initLiff();
  }, []);

  // โหลดข้อมูลเมื่อ LIFF พร้อมและดึง User Profile ได้แล้ว
  useEffect(() => {
    if (isLiffInit && userProfile) {
      if (activeTab === "checkin") {
        fetchActiveTopics();
      } else {
        fetchHistory();
      }
    }
  }, [activeTab, historyFilter, customDate, isLiffInit, userProfile]);

  // ================= 2. โหลดหัวข้องาน =================
  const fetchActiveTopics = async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("attendance_topics")
      .select("*")
      .eq("is_active", true)
      .gte("end_date", todayStr)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      setTopics(data);
      if (!selectedTopic || !data.find((t) => t.id === selectedTopic)) {
        setSelectedTopic(data[0].id);
      }
    } else {
      setTopics([]);
    }
  };

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  // ================= 3. ฟังก์ชันกด Check-in =================
  const handleCheckIn = async () => {
    if (!selectedTopic)
      return showToast("กรุณาเลือกหัวข้องานก่อนครับ", "error");
    if (!userProfile?.userId)
      return showToast("ไม่พบข้อมูลผู้ใช้ LINE กรุณาลองใหม่อีกครั้ง", "error");

    setLoading(true);

    if (!navigator.geolocation) {
      showToast("มือถือของคุณไม่รองรับการดึง GPS", "error");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const { error } = await supabase.from("attendance_logs").insert([
            {
              user_id: userProfile.userId,
              topic_id: selectedTopic,
              check_in_lat: latitude,
              check_in_lng: longitude,
              status: "checked_in",
            },
          ]);
          if (error) throw error;

          showToast("Check-in สำเร็จแล้ว! ระบบบันทึกพิกัดเรียบร้อย", "success");

          // 🔥 เพิ่มส่วนนี้: ยิง API แจ้งเตือนเข้า LINE ตัวเอง
          const selectedTopicData = topics.find((t) => t.id === selectedTopic);
          if (selectedTopicData) {
            // แปลงวันที่และเวลาสำหรับ Flex
            const now = new Date();
            const timeStr = now.toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const dayNames = [
              "อาทิตย์",
              "จันทร์",
              "อังคาร",
              "พุธ",
              "พฤหัสบดี",
              "ศุกร์",
              "เสาร์",
            ];
            const thaiDateStr = `${dayNames[now.getDay()]}ที่ ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543}`;

            let shiftStr = "งานเช้า";
            if (selectedTopicData.shift_type === "afternoon")
              shiftStr = "งานบ่าย";
            if (selectedTopicData.shift_type === "custom")
              shiftStr = "กำหนดเอง";

            let teamStr = "ออฟฟิศ";
            if (selectedTopicData.work_type === "onsite")
              teamStr = `ทีม ${selectedTopicData.team_type.replace("team_", "").toUpperCase()}`;
            if (selectedTopicData.team_type === "team_all")
              teamStr = "ทั้งหมดทุกทีม";

            await fetch("/api/checkin-notify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: userProfile.userId,
                topicTitle: selectedTopicData.title,
                thaiDateStr: thaiDateStr,
                shiftType: shiftStr,
                teamName: teamStr,
                checkInTime: timeStr,
                liffUrl: "https://liff.line.me/2010143328-wyg8T4P5/checkin",
              }),
            });
          }

          setTimeout(() => setActiveTab("history"), 1500);
        } catch (err: any) {
          showToast(err.message, "error");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        showToast(
          "ไม่สามารถดึงตำแหน่งได้! กรุณาไปที่ การตั้งค่า > ความเป็นส่วนตัว > เปิดตำแหน่งที่ตั้ง",
          "error",
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // ================= 4. โหลดประวัติ =================
  const fetchHistory = async () => {
    setLoadingHistory(true);
    let startDate = new Date();
    let endDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (historyFilter === "week") {
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(startDate.setDate(diff));
    } else if (historyFilter === "month") {
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    } else if (historyFilter === "custom") {
      startDate = new Date(customDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customDate);
      endDate.setHours(23, 59, 59, 999);
    }

    const { data } = await supabase
      .from("attendance_logs")
      .select(`*, attendance_topics ( title, team_type, work_type )`)
      .eq("user_id", userProfile?.userId) // 🚀 ดึงเฉพาะประวัติของ LINE ID นี้
      .gte("check_in_time", startDate.toISOString())
      .lte("check_in_time", endDate.toISOString())
      .order("check_in_time", { ascending: false });

    if (data) setLogs(data);
    setLoadingHistory(false);
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "-";
    return (
      new Date(isoString).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " น."
    );
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // หน้าจอ Loading รอ LIFF
  if (!isLiffInit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-sans">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-gray-500">
          กำลังเชื่อมต่อ LINE...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-10">
      {toast.show && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[60] flex items-start gap-3 bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)] px-4 py-4 rounded-2xl animate-in slide-in-from-top-5 fade-in duration-300">
          {toast.type === "success" ? (
            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
          )}
          <p className="text-sm font-bold text-gray-800 leading-relaxed">
            {toast.message}
          </p>
        </div>
      )}

      {/* 🌟 Header & โปรไฟล์ผู้ใช้ */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <h1 className="font-bold text-lg">ST PLUS SYSTEM</h1>
          </div>
          {/* แสดงรูปโปรไฟล์ LINE */}
          {userProfile && (
            <div className="flex items-center gap-2 bg-black/20 py-1.5 px-3 rounded-full backdrop-blur-sm">
              <span className="text-xs font-bold truncate max-w-[100px]">
                {userProfile.displayName}
              </span>
              <img
                src={userProfile.pictureUrl}
                alt="profile"
                className="w-6 h-6 rounded-full border border-white/50"
              />
            </div>
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

      {/* ================= TAB 1: ลงเวลาทำงาน ================= */}
      {activeTab === "checkin" && (
        <div className="p-4 md:p-6 max-w-md w-full mx-auto animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4">
                <CalendarDays className="h-5 w-5 text-blue-500" />
                เลือกหัวข้องานวันนี้
              </label>

              {topics.length === 0 ? (
                <div className="text-sm text-gray-500 bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center flex flex-col items-center">
                  <XCircle className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="font-bold text-gray-600">
                    ไม่มีหัวข้องานที่เปิดอยู่
                  </p>
                  <p className="text-xs mt-1">
                    กรุณาติดต่อ Manager เพื่อสร้างหัวข้องาน
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topics.map((topic) => (
                    <label
                      key={topic.id}
                      className={`flex items-start p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedTopic === topic.id ? "border-blue-600 bg-blue-50" : "border-gray-100 hover:border-blue-200 hover:bg-gray-50"}`}
                    >
                      <input
                        type="radio"
                        className="hidden"
                        checked={selectedTopic === topic.id}
                        onChange={() => setSelectedTopic(topic.id)}
                      />
                      <div
                        className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${selectedTopic === topic.id ? "border-blue-600" : "border-gray-300"}`}
                      >
                        {selectedTopic === topic.id && (
                          <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-bold ${selectedTopic === topic.id ? "text-blue-900" : "text-gray-900"}`}
                        >
                          {topic.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{" "}
                            {topic.start_time.substring(0, 5)} -{" "}
                            {topic.end_time.substring(0, 5)} น.
                          </span>
                          {topic.team_type !== "office" && (
                            <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">
                              ออกไซต์ ({topic.team_type})
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <button
                onClick={handleCheckIn}
                disabled={loading || topics.length === 0}
                className="w-full bg-[#1e293b] hover:bg-black text-white font-bold py-4 px-4 rounded-2xl transition-transform active:scale-95 flex justify-center items-center gap-2 shadow-lg shadow-gray-200 disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    กำลังดึงพิกัด...
                  </div>
                ) : (
                  <>
                    <Navigation className="h-5 w-5" />
                    ลงเวลาเข้างาน (Check-in)
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-gray-400 mt-3 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" /> ระบบจะบันทึกพิกัดปัจจุบันของคุณ
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: ประวัติของฉัน ================= */}
      {activeTab === "history" && (
        <div className="p-4 md:p-6 max-w-md w-full mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setHistoryFilter("today")}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-xl transition-colors ${historyFilter === "today" ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
            >
              วันนี้
            </button>
            <button
              onClick={() => setHistoryFilter("week")}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-xl transition-colors ${historyFilter === "week" ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
            >
              สัปดาห์นี้
            </button>
            <button
              onClick={() => setHistoryFilter("month")}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-xl transition-colors ${historyFilter === "month" ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
            >
              เดือนนี้
            </button>
            <div
              className={`w-full flex items-center mt-1 p-1 rounded-xl transition-colors ${historyFilter === "custom" ? "bg-blue-50 border border-blue-200" : "border border-transparent"}`}
            >
              <button
                onClick={() => setHistoryFilter("custom")}
                className={`shrink-0 text-xs font-bold py-2 px-3 rounded-xl transition-colors ${historyFilter === "custom" ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
              >
                ระบุวัน
              </button>
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setHistoryFilter("custom");
                }}
                className={`ml-2 flex-1 bg-transparent text-sm font-bold outline-none ${historyFilter === "custom" ? "text-blue-900" : "text-gray-400"}`}
              />
            </div>
          </div>

          {loadingHistory ? (
            <div className="py-10 flex flex-col items-center justify-center text-gray-400">
              <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-bold">กำลังโหลดประวัติ...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
              <div className="bg-gray-50 p-4 rounded-full mb-3">
                <History className="w-8 h-8 text-gray-300" />
              </div>
              <p className="font-bold text-gray-600">ไม่มีประวัติการลงเวลา</p>
              <p className="text-xs text-gray-400 mt-1">
                ในช่วงเวลาที่คุณเลือก
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-3"
                >
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm mb-1">
                      {log.attendance_topics?.title || "ไม่ทราบหัวข้องาน"}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />{" "}
                        {formatDate(log.check_in_time)}
                      </span>
                      {log.attendance_topics?.work_type === "onsite" && (
                        <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-bold">
                          ไซต์: {log.attendance_topics?.team_type}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                      เวลาเข้างาน
                    </p>
                    <p className="text-lg font-black text-blue-600">
                      {formatTime(log.check_in_time)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
