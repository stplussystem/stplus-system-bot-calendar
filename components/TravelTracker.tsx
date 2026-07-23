"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  CheckCircle2,
  Car,
  Map,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function TravelTracker() {
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startLocation, setStartLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [distance, setDistance] = useState<number>(0);

  // 🧮 สูตรคำนวณระยะทางจากละติจูด/ลองจิจูด (Haversine Formula) เป็นกิโลเมตร
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371; // รัศมีโลก (กิโลเมตร)
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

  // 📍 เริ่มการเดินทาง (Check-in)
  const handleStartTrip = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      toast.error("อุปกรณ์ของคุณไม่รองรับ GPS");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStartLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsTracking(true);
        setLoading(false);
        toast.success("เริ่มบันทึกการเดินทางแล้ว!");
      },
      (error) => {
        toast.error("ไม่สามารถดึงพิกัดได้ กรุณาเปิด GPS");
        setLoading(false);
      },
      { enableHighAccuracy: true },
    );
  };

  // 🏁 ถึงที่หมาย (Check-out)
  const handleEndTrip = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (startLocation) {
          const traveled = calculateDistance(
            startLocation.lat,
            startLocation.lng,
            position.coords.latitude,
            position.coords.longitude,
          );
          setDistance(traveled);
          setIsTracking(false);
          setLoading(false);
          toast.success(`ถึงที่หมายแล้ว! ระยะทาง: ${traveled.toFixed(2)} กม.`);

          // TODO: ตรงนี้เดี๋ยวเราเอาไว้ใส่คำสั่งบันทึกลง Supabase ครับ
        }
      },
      (error) => {
        toast.error("ไม่สามารถดึงพิกัดปลายทางได้");
        setLoading(false);
      },
      { enableHighAccuracy: true },
    );
  };

  return (
    <div className="min-h-screen bg-pink-50/30 flex flex-col items-center p-6 font-sans">
      {/* Header สไตล์ Pastel */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-pink-100 p-6 mb-6 mt-4 text-center">
        <div className="w-16 h-16 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Car size={32} />
        </div>
        <h1 className="text-2xl font-black text-slate-700">บันทึกการเดินทาง</h1>
        <p className="text-slate-400 text-sm mt-1">
          ระบบติดตามระยะทางอัตโนมัติ (PWA)
        </p>
      </div>

      {/* Card แสดงสถานะ */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-sky-100 p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-full -z-10"></div>

        <div className="flex items-center gap-4 mb-6">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isTracking ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-400"}`}
          >
            <Navigation
              size={24}
              className={isTracking ? "animate-pulse" : ""}
            />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              สถานะปัจจุบัน
            </p>
            <p
              className={`text-lg font-bold ${isTracking ? "text-sky-600" : "text-slate-600"}`}
            >
              {isTracking ? "กำลังเดินทาง..." : "รอการเริ่มต้น"}
            </p>
          </div>
        </div>

        {distance > 0 && !isTracking && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex justify-between items-center animate-in fade-in zoom-in">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-200 text-emerald-700 p-2 rounded-full">
                <CheckCircle2 size={20} />
              </div>
              <span className="font-bold text-emerald-800 text-sm">
                ระยะทางรวม
              </span>
            </div>
            <span className="text-2xl font-black text-emerald-600">
              {distance.toFixed(2)}{" "}
              <span className="text-sm font-bold">กม.</span>
            </span>
          </div>
        )}
      </div>

      {/* ปุ่มกด Action ขนาดใหญ่ (Mobile-Friendly) */}
      <div className="w-full max-w-md mt-auto mb-10">
        {!isTracking ? (
          <button
            onClick={handleStartTrip}
            disabled={loading}
            className="w-full bg-sky-400 hover:bg-sky-500 text-white font-bold text-lg py-5 rounded-3xl shadow-lg shadow-sky-200 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" /> : <MapPin />}
            เริ่มออกเดินทาง
          </button>
        ) : (
          <button
            onClick={handleEndTrip}
            disabled={loading}
            className="w-full bg-pink-400 hover:bg-pink-500 text-white font-bold text-lg py-5 rounded-3xl shadow-lg shadow-pink-200 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            ถึงที่หมาย (Check-out)
          </button>
        )}
      </div>
    </div>
  );
}
