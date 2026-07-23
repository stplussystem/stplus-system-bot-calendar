"use client";

import { useState, useEffect } from "react";
import liff from "@line/liff";
import { supabase } from "@/lib/supabase";
import {
  MapPin,
  Navigation,
  CheckCircle2,
  Car,
  Loader2,
  FileText,
  History,
  CalendarClock,
  Map,
  X,
  Route,
} from "lucide-react";
import { toast } from "sonner";

export default function TravelTrackerPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🗂️ ระบบ Tab (Track / History)
  const [activeTab, setActiveTab] = useState<"track" | "history">("track");

  // 📍 State สำหรับการ Tracking
  const [isTracking, setIsTracking] = useState(false);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [startLocation, setStartLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [lastLocation, setLastLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null); // สำหรับคำนวณจุดต่อจุด
  const [distance, setDistance] = useState<number>(0);
  const [note, setNote] = useState("");
  const [waypoints, setWaypoints] = useState<any[]>([]);

  // 📜 State สำหรับ History & Modal
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null); // ข้อมูลที่จะโชว์ในป๊อปอัป

  // --- 🌟 เริ่มต้นระบบ (ดึงข้อมูล) ---
  const fetchHistory = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("travel_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("end_time", { ascending: false })
        .limit(10);
      if (data) setHistoryLogs(data);
    } catch (err) {
      console.error("Fetch history error:", err);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
        if (liff.isLoggedIn()) {
          const userProfile = await liff.getProfile();
          setProfile(userProfile);

          fetchHistory(userProfile.userId);

          // เช็คทริปค้าง
          const { data: activeLog } = await supabase
            .from("travel_logs")
            .select("*")
            .eq("user_id", userProfile.userId)
            .eq("status", "tracking")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (activeLog) {
            setActiveLogId(activeLog.id);
            setStartLocation({
              lat: activeLog.start_lat,
              lng: activeLog.start_lng,
            });

            const savedWaypoints = activeLog.waypoints || [];
            setWaypoints(savedWaypoints);
            setDistance(Number(activeLog.distance_km) || 0);

            // คำนวณจุดล่าวุด (เพื่อรอคำนวณระยะกิโลเมตรต่อไป)
            if (savedWaypoints.length > 0) {
              const lastWp = savedWaypoints[savedWaypoints.length - 1];
              setLastLocation({ lat: lastWp.lat, lng: lastWp.lng });
            } else {
              setLastLocation({
                lat: activeLog.start_lat,
                lng: activeLog.start_lng,
              });
            }

            setIsTracking(true);
            setNote(activeLog.note || "");
          }
        } else {
          liff.login();
        }
      } catch (err) {
        console.error("LIFF Init Error:", err);
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  // --- 🧮 สูตรคำนวณระยะทาง ---
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatThaiDateTime = (dateString: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return `${day}/${month}/${d.getFullYear() + 543} ${time} น.`;
  };

  // --- 📍 1. เริ่มเดินทาง ---
  const handleStartTrip = () => {
    if (!note) return toast.warning("กรุณาระบุจุดประสงค์การเดินทางด้วยครับ");
    if (!profile?.userId) return toast.error("ไม่พบข้อมูลผู้ใช้งาน (LINE)");

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          const { data, error } = await supabase
            .from("travel_logs")
            .insert([
              {
                user_id: profile.userId,
                start_lat: lat,
                start_lng: lng,
                start_time: new Date().toISOString(),
                status: "tracking",
                note: note,
                distance_km: 0,
                waypoints: [],
              },
            ])
            .select()
            .single();

          if (error) throw error;

          setActiveLogId(data.id);
          setStartLocation({ lat, lng });
          setLastLocation({ lat, lng });
          setDistance(0);
          setWaypoints([]);
          setIsTracking(true);
          toast.success("เริ่มบันทึกการเดินทางแล้ว!");
        } catch (error: any) {
          console.error("Start Trip Error:", error);
          toast.error("บันทึกไม่สำเร็จ", { description: error.message });
        } finally {
          setLoading(false);
        }
      },
      () => {
        toast.error("กรุณาเปิดสิทธิ์ GPS");
        setLoading(false);
      },
      { enableHighAccuracy: true },
    );
  };

  // --- ⏸️ 2. แวะจุดหมาย (Waypoint) ---
  const handleAddWaypoint = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (lastLocation && activeLogId) {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const distFromLast = calculateDistance(
            lastLocation.lat,
            lastLocation.lng,
            lat,
            lng,
          );
          const newTotalDist = distance + distFromLast;

          const newWaypoint = {
            lat,
            lng,
            added_dist: distFromLast,
            time: new Date().toISOString(),
          };
          const newWaypoints = [...waypoints, newWaypoint];

          try {
            const { error } = await supabase
              .from("travel_logs")
              .update({
                distance_km: newTotalDist,
                waypoints: newWaypoints,
              })
              .eq("id", activeLogId);

            if (error) throw error;

            setDistance(newTotalDist);
            setWaypoints(newWaypoints);
            setLastLocation({ lat, lng });
            toast.success(`แวะจุดหมายสำเร็จ (+${distFromLast.toFixed(2)} กม.)`);
          } catch (error: any) {
            toast.error("บันทึกจุดแวะไม่สำเร็จ", {
              description: error.message,
            });
          }
        }
        setLoading(false);
      },
      () => {
        toast.error("กรุณาเปิดสิทธิ์ GPS");
        setLoading(false);
      },
      { enableHighAccuracy: true },
    );
  };

  // --- 🏁 3. ถึงที่หมาย (Check-out) ---
  const handleEndTrip = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (lastLocation && activeLogId) {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const distFromLast = calculateDistance(
            lastLocation.lat,
            lastLocation.lng,
            lat,
            lng,
          );
          const finalTotalDist = distance + distFromLast;

          try {
            const { error } = await supabase
              .from("travel_logs")
              .update({
                end_lat: lat,
                end_lng: lng,
                distance_km: finalTotalDist,
                end_time: new Date().toISOString(),
                status: "completed",
              })
              .eq("id", activeLogId);

            if (error) throw error;

            toast.success(
              `จบการเดินทาง! รวมระยะทาง: ${finalTotalDist.toFixed(2)} กม.`,
            );

            // รีเซ็ตหน้าจอ & ดึงประวัติใหม่
            setIsTracking(false);
            setActiveLogId(null);
            setNote("");
            setDistance(finalTotalDist);
            fetchHistory(profile.userId);
            setActiveTab("history"); // สลับไปหน้าประวัติให้เลย
          } catch (error: any) {
            toast.error("บันทึกข้อมูลไม่สำเร็จ", {
              description: error.message,
            });
          } finally {
            setLoading(false);
          }
        }
      },
      () => {
        toast.error("ไม่สามารถดึงพิกัดปลายทางได้");
        setLoading(false);
      },
      { enableHighAccuracy: true },
    );
  };

  // --- หน้าจอ Loading ตอนเข้าเว็บ ---
  if (loading && !profile && !isTracking) {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-pink-400" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-50/40 flex flex-col items-center p-4 md:p-6 font-sans pb-32">
      {/* 🗂️ ส่วนหัว & เมนู Tabs */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-pink-100 p-2 mb-6 mt-2 flex gap-2">
        <button
          onClick={() => setActiveTab("track")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === "track" ? "bg-pink-100 text-pink-600" : "text-slate-400 hover:bg-slate-50"}`}
        >
          <Navigation size={18} /> บันทึกเส้นทาง
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === "history" ? "bg-pink-100 text-pink-600" : "text-slate-400 hover:bg-slate-50"}`}
        >
          <History size={18} /> ประวัติการเดินทาง
        </button>
      </div>

      {/* 📍 TAB 1: ระบบ Tracking */}
      {activeTab === "track" && (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-sky-100 p-6 relative overflow-hidden animate-in fade-in slide-in-from-left-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-full -z-10"></div>

          <div className="flex items-center gap-4 mb-6">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${isTracking ? "bg-sky-100 text-sky-600 animate-pulse" : "bg-slate-100 text-slate-400"}`}
            >
              <Car size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                สถานะการเดินทาง
              </p>
              <p
                className={`text-xl font-black ${isTracking ? "text-sky-600" : "text-slate-600"}`}
              >
                {isTracking ? "กำลังเดินทาง..." : "รอเริ่มทริปใหม่"}
              </p>
            </div>
          </div>

          {!isTracking ? (
            <div className="mt-2">
              <label className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                <FileText size={14} /> จุดประสงค์การเดินทาง
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น ไปพบลูกค้าบริษัท A..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100 transition-all"
              />
            </div>
          ) : (
            <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 mt-2 space-y-3">
              <div>
                <p className="text-xs font-bold text-sky-600/70 mb-0.5">
                  ภารกิจ:
                </p>
                <p className="text-sm font-bold text-sky-900">{note}</p>
              </div>
              <div className="flex justify-between items-end border-t border-sky-200/50 pt-3">
                <div>
                  <p className="text-xs font-bold text-sky-600/70">
                    ระยะทางขณะนี้
                  </p>
                  <p className="text-2xl font-black text-sky-700">
                    {distance.toFixed(2)}{" "}
                    <span className="text-sm font-bold">กม.</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-sky-600/70">แวะพัก</p>
                  <p className="text-sm font-bold text-sky-700">
                    {waypoints.length} จุด
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 📜 TAB 2: ประวัติ (History) */}
      {activeTab === "history" && (
        <div className="w-full max-w-md animate-in fade-in slide-in-from-right-4">
          {historyLogs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-10 text-center text-slate-400">
              <Route size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold">ยังไม่มีประวัติการเดินทาง</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)} // กดปุ๊บ เปิด Modal
                  className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:border-pink-300 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 group-hover:text-pink-500 transition-colors">
                      <CalendarClock size={14} />
                      {formatThaiDateTime(log.start_time)}
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-xs font-black border border-emerald-100">
                      {Number(log.distance_km).toFixed(2)} กม.
                    </div>
                  </div>
                  <p className="text-sm font-bold text-slate-700 line-clamp-1">
                    {log.note || "ไม่มีหมายเหตุ"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 🔘 ปุ่ม Action (Fixed Bottom) จะแสดงเฉพาะตอนอยู่ Tab Track */}
      {activeTab === "track" && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/90 to-transparent pb-6 z-10 flex justify-center">
          <div className="w-full max-w-md flex gap-3">
            {!isTracking ? (
              <button
                onClick={handleStartTrip}
                disabled={loading}
                className="w-full bg-sky-400 hover:bg-sky-500 text-white font-bold text-lg py-4 rounded-2xl shadow-[0_8px_30px_rgb(56,189,248,0.3)] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin" /> : <MapPin />}
                เริ่มออกเดินทาง
              </button>
            ) : (
              <>
                <button
                  onClick={handleAddWaypoint}
                  disabled={loading}
                  className="flex-1 bg-orange-400 hover:bg-orange-500 text-white font-bold text-base py-4 rounded-2xl shadow-[0_8px_30px_rgb(251,146,60,0.3)] transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <MapPin size={18} />
                  )}
                  แวะจุดนี้
                </button>
                <button
                  onClick={handleEndTrip}
                  disabled={loading}
                  className="flex-[1.5] bg-pink-400 hover:bg-pink-500 text-white font-bold text-base py-4 rounded-2xl shadow-[0_8px_30px_rgb(244,114,182,0.3)] transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  ถึงที่หมาย (จบ)
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 🔎 Modal ป๊อปอัปดูรายละเอียดทริป */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 pb-0 md:pb-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="bg-pink-50 p-5 flex justify-between items-center border-b border-pink-100">
              <h3 className="font-black text-lg text-pink-700 flex items-center gap-2">
                <Route size={20} /> รายละเอียดการเดินทาง
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 bg-white rounded-full text-pink-400 hover:bg-pink-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">
                  จุดประสงค์
                </p>
                <p className="text-base font-bold text-slate-800">
                  {selectedLog.note}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                    เวลาเริ่ม
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatThaiDateTime(selectedLog.start_time)}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                    เวลาสิ้นสุด
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatThaiDateTime(selectedLog.end_time)}
                  </p>
                </div>
              </div>

              {selectedLog.waypoints && selectedLog.waypoints.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                    จุดแวะพัก ({selectedLog.waypoints.length} จุด)
                  </p>
                  <div className="space-y-2 border-l-2 border-slate-100 ml-2 pl-3">
                    {selectedLog.waypoints.map((wp: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[17px] top-1.5 w-2 h-2 bg-orange-400 rounded-full border-2 border-white"></div>
                        <p className="text-xs font-semibold text-slate-600">
                          แวะจุดที่ {idx + 1}{" "}
                          <span className="text-orange-500 font-black">
                            (+{Number(wp.added_dist).toFixed(2)} กม.)
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatThaiDateTime(wp.time)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex justify-between items-center mt-2">
                <span className="font-bold text-emerald-700 text-sm">
                  ระยะทางรวมทั้งทริป
                </span>
                <span className="text-2xl font-black text-emerald-600">
                  {Number(selectedLog.distance_km).toFixed(2)}{" "}
                  <span className="text-sm">กม.</span>
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-3.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
