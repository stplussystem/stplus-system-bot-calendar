"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  CalendarDays,
  FileText,
  Eye,
  ArrowRightLeft,
  CalendarX2,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function HolidayPage() {
  const [isLiffInit, setIsLiffInit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [announcementUrl, setAnnouncementUrl] = useState<string | null>(null);

  // ตั้งค่าปีปัจจุบัน (เดี๋ยวอนาคตสามารถทำปุ่มเลือกปีได้)
  const currentYear = "2569";

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: "2010143328-wyg8T4P5" }); // ตรวจสอบ LIFF ID ของหน้า Holiday อีกครั้งนะครับว่าตรงไหม
        if (!liff.isLoggedIn()) {
          liff.login();
        }
      } catch (error) {
        console.error("LIFF Init Error:", error);
      } finally {
        setIsLiffInit(true);
      }
    };
    initLiff();
  }, []);

  useEffect(() => {
    if (isLiffInit) {
      fetchHolidaysData();
    }
  }, [isLiffInit]);

  const fetchHolidaysData = async () => {
    setLoading(true);

    // 1. ดึงข้อมูลลิงก์ประกาศวันหยุดรวม
    const { data: settingData } = await supabase
      .from("company_settings")
      .select("setting_value")
      .eq("setting_key", "holiday_announcement_url")
      .single();

    if (settingData) {
      setAnnouncementUrl(settingData.setting_value);
    }

    // 2. ดึงข้อมูลรายการวันหยุด
    const { data: holidayData } = await supabase
      .from("company_holidays")
      .select("*")
      .eq("year", currentYear)
      .order("date", { ascending: true });

    setHolidays(holidayData || []);
    setLoading(false);
  };

  const formatThaiDateFull = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    const months = [
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ];
    return `${parseInt(day)} ${months[parseInt(month) - 1]}`;
  };

  const getDayName = (dateString: string) => {
    if (!dateString) return "";
    const days = [
      "อาทิตย์",
      "จันทร์",
      "อังคาร",
      "พุธ",
      "พฤหัสบดี",
      "ศุกร์",
      "เสาร์",
    ];
    const d = new Date(dateString);
    return days[d.getDay()];
  };

  if (!isLiffInit || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-sans">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-gray-500">
          กำลังโหลดข้อมูลวันหยุด...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-10">
      {/* 🌟 Header Gradient สวยๆ */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 pt-12 pb-16 px-6 text-white text-center rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-90" />
        <h1 className="text-2xl font-black mb-1">ประกาศวันหยุดประจำปี</h1>
        <p className="text-orange-100 text-sm font-medium">
          ST PLUS SYSTEM ปี {currentYear}
        </p>
      </div>

      <div className="px-4 md:px-6 -mt-8 max-w-2xl w-full mx-auto relative z-10 space-y-4">
        {/* 🌟 ปุ่มดูประกาศรวม (PDF/รูปภาพ) */}
        {announcementUrl && (
          <a
            href={announcementUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full bg-white shadow-md border border-gray-100 rounded-2xl p-4 flex items-center justify-between group hover:border-orange-300 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-900 text-sm">
                  เอกสารประกาศวันหยุด
                </h3>
                <p className="text-[11px] text-gray-500">
                  คลิกเพื่อดูประกาศฉบับเต็มของบริษัท
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
              <Eye className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
            </div>
          </a>
        )}

        {/* 🌟 ตารางวันหยุด */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {holidays.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-gray-400">
              <CalendarX2 className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm font-bold">ยังไม่มีประกาศวันหยุดในปีนี้</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {holidays.map((h, index) => (
                <div
                  key={h.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-orange-50/30 transition-colors"
                >
                  {/* ลำดับ และ วันที่ */}
                  <div className="flex items-start gap-4 sm:w-1/3 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <div>
                      {/* ถ้ามีการเลื่อน ให้ขีดฆ่าวันเดิม แล้วโชว์วันใหม่ */}
                      {h.is_changed ? (
                        <>
                          <div className="text-[10px] text-gray-400 line-through mb-0.5">
                            วัน{getDayName(h.date)}ที่{" "}
                            {formatThaiDateFull(h.date)}
                          </div>
                          <div className="text-sm font-black text-red-600 flex items-center gap-1.5">
                            วัน{getDayName(h.changed_date)}{" "}
                            <ArrowRightLeft className="w-3 h-3" />
                          </div>
                          <div className="text-sm font-black text-red-600">
                            {formatThaiDateFull(h.changed_date)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-[11px] text-gray-500 font-medium mb-0.5">
                            วัน{getDayName(h.date)}
                          </div>
                          <div className="text-sm font-bold text-gray-900">
                            {formatThaiDateFull(h.date)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ชื่อวันหยุด และ เอกสารการเลื่อน */}
                  <div className="flex-1 pl-10 sm:pl-0">
                    <p
                      className={`text-sm font-bold leading-relaxed ${h.is_changed ? "text-gray-600" : "text-gray-800"}`}
                    >
                      {h.title}
                    </p>

                    {/* ปุ่มดูหลักฐานการเลื่อน */}
                    {h.is_changed && h.change_document_url && (
                      <a
                        href={h.change_document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" /> ดูเอกสารเปลี่ยนแปลง
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center pb-6 pt-2">
          <p className="text-[11px] text-gray-400 font-medium">
            หมายเหตุ: อาจมีการเปลี่ยนแปลงวันหยุดตามความเหมาะสม
            <br />
            ระบบจะแจ้งให้ทราบหากมีการเปลี่ยนแปลง
          </p>
        </div>
      </div>
    </div>
  );
}
