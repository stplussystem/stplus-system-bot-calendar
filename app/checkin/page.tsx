"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import imageCompression from "browser-image-compression";
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
  Camera,
  ImagePlus,
  X,
  LogOut,
  MapPinHouse,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const teamLabels: { [key: string]: string } = {
  team_all: "ทั้งหมดทุกคน",
  team_n: "พี่นุ",
  team_a: "พี่หนุ่ม",
  team_b: "พี่หนึ่ง",
  team_c: "พี่บาส",
  team_d: "แคมป์",
  team_e: "หนึ่ง",
  team_f: "ทิ",
  team_g: "พี่แม็ค",
  team_other: "อื่นๆ",
};

// 🌟 ฟังก์ชันคำนวณระยะทาง GPS (Haversine Formula) คืนค่าเป็น "เมตร"
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371e3; // รัศมีโลก (เมตร)
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const deltaP = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaP / 2) * Math.sin(deltaP / 2) +
    Math.cos(p1) *
      Math.cos(p2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function CheckinPage() {
  const [activeTab, setActiveTab] = useState<"checkin" | "history">("checkin");
  const [isLiffInit, setIsLiffInit] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");

  const [checkoutTopic, setCheckoutTopic] = useState("");

  const [loading, setLoading] = useState(false);

  const [todayLog, setTodayLog] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logs, setLogs] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<
    "today" | "week" | "month" | "custom"
  >("today");
  const [customStartDate, setCustomStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [loadingHistory, setLoadingHistory] = useState(false);
  // 🌟 เพิ่ม State สำหรับเปิด/ปิดหน้าต่างดูรายละเอียดประวัติ
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "history") setActiveTab("history");

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
          displayName: "Dev Mode",
          pictureUrl: "https://ui-avatars.com/api/?name=Dev",
        });
      } finally {
        setIsLiffInit(true);
      }
    };
    initLiff();
  }, []);

  useEffect(() => {
    if (isLiffInit && userProfile) {
      if (activeTab === "checkin") {
        checkTodayStatus();
        fetchActiveTopics();

        // 🌟 เพิ่มระบบ วอร์มอัป GPS แบบเงียบๆ ทันทีที่เปิดหน้าเว็บ
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            () => {}, // สำเร็จไม่ทำอะไร แค่ปลุกชิป
            () => {}, // พลาดก็ไม่ทำอะไร
            { enableHighAccuracy: true, maximumAge: 0 },
          );
        }
      } else fetchHistory();
    }
  }, [
    activeTab,
    historyFilter,
    customStartDate,
    customEndDate,
    isLiffInit,
    userProfile,
  ]);

  useEffect(() => {
    setPhotoFile(null);
    setPhotoPreview(null);
  }, [selectedTopic, checkoutTopic, activeTab]);

  const checkTodayStatus = async () => {
    setIsCheckingStatus(true);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const startOfDayStr = `${y}-${m}-${d}T00:00:00+07:00`;
    const endOfDayStr = `${y}-${m}-${d}T23:59:59+07:00`;

    const { data, error } = await supabase
      .from("attendance_logs")
      .select(`*, attendance_topics ( title, photo_mode )`)
      .eq("user_id", userProfile.userId)
      .gte("check_in_time", startOfDayStr)
      .lte("check_in_time", endOfDayStr)
      .order("check_in_time", { ascending: false })
      .limit(1)
      .single();

    if (data && !data.check_out_time) {
      setTodayLog(data);
      setCheckoutTopic(data.topic_id);
    } else {
      setTodayLog(null);
    }
    setIsCheckingStatus(false);
  };

  const fetchActiveTopics = async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("attendance_topics")
      .select("*")
      .eq("is_active", true)
      .gte("end_date", todayStr)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      // 🌟 กรองสิทธิ์การมองเห็น
      const visibleTopics = data.filter((t) => {
        // 1. ถ้าเป็นออฟฟิศ หรือ เลือกทีมเป็น "ทั้งหมดทุกคน" -> เห็นทุกคน
        if (t.team_type === "office" || t.team_type === "team_all") return true;

        // 🌟 2. (เพิ่มใหม่แก้บั๊ก) ถ้าเว้นว่างไว้ (ไม่ได้เลือกใครเลย) -> ถือว่าอนุญาตให้ทุกคนเห็น
        if (!t.allowed_users || t.allowed_users.length === 0) return true;

        // 3. ถ้ามีการเลือกบุคคลไว้ -> เช็คว่ามีไอดีของตัวเองอยู่ในนั้นไหม
        if (t.allowed_users && Array.isArray(t.allowed_users)) {
          return t.allowed_users.includes(userProfile?.userId);
        }

        return false;
      });

      setTopics(visibleTopics);
      if (
        !selectedTopic ||
        !visibleTopics.find((t) => t.id === selectedTopic)
      ) {
        if (visibleTopics.length > 0) setSelectedTopic(visibleTopics[0].id);
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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
      setPhotoFile(file);
    }
  };

  const uploadPhoto = async () => {
    if (!photoFile) return null;
    const options = {
      maxSizeMB: 0.1,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };
    const compressedFile = await imageCompression(photoFile, options);
    const fileName = `${userProfile.userId}_${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("attendance_photos")
      .upload(fileName, compressedFile, {
        cacheControl: "3600",
        upsert: false,
      });

    // 🌟 ดัก Error ให้ชัดเจนขึ้น
    if (uploadError) {
      console.error("Storage Upload Error:", uploadError);
      throw new Error(
        `อัพรูปล้มเหลว! กรุณาตั้งค่า Bucket "attendance_photos" แบบ Public ใน Supabase Storage ก่อนครับ`,
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("attendance_photos")
      .getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  };

  const handleCheckIn = async () => {
    if (!selectedTopic)
      return showToast("กรุณาเลือกหัวข้องานก่อนครับ", "error");
    const selectedTopicData = topics.find((t) => t.id === selectedTopic);
    if (!selectedTopicData) return;
    if (selectedTopicData.photo_mode !== "none" && !photoFile)
      return showToast("กรุณาแนบรูปภาพเพื่อ Check-in ครับ", "error");

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // 🌟 1. เช็คความแม่นยำ (Accuracy) ของสัญญาณ GPS ก่อน
          const accuracy = position.coords.accuracy;
          if (accuracy > 150) {
            // ถ้าคลาดเคลื่อนเกิน 150 เมตร แปลว่าจับจากเสาสัญญาณมือถือ ไม่ใช่ดาวเทียม
            throw new Error(
              `สัญญาณ GPS ยังไม่เสถียร (คลาดเคลื่อน ${Math.ceil(accuracy)}ม.) กรุณารอ 3 วินาทีแล้วกดใหม่ครับ`,
            );
          }

          // 🌟 2. เช็คระยะพิกัด (Radar)
          if (
            selectedTopicData.radius_meters > 0 &&
            selectedTopicData.lat &&
            selectedTopicData.lng
          ) {
            const distance = calculateDistance(
              position.coords.latitude,
              position.coords.longitude,
              selectedTopicData.lat,
              selectedTopicData.lng,
            );
            if (distance > selectedTopicData.radius_meters) {
              throw new Error(
                `ไม่อนุญาตให้ลงเวลา! คุณอยู่ห่างจากสถานที่ทำงาน ${Math.ceil(distance)} เมตร (กำหนดไว้ ${selectedTopicData.radius_meters}ม.)`,
              );
            }
          }

          const uploadedPhotoUrl = await uploadPhoto();
          const { data, error } = await supabase
            .from("attendance_logs")
            .insert([
              {
                user_id: userProfile.userId,
                topic_id: selectedTopic,
                check_in_lat: position.coords.latitude,
                check_in_lng: position.coords.longitude,
                photo_url: uploadedPhotoUrl,
                status: "checked_in",
              },
            ])
            .select()
            .single();

          if (error) throw error;

          setCheckoutTopic(selectedTopic);
          setTodayLog({ ...data, attendance_topics: selectedTopicData });

          try {
            const liff = (await import("@line/liff")).default;
            if (liff.isInClient()) {
              await liff.sendMessages([
                { type: "text", text: "🕘 ลงชื่อเข้างาน" },
              ]);
              liff.closeWindow();
            }
          } catch (liffError) {
            setTimeout(() => setActiveTab("history"), 1500);
          }
        } catch (err: any) {
          showToast(err.message, "error");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        showToast(
          "ไม่สามารถดึงตำแหน่ง GPS ได้ กรุณาเปิด Location และอนุญาตการเข้าถึง",
          "error",
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handleCheckOut = async () => {
    if (!todayLog) return;

    const finalTopicId = checkoutTopic || todayLog.topic_id;
    const finalTopicData =
      topics.find((t) => t.id === finalTopicId) || todayLog.attendance_topics;

    if (finalTopicData.photo_mode !== "none" && !photoFile)
      return showToast("กรุณาแนบรูปภาพเพื่อ Check-out ครับ", "error");

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // 🌟 1. เช็คความแม่นยำ (Accuracy) ของสัญญาณ GPS ก่อน
          const accuracy = position.coords.accuracy;
          if (accuracy > 150) {
            throw new Error(
              `สัญญาณ GPS ยังไม่เสถียร (คลาดเคลื่อน ${Math.ceil(accuracy)}ม.) กรุณารอ 3 วินาทีแล้วกดใหม่ครับ`,
            );
          }

          // 🌟 2. เช็คระยะพิกัด (Radar)
          if (
            finalTopicData.radius_meters > 0 &&
            finalTopicData.lat &&
            finalTopicData.lng
          ) {
            const distance = calculateDistance(
              position.coords.latitude,
              position.coords.longitude,
              finalTopicData.lat,
              finalTopicData.lng,
            );
            if (distance > finalTopicData.radius_meters) {
              throw new Error(
                `ไม่อนุญาตให้ลงเวลา! คุณอยู่ห่างจากสถานที่ทำงาน ${Math.ceil(distance)} เมตร (กำหนดไว้ ${finalTopicData.radius_meters}ม.)`,
              );
            }
          }

          const uploadedPhotoUrl = await uploadPhoto();

          const { error } = await supabase
            .from("attendance_logs")
            .update({
              topic_id: finalTopicId,
              check_out_time: new Date().toISOString(),
              check_out_lat: position.coords.latitude,
              check_out_lng: position.coords.longitude,
              check_out_photo_url: uploadedPhotoUrl,
              status: "checked_out",
            })
            .eq("id", todayLog.id);

          if (error) throw error;

          try {
            const liff = (await import("@line/liff")).default;
            if (liff.isInClient()) {
              await liff.sendMessages([
                { type: "text", text: "🕕 ลงชื่อออกงาน" },
              ]);
              liff.closeWindow();
            } else {
              setTimeout(() => setActiveTab("history"), 1500);
            }
          } catch (liffError) {
            setTimeout(() => setActiveTab("history"), 1500);
          }
        } catch (err: any) {
          showToast(err.message, "error");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        showToast(
          "ไม่สามารถดึงตำแหน่ง GPS ได้ กรุณาเปิด Location และอนุญาตการเข้าถึง",
          "error",
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);

    const getThaiDateStr = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    let start = new Date();
    let end = new Date();

    if (historyFilter === "week") {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
    } else if (historyFilter === "month") {
      // 🌟 ลอจิกรอบเงินเดือน (ตัดวันที่ 20 ของทุกเดือน)
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
    } else if (historyFilter === "custom") {
      start = new Date(customStartDate);
      end = new Date(customEndDate);
    }

    const startStr = `${getThaiDateStr(start)}T00:00:00+07:00`;
    const endStr = `${getThaiDateStr(end)}T23:59:59+07:00`;

    const { data } = await supabase
      .from("attendance_logs")
      .select(`*, attendance_topics ( title, team_type )`)
      .eq("user_id", userProfile?.userId)
      .gte("check_in_time", startStr)
      .lte("check_in_time", endStr)
      .order("check_in_time", { ascending: false });

    if (data) setLogs(data);
    setLoadingHistory(false);
  };

  const formatTime = (isoString: string) =>
    isoString
      ? new Date(isoString).toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        }) + " น."
      : "-";
  const formatDate = (isoString: string) =>
    new Date(isoString).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

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

  const currentTopic = todayLog
    ? topics.find((t) => t.id === checkoutTopic) || todayLog.attendance_topics
    : topics.find((t) => t.id === selectedTopic);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-10">
      {toast.show && (
        <div
          className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[60] flex items-start gap-3 border shadow-[0_8px_30px_rgb(0,0,0,0.12)] px-4 py-4 rounded-2xl animate-in slide-in-from-top-5 fade-in duration-300 ${
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
        <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <h1 className="font-bold text-lg">ST PLUS SYSTEM</h1>
          </div>
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

      {/* TAB 1: ลงเวลา */}
      {activeTab === "checkin" && (
        <div className="p-4 md:p-6 max-w-md w-full mx-auto animate-in fade-in slide-in-from-left-4 duration-300">
          {isCheckingStatus ? (
            <div className="py-10 flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : todayLog ? (
            // 🔴 โหมด: ลงเวลาออกงาน (Check-out) ที่สามารถเลือกไซต์งานได้!
            <div className="bg-white rounded-3xl shadow-sm border border-red-100 overflow-hidden ring-1 ring-red-50">
              <div className="bg-red-50 p-6 border-b border-red-100 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-red-500">
                  <Clock className="w-8 h-8" />
                </div>
                <h2 className="text-red-800 font-bold text-lg">
                  กำลังปฏิบัติงาน
                </h2>
                <div className="mt-4 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-red-100 text-sm font-bold text-gray-700 shadow-sm">
                  เข้างานเวลา:{" "}
                  <span className="text-red-600">
                    {formatTime(todayLog.check_in_time)}
                  </span>
                </div>
              </div>

              {/* 🌟 1. เพิ่มกล่องให้พนักงาน "จิ้มเลือกไซต์งาน" ก่อนออกงานได้ */}
              <div className="p-6 pb-2 border-b border-gray-100">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
                  <MapPinHouse className="h-5 w-5 text-orange-500" />{" "}
                  เลือกสถานที่จบงานวันนี้ (เผื่อออกไซต์)
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {topics.map((topic) => (
                    <label
                      key={topic.id}
                      className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${checkoutTopic === topic.id ? "border-red-500 bg-red-50" : "border-gray-100 hover:border-red-200 hover:bg-gray-50"}`}
                    >
                      <input
                        type="radio"
                        className="hidden"
                        checked={checkoutTopic === topic.id}
                        onChange={() => setCheckoutTopic(topic.id)}
                      />
                      <div
                        className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center mr-3 ${checkoutTopic === topic.id ? "border-red-500" : "border-gray-300"}`}
                      >
                        {checkoutTopic === topic.id && (
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 truncate">
                        <p
                          className={`text-sm font-bold truncate ${checkoutTopic === topic.id ? "text-red-900" : "text-gray-700"}`}
                        >
                          {topic.title}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 📸 ส่วนของการแนบรูปภาพ */}
              {currentTopic && currentTopic.photo_mode !== "none" && (
                <div className="p-6">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4">
                    <Camera className="h-5 w-5 text-red-500" />{" "}
                    ถ่ายรูปก่อนออกงาน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    capture={
                      currentTopic.photo_mode === "camera"
                        ? "environment"
                        : undefined
                    }
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  {photoPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="max-h-full object-contain"
                      />
                      <button
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-gray-900/60 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-red-50 hover:bg-red-100 border-2 border-dashed border-red-300 text-red-700 rounded-2xl p-8 flex flex-col items-center justify-center transition-colors"
                    >
                      {currentTopic.photo_mode === "camera" ? (
                        <>
                          <Camera className="w-8 h-8 mb-2" />
                          <span className="font-bold text-sm">
                            กดเพื่อเปิดกล้อง
                          </span>
                        </>
                      ) : (
                        <>
                          <ImagePlus className="w-8 h-8 mb-2" />
                          <span className="font-bold text-sm">
                            กดเพื่อเลือกรูปภาพ
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={handleCheckOut}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-4 rounded-2xl transition-transform active:scale-95 flex justify-center items-center gap-2 shadow-lg shadow-red-200 disabled:opacity-50 disabled:active:scale-100"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      กำลังบันทึกข้อมูล...
                    </div>
                  ) : (
                    <>
                      <LogOut className="h-5 w-5" /> ลงเวลาออกงาน (Check-out)
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            // 🟢 โหมด: ลงเวลาเข้างาน (Check-in) แบบเดิม
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4">
                  <CalendarDays className="h-5 w-5 text-blue-500" />{" "}
                  เลือกหัวข้องานวันนี้
                </label>
                {topics.length === 0 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center flex flex-col items-center">
                    <XCircle className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="font-bold text-gray-600">
                      ไม่มีหัวข้องานที่เปิดอยู่
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
                                ไซต์:{" "}
                                {teamLabels[topic.team_type] || topic.team_type}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {currentTopic && currentTopic.photo_mode !== "none" && (
                <div className="px-6 pb-6">
                  <hr className="border-gray-100 mb-6" />
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4">
                    <Camera className="h-5 w-5 text-blue-500" />{" "}
                    ถ่ายรูปเพื่อยืนยัน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    capture={
                      currentTopic.photo_mode === "camera"
                        ? "environment"
                        : undefined
                    }
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  {photoPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="max-h-full object-contain"
                      />
                      <button
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-gray-900/60 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 text-blue-700 rounded-2xl p-8 flex flex-col items-center justify-center transition-colors"
                    >
                      {currentTopic.photo_mode === "camera" ? (
                        <>
                          <Camera className="w-8 h-8 mb-2" />
                          <span className="font-bold text-sm">
                            กดเพื่อเปิดกล้อง
                          </span>
                        </>
                      ) : (
                        <>
                          <ImagePlus className="w-8 h-8 mb-2" />
                          <span className="font-bold text-sm">
                            กดเพื่อเลือกรูปภาพ / ถ่ายรูป
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={handleCheckIn}
                  disabled={loading || topics.length === 0}
                  className="w-full bg-[#1e293b] hover:bg-black text-white font-bold py-4 px-4 rounded-2xl transition-transform active:scale-95 flex justify-center items-center gap-2 shadow-lg shadow-gray-200 disabled:opacity-50 disabled:active:scale-100"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      กำลังบันทึกข้อมูล...
                    </div>
                  ) : (
                    <>
                      <Navigation className="h-5 w-5" /> ลงเวลาเข้างาน
                      (Check-in)
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-gray-400 mt-3 flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3" /> ระบบจะบันทึกพิกัดปัจจุบันของคุณ
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ประวัติ */}
      {activeTab === "history" && (
        <div className="p-4 md:p-6 max-w-md w-full mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setHistoryFilter("today")}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-xl transition-colors ${historyFilter === "today" ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-600"}`}
            >
              วันนี้
            </button>
            <button
              onClick={() => setHistoryFilter("week")}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-xl transition-colors ${historyFilter === "week" ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-600"}`}
            >
              สัปดาห์นี้
            </button>
            <button
              onClick={() => setHistoryFilter("month")}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-xl transition-colors ${historyFilter === "month" ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-600"}`}
            >
              รอบเงินเดือน
            </button>
            {/* 🌟 เพิ่มปุ่ม "กำหนดเอง" ลงในแถบเมนู */}
            <button
              onClick={() => setHistoryFilter("custom")}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-xl transition-colors ${historyFilter === "custom" ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-600"}`}
            >
              กำหนดเอง
            </button>
          </div>

          {/* 🌟 กล่องเลือกวันที่ จะแสดงเมื่อกดปุ่ม "กำหนดเอง" */}
          {historyFilter === "custom" && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-4 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 font-bold mb-1">
                  ตั้งแต่วันที่
                </p>
                <input
                  type="date"
                  className="w-full text-xs p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-gray-50"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 font-bold mb-1">
                  ถึงวันที่
                </p>
                <input
                  type="date"
                  className="w-full text-xs p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-gray-50"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {loadingHistory ? (
            <div className="py-10 flex flex-col items-center justify-center text-gray-400">
              <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-bold">กำลังโหลดประวัติ...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 text-center">
              <p className="font-bold text-gray-600">ไม่มีประวัติการลงเวลา</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-3 cursor-pointer hover:border-blue-300 transition-colors active:scale-95 group"
                >
                  <div className="flex items-center gap-3">
                    {log.photo_url ? (
                      <img
                        src={log.photo_url}
                        alt="Check-in"
                        className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm mb-1">
                        {log.attendance_topics?.title || "ไม่ทราบหัวข้องาน"}
                      </h3>
                      <div className="text-xs text-gray-500">
                        <CalendarIcon className="w-3 h-3 inline pb-0.5" />{" "}
                        {formatDate(log.check_in_time)}
                      </div>
                    </div>
                  </div>

                  {/* 🌟 เพิ่มปุ่ม "ดูรายละเอียด" ด้านขวาให้เห็นชัดเจนขึ้น */}
                  <div className="text-right shrink-0 flex flex-col items-end justify-center">
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-0.5">
                      เข้า: {formatTime(log.check_in_time)}
                    </p>
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2">
                      ออก:{" "}
                      {log.check_out_time
                        ? formatTime(log.check_out_time)
                        : "ยังไม่ลงชื่อ"}
                    </p>
                    <button className="text-[10px] bg-gray-50 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-700 font-bold px-2.5 py-1 rounded-md border border-gray-200 group-hover:border-blue-200 transition-colors">
                      ดูรายละเอียด
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🌟 โค้ดส่วน Modal (Pop-up) แสดงรายละเอียดการลงเวลา */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <History className="w-5 h-5" /> รายละเอียดการลงเวลา
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-black/20 hover:bg-black/40 p-1.5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar">
              {/* รูปภาพขาเข้า */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500">
                  📸 รูปถ่ายลงชื่อเข้างาน
                </p>
                {selectedLog.photo_url ? (
                  <img
                    src={selectedLog.photo_url}
                    className="w-full rounded-2xl aspect-video object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-full aspect-video bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-center text-gray-400 text-sm font-bold">
                    ไม่มีรูปภาพ
                  </div>
                )}
              </div>

              {/* ข้อมูลเวลา */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1">
                    📍 สถานที่ / หัวข้องาน
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {selectedLog.attendance_topics?.title || "ไม่ทราบหัวข้องาน"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">
                      🟢 เวลาเข้า
                    </p>
                    <p className="text-sm font-bold text-green-600">
                      {formatTime(selectedLog.check_in_time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">
                      🔴 เวลาออก
                    </p>
                    <p className="text-sm font-bold text-red-500">
                      {selectedLog.check_out_time
                        ? formatTime(selectedLog.check_out_time)
                        : "ยังไม่ลงชื่อออก"}
                    </p>
                  </div>
                </div>
              </div>

              {/* ลิงก์แผนที่ (ถ้ามีพิกัด) */}
              {selectedLog.check_in_lat && selectedLog.check_in_lng && (
                <a
                  href={`https://www.google.com/maps?q=${selectedLog.check_in_lat},${selectedLog.check_in_lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 px-4 rounded-xl transition-colors text-sm"
                >
                  <MapPinHouse className="w-4 h-4" /> ดูพิกัดตอนเข้างานบนแผนที่
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
