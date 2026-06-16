"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import imageCompression from "browser-image-compression";
import Select, { components } from "react-select"; // 🌟 Import react-select
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
  Search,
  Star,
  Map,
  Users,
} from "lucide-react";

import ProfileSettings from "@/components/ProfileSettings";

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

const getThaiShiftName = (shiftStr: string) => {
  if (!shiftStr) return "-";
  const s = shiftStr.toLowerCase();
  if (s === "morning") return "เช้า";
  if (s === "afternoon") return "บ่าย";
  if (s === "custom") return "เวลาพิเศษ";
  return shiftStr;
};

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371e3;
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

// 🌟 Component สร้างตัวเลือก (Option) ที่มีรูปโปรไฟล์และชื่อ
const AttendeeCustomOption = (props: any) => {
  return (
    <components.Option {...props}>
      <div className="flex items-center gap-3">
        {props.data.value === "all" ? (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Users size={16} />
          </div>
        ) : (
          <img
            src={
              props.data.image ||
              "https://cdn-icons-png.flaticon.com/512/847/847969.png"
            }
            alt="profile"
            className="w-8 h-8 rounded-full border border-gray-200 object-cover shrink-0"
          />
        )}
        <span className="text-sm font-bold text-gray-800">
          {props.data.label}
        </span>
      </div>
    </components.Option>
  );
};

export default function CheckinPage() {
  const [activeTab, setActiveTab] = useState<
    "checkin" | "history" | "force_checkout"
  >("checkin");
  const [isLiffInit, setIsLiffInit] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const [dbUser, setDbUser] = useState<any>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

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
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const [historyUsers, setHistoryUsers] = useState<any[]>([]);
  const [selectedHistoryUser, setSelectedHistoryUser] = useState("all");

  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [checkpointTab, setCheckpointTab] = useState<"search" | "favorites">(
    "search",
  );
  const [favorites, setFavorites] = useState<any[]>([]);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const [cpData, setCpData] = useState({
    title: "",
    lat: 0,
    lng: 0,
    saveFavorite: false,
  });

  const [pendingCheckouts, setPendingCheckouts] = useState<any[]>([]);
  const [showForceModal, setShowForceModal] = useState({
    show: false,
    log: null as any,
  });

  useEffect(() => {
    if (!window.google && GOOGLE_MAPS_API_KEY) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      document.body.appendChild(script);
      script.onload = () => setGoogleMapsLoaded(true);
    } else if (window.google) setGoogleMapsLoaded(true);

    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "history" || params.get("action") === "history")
      setActiveTab("history");
    if (params.get("tab") === "profile" || params.get("action") === "profile")
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

          const { data: userData } = await supabase
            .from("users")
            .select("*")
            .eq("line_user_id", profile.userId)
            .single();
          let currentUser = userData;

          if (!currentUser) {
            const { data: newUser } = await supabase
              .from("users")
              .insert([
                {
                  line_user_id: profile.userId,
                  display_name: profile.displayName,
                  picture_url: profile.pictureUrl,
                  is_active: false,
                },
              ])
              .select()
              .single();
            currentUser = newUser;
          }
          setDbUser(currentUser || {});

          const hasName =
            currentUser?.full_name && currentUser.full_name.trim() !== "";
          const hasNick =
            currentUser?.nickname && currentUser.nickname.trim() !== "";
          if (!hasName || !hasNick) {
            setIsNewUser(true);
            return;
          }
          if (currentUser.is_active === false) {
            setIsPendingApproval(true);
            return;
          }

          setIsNewUser(false);
          setIsPendingApproval(false);
        } else liff.login();
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

  const canForceCheckout = ["admin", "manager", "it"].includes(dbUser?.role);
  const isManagerView = ["admin", "manager", "hr"].includes(dbUser?.role);

  const fetchHistoryUsers = async () => {
    const { data } = await supabase
      .from("users")
      .select("line_user_id, full_name, nickname, picture_url")
      .order("full_name");
    if (data) setHistoryUsers(data);
  };

  useEffect(() => {
    if (isLiffInit && userProfile && !isNewUser && !isPendingApproval) {
      if (activeTab === "checkin") {
        checkTodayStatus();
        fetchActiveTopics();
        fetchFavorites();
        if (navigator.geolocation)
          navigator.geolocation.getCurrentPosition(
            () => {},
            () => {},
            { enableHighAccuracy: true, maximumAge: 0 },
          );
      } else if (activeTab === "force_checkout") {
        fetchPendingCheckouts();
      } else {
        if (isManagerView && historyUsers.length === 0) {
          fetchHistoryUsers();
        }
        fetchHistory();
      }
    }
  }, [
    activeTab,
    historyFilter,
    customStartDate,
    customEndDate,
    selectedHistoryUser,
    isLiffInit,
    userProfile,
    isNewUser,
    isPendingApproval,
  ]);

  useEffect(() => {
    if (
      showCheckpointModal &&
      checkpointTab === "search" &&
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
          setCpData((prev) => ({
            ...prev,
            title:
              place.name ||
              place.formatted_address ||
              "จุดแวะ (ไม่ได้ระบุชื่อ)",
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          }));
        }
      });
    }
  }, [showCheckpointModal, checkpointTab, googleMapsLoaded]);

  const fetchPendingCheckouts = async () => {
    if (!canForceCheckout) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    const { data } = await supabase
      .from("attendance_logs")
      .select(
        `*, users (full_name, nickname, picture_url), attendance_topics (title, shift_type, start_time)`,
      )
      .is("check_out_time", null)
      .gte("check_in_time", yesterday.toISOString())
      .order("check_in_time", { ascending: true });

    if (data) {
      const now = new Date();
      const filteredData = data.filter((log) => {
        let sH = 9,
          sM = 0;
        const shiftType = getThaiShiftName(
          log.shift || log.attendance_topics?.shift_type || "",
        );

        if (shiftType === "เช้า") {
          sH = 9;
          sM = 0;
        } else if (shiftType === "บ่าย") {
          sH = 13;
          sM = 0;
        } else if (
          shiftType.includes("พิเศษ") ||
          shiftType.includes("custom")
        ) {
          const startTimeStr = log.attendance_topics?.start_time;
          if (startTimeStr) {
            const parts = startTimeStr.split(":").map(Number);
            sH = parts[0];
            sM = parts[1];
          }
        }

        let expectedStart = new Date(log.check_in_time);
        expectedStart.setHours(sH, sM, 0, 0);

        if (
          expectedStart > new Date(log.check_in_time) &&
          expectedStart.getTime() - new Date(log.check_in_time).getTime() >
            12 * 3600000
        ) {
          expectedStart.setDate(expectedStart.getDate() - 1);
        }
        if (
          new Date(log.check_in_time) > expectedStart &&
          new Date(log.check_in_time).getTime() - expectedStart.getTime() >
            12 * 3600000
        ) {
          expectedStart.setDate(expectedStart.getDate() + 1);
        }

        const otLimit = new Date(expectedStart.getTime() + 9 * 3600000);

        return now >= otLimit;
      });
      setPendingCheckouts(filteredData);
    }
  };

  const executeForceCheckout = async (type: "now" | "9hours") => {
    const log = showForceModal.log;
    if (!log) return;
    setLoading(true);
    let outTime = new Date().toISOString();

    if (type === "9hours") {
      let sH = 9,
        sM = 0;
      const shiftType = getThaiShiftName(
        log.shift || log.attendance_topics?.shift_type || "",
      );
      if (shiftType === "เช้า") {
        sH = 9;
        sM = 0;
      } else if (shiftType === "บ่าย") {
        sH = 13;
        sM = 0;
      } else if (shiftType.includes("พิเศษ") || shiftType.includes("custom")) {
        const startTimeStr = log.attendance_topics?.start_time;
        if (startTimeStr) {
          const parts = startTimeStr.split(":").map(Number);
          sH = parts[0];
          sM = parts[1];
        }
      }

      let expectedStart = new Date(log.check_in_time);
      expectedStart.setHours(sH, sM, 0, 0);

      if (
        expectedStart > new Date(log.check_in_time) &&
        expectedStart.getTime() - new Date(log.check_in_time).getTime() >
          12 * 3600000
      ) {
        expectedStart.setDate(expectedStart.getDate() - 1);
      }
      if (
        new Date(log.check_in_time) > expectedStart &&
        new Date(log.check_in_time).getTime() - expectedStart.getTime() >
          12 * 3600000
      ) {
        expectedStart.setDate(expectedStart.getDate() + 1);
      }

      const otLimit = new Date(expectedStart.getTime() + 9 * 3600000);
      outTime = otLimit.toISOString();
    }

    const { error } = await supabase
      .from("attendance_logs")
      .update({
        check_out_time: outTime,
        status: "checked_out",
      })
      .eq("id", log.id);

    if (error) showToast(error.message, "error");
    else {
      showToast("บังคับลงเวลาออกให้พนักงานสำเร็จ!", "success");
      fetchPendingCheckouts();
    }
    setShowForceModal({ show: false, log: null });
    setLoading(false);
  };

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  const fetchFavorites = async () => {
    const { data } = await supabase
      .from("saved_locations")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setFavorites(data || []);
  };

  const checkTodayStatus = async () => {
    setIsCheckingStatus(true);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const startOfDayStr = `${y}-${m}-${d}T00:00:00+07:00`;
    const endOfDayStr = `${y}-${m}-${d}T23:59:59+07:00`;

    const { data } = await supabase
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
    } else setTodayLog(null);
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
      const visibleTopics = data.filter((t) => {
        if (t.team_type === "office" || t.team_type === "team_all") return true;
        if (!t.allowed_users || t.allowed_users.length === 0) return true;
        if (t.allowed_users && Array.isArray(t.allowed_users))
          return t.allowed_users.includes(userProfile?.userId);
        return false;
      });
      setTopics(visibleTopics);
      if (
        !selectedTopic ||
        !visibleTopics.find((t) => t.id === selectedTopic)
      ) {
        if (visibleTopics.length > 0) setSelectedTopic(visibleTopics[0].id);
      }
    } else setTopics([]);
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
    if (uploadError)
      throw new Error(`อัพรูปล้มเหลว! กรุณาตรวจสอบสิทธิ์ของ Supabase Storage`);
    return supabase.storage.from("attendance_photos").getPublicUrl(fileName)
      .data.publicUrl;
  };

  const submitCheckpoint = async () => {
    if (!cpData.title || cpData.lat === 0 || cpData.lng === 0)
      return showToast(
        "กรุณาค้นหาและเลือกสถานที่จากแผนที่ หรือ สถานที่ประจำ",
        "error",
      );
    setLoading(true);
    try {
      if (cpData.saveFavorite) {
        const { data: existingFav } = await supabase
          .from("saved_locations")
          .select("id")
          .eq("title", cpData.title);
        if (existingFav && existingFav.length > 0)
          showToast("มีสถานที่ชื่อนี้ในระบบแล้ว จะใช้ข้อมูลเดิมครับ", "error");
        else {
          await supabase.from("saved_locations").insert([
            {
              user_id: userProfile.userId,
              title: cpData.title,
              lat: cpData.lat,
              lng: cpData.lng,
            },
          ]);
          fetchFavorites();
        }
      }
      const { error } = await supabase.from("attendance_checkpoints").insert([
        {
          log_id: todayLog.id,
          lat: cpData.lat,
          lng: cpData.lng,
          note: `แวะจุด: ${cpData.title}`,
        },
      ]);
      if (error) throw error;
      showToast("บันทึกจุด Checkpoint เรียบร้อย!", "success");
      setShowCheckpointModal(false);
      setCpData({ title: "", lat: 0, lng: 0, saveFavorite: false });
      const liff = (await import("@line/liff")).default;
      if (liff.isInClient()) {
        await liff.sendMessages([
          { type: "text", text: `📍 แวะ Checkpoint: ${cpData.title}` },
        ]);
        liff.closeWindow();
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
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
          const accuracy = position.coords.accuracy;
          if (accuracy > 150)
            throw new Error(
              `สัญญาณ GPS ยังไม่เสถียร (คลาดเคลื่อน ${Math.ceil(accuracy)}ม.)`,
            );
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
              const distanceText =
                distance < 1000
                  ? `${Math.ceil(distance)} เมตร`
                  : `${(distance / 1000).toFixed(2)} กิโลเมตร`;
              throw new Error(
                `ไม่สามารถลงเวลาได้! คุณอยู่นอกสถานที่ทำงาน ${distanceText} (กำหนดไว้ ${selectedTopicData.radius_meters} ม.)`,
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
      () => {
        showToast("ไม่สามารถดึงตำแหน่ง GPS ได้ กรุณาเปิด Location", "error");
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
          const accuracy = position.coords.accuracy;
          if (accuracy > 150)
            throw new Error(
              `สัญญาณ GPS ยังไม่เสถียร (คลาดเคลื่อน ${Math.ceil(accuracy)}ม.)`,
            );
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
            if (distance > finalTopicData.radius_meters)
              throw new Error(
                `ไม่อนุญาตให้ลงเวลา! ห่าง ${Math.ceil(distance)} ม.`,
              );
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
            } else setTimeout(() => setActiveTab("history"), 1500);
          } catch (liffError) {
            setTimeout(() => setActiveTab("history"), 1500);
          }
        } catch (err: any) {
          showToast(err.message, "error");
        } finally {
          setLoading(false);
        }
      },
      () => {
        showToast("ไม่สามารถดึงตำแหน่ง GPS ได้ กรุณาเปิด Location", "error");
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

    // 🌟 1. ดึงรายชื่อพนักงานมาเตรียมไว้ก่อน (แก้ปัญหา DB Join Error)
    let currentUsers = historyUsers;
    if (isManagerView && currentUsers.length === 0) {
      const { data: uData } = await supabase
        .from("users")
        .select("line_user_id, full_name, nickname, picture_url");
      if (uData) {
        currentUsers = uData;
        setHistoryUsers(uData);
      }
    }

    // 🌟 2. ดึงประวัติการลงเวลา (ไม่มีการ JOIN users)
    let query = supabase
      .from("attendance_logs")
      .select(
        `*, attendance_topics ( title, team_type ), attendance_checkpoints ( * )`,
      )
      .gte("check_in_time", startStr)
      .lte("check_in_time", endStr)
      .order("check_in_time", { ascending: false });

    // 🌟 3. กรองสิทธิ์การดูข้อมูล
    if (isManagerView) {
      if (selectedHistoryUser !== "all")
        query = query.eq("user_id", selectedHistoryUser);
    } else {
      query = query.eq("user_id", userProfile?.userId);
    }

    const { data } = await query;

    // 🌟 4. ประกอบร่างรายชื่อพนักงานเข้ากับประวัติ (Manual Join)
    if (data) {
      const mappedLogs = data.map((log) => {
        const matchUser = currentUsers.find(
          (u) => u.line_user_id === log.user_id,
        );
        return {
          ...log,
          users: matchUser || null,
        };
      });
      setLogs(mappedLogs);
    } else {
      setLogs([]);
    }

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

  // 🌟 ฟอร์แมตรายชื่อเพื่อใช้กับ React-Select
  const userOptions = [
    { value: "all", label: "แสดงทั้งหมด", image: null },
    ...historyUsers.map((u) => ({
      value: u.line_user_id,
      label: `${u.full_name || "ไม่ระบุชื่อ"} ${u.nickname ? `(${u.nickname})` : ""}`,
      image: u.picture_url,
    })),
  ];

  const selectedOption =
    userOptions.find((o) => o.value === selectedHistoryUser) || userOptions[0];

  if (!isLiffInit)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-sans">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-gray-500">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  if (isNewUser || showProfileSettings)
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center p-4 font-sans">
        <ProfileSettings
          profile={userProfile}
          dbUser={dbUser}
          isNewUser={isNewUser}
          setShowProfileSettings={setShowProfileSettings}
          supabase={supabase}
          onSaveSuccess={(updated: any) => {
            setDbUser(updated);
            setIsNewUser(false);
            setShowProfileSettings(false);
            if (updated.is_active === false) setIsPendingApproval(true);
          }}
        />
      </div>
    );
  if (isPendingApproval)
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center p-4 font-sans">
        <div className="w-full max-w-lg mt-[15vh] bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-10 text-center animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-orange-100 shadow-sm">
            <Clock className="w-12 h-12 text-orange-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-3">
            รอการอนุมัติ
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto mb-8">
            ข้อมูลถูกบันทึกแล้ว
            กรุณารอผู้ดูแลระบบตรวจสอบและเปิดสิทธิ์การใช้งานครับ
          </p>
        </div>
      </div>
    );

  const currentTopic = todayLog
    ? topics.find((t) => t.id === checkoutTopic) || todayLog.attendance_topics
    : topics.find((t) => t.id === selectedTopic);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans pb-10">
      {toast.show && (
        <div
          className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[60] flex items-start gap-3 border shadow-[0_8px_30px_rgb(0,0,0,0.12)] px-4 py-4 rounded-2xl animate-in slide-in-from-top-5 fade-in duration-300 ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
          )}
          <p className="text-sm font-bold leading-relaxed">{toast.message}</p>
        </div>
      )}

      {/* 🌟 Modal บังคับออกงานของ Admin */}
      {showForceModal.show && showForceModal.log && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-black text-gray-900 text-center mb-2">
              บังคับลงชื่อออก (Force Checkout)
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              คุณต้องการบังคับให้พนักงานคนนี้ลงเวลาออกงานเป็นเวลาใด?
            </p>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6 flex items-center gap-3">
              <img
                src={showForceModal.log.users?.picture_url}
                className="w-12 h-12 rounded-full"
                alt="profile"
              />
              <div>
                <p className="font-bold text-gray-800 text-sm">
                  {showForceModal.log.users?.full_name}
                </p>
                <p className="text-xs text-gray-500">
                  เข้างาน: {formatTime(showForceModal.log.check_in_time)}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => executeForceCheckout("9hours")}
                disabled={loading}
                className="w-full bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 font-bold py-3.5 rounded-xl transition-colors"
              >
                1. ออกงานอัตโนมัติ 9 ชม. นับจากกะ (ไม่ต้องมี OT)
              </button>
              <button
                onClick={() => executeForceCheckout("now")}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-sm transition-colors"
              >
                2. ออกงาน ณ เวลาปัจจุบัน (มี OT)
              </button>
              <button
                onClick={() => setShowForceModal({ show: false, log: null })}
                disabled={loading}
                className="w-full bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl transition-colors mt-2"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {showCheckpointModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in sm:items-center sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <MapPinHouse className="w-5 h-5 text-blue-500" /> แวะจุด
                Checkpoint
              </h3>
              <button
                onClick={() => setShowCheckpointModal(false)}
                className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex px-4 pt-3 gap-2 bg-white sticky top-[65px] z-10">
              <button
                onClick={() => setCheckpointTab("search")}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${checkpointTab === "search" ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                <Search className="w-3.5 h-3.5 inline mr-1" /> ค้นหาแผนที่
              </button>
              <button
                onClick={() => setCheckpointTab("favorites")}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${checkpointTab === "favorites" ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                <Star className="w-3.5 h-3.5 inline mr-1" /> สถานที่ประจำ
              </button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-gray-50">
              {checkpointTab === "search" ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                  <div className="relative">
                    <Map className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      ref={autocompleteInputRef}
                      placeholder="พิมพ์ชื่อสถานที่เพื่อค้นหา..."
                      className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-gray-900 opacity-100 [-webkit-text-fill-color:#111827] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                      onChange={() => setSelectedFavId("")}
                    />
                  </div>
                  {cpData.title && (
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-gray-500 mb-0.5">
                          พิกัดที่เลือก
                        </p>
                        <p className="text-sm font-bold text-blue-900 leading-snug">
                          {cpData.title}
                        </p>
                      </div>
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm font-bold text-orange-600 bg-orange-50 p-3 rounded-xl border border-orange-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cpData.saveFavorite}
                      onChange={(e) =>
                        setCpData({ ...cpData, saveFavorite: e.target.checked })
                      }
                      className="w-4 h-4 accent-orange-600"
                    />
                    <Star className="w-4 h-4" /> บันทึกเป็นสถานที่ประจำ
                    (ครั้งหน้าไม่ต้องค้นหา)
                  </label>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in slide-in-from-left-4">
                  {favorites.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                      <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-bold">ยังไม่มีสถานที่ประจำ</p>
                    </div>
                  ) : (
                    favorites.map((fav) => (
                      <button
                        key={fav.id}
                        onClick={() =>
                          setCpData({
                            title: fav.title,
                            lat: fav.lat,
                            lng: fav.lng,
                            saveFavorite: false,
                          })
                        }
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${cpData.title === fav.title ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-200"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cpData.title === fav.title ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-500"}`}
                          >
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <p
                              className={`text-sm font-bold ${cpData.title === fav.title ? "text-blue-900" : "text-gray-800"}`}
                            >
                              {fav.title}
                            </p>
                          </div>
                        </div>
                        {cpData.title === fav.title && (
                          <CheckCircle2 className="w-5 h-5 text-blue-500" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0 z-10">
              <button
                onClick={submitCheckpoint}
                disabled={loading || !cpData.title}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-transform active:scale-95 shadow-sm disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <MapPinHouse className="w-5 h-5" /> ยืนยันบันทึกจุด
                    Checkpoint
                  </>
                )}
              </button>
            </div>
          </div>
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

        {/* 🌟 Tab เมนูด้านบน */}
        <div className="flex">
          <button
            onClick={() => setActiveTab("checkin")}
            className={`flex-1 py-4 text-xs font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${activeTab === "checkin" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
          >
            <MapPin className="w-4 h-4" /> ลงเวลาทำงาน
          </button>

          {/* 🌟 Tab ใหม่สำหรับจัดการออกงาน (เห็นเฉพาะ Role ที่ได้รับสิทธิ์) */}
          {canForceCheckout && (
            <button
              onClick={() => setActiveTab("force_checkout")}
              className={`relative flex-1 py-4 text-xs font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${activeTab === "force_checkout" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
            >
              <Users className="w-4 h-4" /> จัดการออกงาน
              {pendingCheckouts.length > 0 && (
                <span className="absolute top-2.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white animate-pulse shadow-sm border border-white">
                  {pendingCheckouts.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-4 text-xs font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
          >
            <History className="w-4 h-4" /> ประวัติ
          </button>
        </div>
      </div>

      {/* 🌟 TAB 1.5: จัดการออกงาน (Force Checkout) */}
      {activeTab === "force_checkout" && (
        <div className="p-4 md:p-6 max-w-md w-full mx-auto animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-orange-900 text-sm">
                พนักงานที่ลืมลงเวลาออก
              </h3>
              <p className="text-xs text-orange-700 mt-1">
                ใช้สิทธิ์แอดมิน
                เพื่อบังคับลงเวลาออกงานให้กับพนักงานที่ไม่ได้เช็คเอาท์ในระบบ
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {pendingCheckouts.length === 0 ? (
              <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
                <CheckCircle2 className="w-12 h-12 text-green-400 mb-2" />
                <p className="font-bold text-gray-600">ไม่มีพนักงานตกค้าง</p>
              </div>
            ) : (
              pendingCheckouts.map((log) => (
                <div
                  key={log.id}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        log.users?.picture_url ||
                        "https://cdn-icons-png.flaticon.com/512/847/847969.png"
                      }
                      alt="profile"
                      className="w-10 h-10 rounded-full border border-gray-100 object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-900">
                        {log.users?.full_name || "พนักงาน"}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">
                        📍 {log.attendance_topics?.title || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <div className="text-xs font-bold text-gray-500">
                      เข้างาน:{" "}
                      <span className="text-green-600">
                        {formatTime(log.check_in_time)}
                      </span>
                      <br />
                      <span className="text-[10px] font-medium">
                        {formatDate(log.check_in_time)}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowForceModal({ show: true, log })}
                      className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                      บังคับออกงาน
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 1: ลงเวลา */}
      {activeTab === "checkin" && (
        <div className="p-4 md:p-6 max-w-md w-full mx-auto animate-in fade-in slide-in-from-left-4 duration-300">
          {isCheckingStatus ? (
            <div className="py-10 flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : todayLog ? (
            <div className="bg-white rounded-3xl shadow-sm border border-red-100 overflow-hidden ring-1 ring-red-50">
              <div className="bg-red-50 p-6 border-b border-red-100 flex flex-col items-center text-center relative overflow-hidden">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-red-500 relative z-10">
                  <Clock className="w-8 h-8" />
                </div>
                <h2 className="text-red-800 font-bold text-lg relative z-10">
                  กำลังปฏิบัติงาน
                </h2>
                <div className="mt-4 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-red-100 text-sm font-bold text-gray-700 shadow-sm relative z-10">
                  เข้างานเวลา:{" "}
                  <span className="text-red-600">
                    {formatTime(todayLog.check_in_time)}
                  </span>
                </div>
              </div>

              <div className="p-5 bg-blue-50 border-b border-blue-100">
                <button
                  onClick={() => setShowCheckpointModal(true)}
                  className="w-full bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-600 hover:text-white font-bold py-3.5 px-4 rounded-2xl transition-all active:scale-95 flex justify-center items-center gap-2 shadow-sm"
                >
                  <MapPinHouse className="h-5 w-5" /> 📍 แวะจุด Checkpoint
                  ระหว่างวัน
                </button>
                <p className="text-center text-[10px] text-blue-600/70 mt-2 font-bold">
                  * ใช้สำหรับแวะไซต์งานหรือจุดตรวจสอบ โดยไม่ต้องลงชื่อออกงาน
                </p>
              </div>

              <div className="p-6 pb-2 border-b border-gray-100">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3">
                  <LogOut className="h-5 w-5 text-red-500" />{" "}
                  เลือกสถานที่จบงานวันนี้
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
                                ทีม :{" "}
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

      {/* TAB 3: ประวัติ */}
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
            <button
              onClick={() => setHistoryFilter("custom")}
              className={`flex-1 text-xs font-bold py-2 px-3 rounded-xl transition-colors ${historyFilter === "custom" ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-600"}`}
            >
              กำหนดเอง
            </button>
          </div>

          {/* 🌟 1. แทรก Dropdown ด้วย react-select (เฉพาะ Role: Manager, Admin, HR) */}
          {isManagerView && (
            <div className="mb-4 animate-in fade-in relative z-50">
              <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 gap-2">
                <Users size={18} className="text-blue-500" /> ค้นหาพนักงาน
              </label>
              <Select
                options={userOptions}
                value={selectedOption}
                onChange={(selected: any) =>
                  setSelectedHistoryUser(selected.value)
                }
                components={{ Option: AttendeeCustomOption }}
                placeholder="ค้นหาพนักงาน..."
                styles={{
                  control: (base) => ({
                    ...base,
                    padding: "4px",
                    borderRadius: "0.75rem",
                    borderColor: "#e2e8f0",
                    backgroundColor: "#f8fafc",
                    boxShadow: "none",
                  }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 9999,
                    borderRadius: "0.75rem",
                    overflow: "hidden",
                  }),
                }}
              />
            </div>
          )}

          {historyFilter === "custom" && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-4 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 font-bold mb-1">
                  ตั้งแต่วันที่
                </p>
                <input
                  type="date"
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-gray-50 text-gray-900 opacity-100 [-webkit-text-fill-color:#111827]"
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
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-gray-50 text-gray-900 opacity-100 [-webkit-text-fill-color:#111827]"
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
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-3 cursor-pointer hover:border-blue-300 transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {log.photo_url ? (
                      <img
                        src={log.photo_url}
                        alt="Check-in"
                        className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {/* 🌟 แสดงชื่อพนักงานด้วย หากอยู่ในโหมดแสดงทั้งหมด */}
                      {isManagerView && selectedHistoryUser === "all" && (
                        <p className="text-[10px] font-bold text-blue-600 truncate mb-0.5">
                          {log.users?.full_name}
                        </p>
                      )}
                      <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">
                        {log.attendance_topics?.title || "ไม่ทราบหัวข้องาน"}
                      </h3>
                      <div className="text-xs text-gray-500 mb-1.5">
                        <CalendarIcon className="w-3 h-3 inline pb-0.5" />{" "}
                        {formatDate(log.check_in_time)}
                      </div>
                      {log.attendance_checkpoints &&
                        log.attendance_checkpoints.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 w-fit">
                            <MapPin className="w-3 h-3 shrink-0 text-blue-500" />
                            <span className="truncate max-w-[130px] sm:max-w-[180px]">
                              แวะ {log.attendance_checkpoints.length} จุด:{" "}
                              {log.attendance_checkpoints
                                .map((cp: any) =>
                                  cp.note
                                    ? cp.note.replace("แวะจุด: ", "")
                                    : "จุดแวะ",
                                )
                                .join(", ")}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end justify-center">
                    <p className="text-[10px] font-bold text-green-600 uppercase mb-0.5">
                      เข้า: {formatTime(log.check_in_time)}
                    </p>
                    <p className="text-[10px] font-bold text-red-500 uppercase mb-2">
                      ออก:{" "}
                      {log.check_out_time
                        ? formatTime(log.check_out_time)
                        : "ยังไม่ลงชื่อ"}
                    </p>
                    <button className="text-[10px] bg-gray-50 text-gray-500 hover:bg-gray-100 font-bold px-2.5 py-1 rounded-md border border-gray-200 transition-colors">
                      ดูรายละเอียด
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal รายละเอียดประวัติ (คงเดิม) */}
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
              <div className="bg-slate-50 rounded-2xl p-4 border border-gray-100 space-y-4 shadow-inner">
                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-500 mb-0.5 flex items-center gap-1">
                    📍 หัวข้องาน
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {selectedLog.attendance_topics?.title || "-"}
                  </p>
                </div>
                <div className="space-y-3">
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
    </div>
  );
}
