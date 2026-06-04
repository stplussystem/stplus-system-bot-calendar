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

  // 🌟 ดึงปีปัจจุบันอัตโนมัติ (เป็นปี พ.ศ.)
  const [currentYear, setCurrentYear] = useState<string>("");

  useEffect(() => {
    // คำนวณปีปัจจุบัน (พ.ศ.)
    const thaiYear = (new Date().getFullYear() + 543).toString();
    setCurrentYear(thaiYear);

    const initLiff = async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: "2010143328-wyg8T4P5" });
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
    if (isLiffInit && currentYear) {
      fetchHolidaysData();
    }
  }, [isLiffInit, currentYear]);

  const fetchHolidaysData = async () => {
    setLoading(true);
    const { data: settingData } = await supabase
      .from("company_settings")
      .select("setting_value")
      .eq("setting_key", "holiday_announcement_url")
      .single();
    if (settingData) setAnnouncementUrl(settingData.setting_value);

    const { data: holidayData } = await supabase
      .from("company_holidays")
      .select("*")
      .eq("year", currentYear)
      .order("date", { ascending: true });

    setHolidays(holidayData || []);
    setLoading(false);
  };

  // 🌟 ฟังก์ชันแปลงวันที่แบบรวบรัด (เช่น "วันอังคาร 3 มีนาคม")
  const getFullThaiDateStr = (dateString: string) => {
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
    return `วัน${days[d.getDay()]} ${parseInt(day)} ${months[parseInt(month) - 1]}`;
  };

  if (!isLiffInit || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-sans">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-gray-500">
          กำลังโหลดข้อมูลวันหยุด...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-10">
      {/* 🌟 1. Header เปลี่ยนเป็นสีน้ำเงินไล่เฉด */}
      <div className="bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] pt-12 pb-16 px-6 text-white text-center rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-90" />
        <h1 className="text-2xl font-black mb-1">ประกาศวันหยุดประจำปี</h1>
        {/* 🌟 2. ปีปัจจุบันอัตโนมัติ */}
        <p className="text-blue-100 text-sm font-medium">
          ST PLUS SYSTEM ปี {currentYear}
        </p>
      </div>

      <div className="px-4 md:px-6 -mt-8 max-w-2xl w-full mx-auto relative z-10 space-y-4">
        {announcementUrl && (
          <a
            href={announcementUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full bg-white shadow-md border border-gray-100 rounded-2xl p-4 flex items-center justify-between group hover:border-blue-300 transition-all active:scale-[0.98]"
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
                  className="p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors"
                >
                  {/* ลำดับตัวเลข */}
                  <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {index + 1}
                  </div>

                  {/* 🌟 3. ข้อมูลเนื้อหาวันหยุด */}
                  <div className="flex-1 flex flex-col">
                    {h.is_changed ? (
                      /* กรณีเลื่อนวันหยุด */
                      <>
                        {/* บรรทัด 1-2 ขีดฆ่า */}
                        <div className="text-xs text-gray-400 line-through font-medium mb-0.5">
                          {getFullThaiDateStr(h.date)}
                        </div>
                        <div className="text-sm font-bold text-gray-400 line-through mb-1.5">
                          {h.title}
                        </div>

                        {/* 🌟 4. บรรทัด 3 แสดงวันที่หยุดใหม่ สีแดง + ปุ่มดูเอกสาร */}
                        <div className="bg-red-50/50 p-2.5 rounded-lg border border-red-100/50 flex flex-col items-start gap-2">
                          <div className="text-[13px] font-black text-red-600 flex items-center gap-1.5 leading-snug">
                            <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                            หยุด เป็นวันที่ {getFullThaiDateStr(
                              h.changed_date,
                            )}{" "}
                            แทน
                          </div>
                          {h.change_document_url && (
                            <a
                              href={h.change_document_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 bg-white border border-red-200 text-red-600 px-2 py-1.5 rounded-md text-[10px] font-bold hover:bg-red-50 transition-colors shadow-sm active:scale-95"
                            >
                              <Eye className="w-3.5 h-3.5" />{" "}
                              ดูเอกสารเปลี่ยนวันหยุด
                            </a>
                          )}
                        </div>
                      </>
                    ) : (
                      /* กรณีวันหยุดปกติ */
                      <>
                        <div className="text-xs text-gray-500 font-medium mb-0.5">
                          {getFullThaiDateStr(h.date)}
                        </div>
                        <div className="text-sm font-bold text-gray-900 leading-relaxed">
                          {h.title}
                        </div>
                      </>
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
