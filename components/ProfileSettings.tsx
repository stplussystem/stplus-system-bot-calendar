"use client";

import { useState } from "react";
import {
  User,
  Mail,
  Calendar,
  Copy,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface ProfileSettingsProps {
  profile: any;
  dbUser: any;
  isNewUser: boolean;
  setShowProfileSettings: (val: boolean) => void;
  onSaveSuccess: (updatedUser: any) => void;
  supabase: any;
}

export default function ProfileSettings({
  profile,
  dbUser,
  isNewUser,
  setShowProfileSettings,
  onSaveSuccess,
  supabase,
}: ProfileSettingsProps) {
  const [regFullName, setRegFullName] = useState(dbUser?.full_name || "");
  const [regNickname, setRegNickname] = useState(dbUser?.nickname || "");
  const [regGmail, setRegGmail] = useState(dbUser?.gmail || "");
  const [regCalendarId, setRegCalendarId] = useState(
    dbUser?.personal_calendar_id || "",
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleSaveProfile = async () => {
    if (!regFullName || !regNickname) {
      return toast.warning("กรุณากรอก ชื่อ-สกุล และ ชื่อเล่นให้ครบถ้วนครับ");
    }
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: regFullName,
          nickname: regNickname,
          gmail: regGmail,
          personal_calendar_id: regCalendarId,
        })
        .eq("line_user_id", profile.userId);

      if (error) throw error;

      toast.success("บันทึกโปรไฟล์สำเร็จ!");
      onSaveSuccess({
        ...dbUser,
        full_name: regFullName,
        nickname: regNickname,
        gmail: regGmail,
        personal_calendar_id: regCalendarId,
      });
    } catch (error: any) {
      toast.error("บันทึกไม่สำเร็จ", { description: error.message });
    }
    setIsSavingProfile(false);
  };

  return (
    <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl overflow-hidden mt-4 animate-in fade-in zoom-in-95">
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-8 flex justify-between items-center text-white">
        <div>
          <h2 className="text-2xl font-bold">
            {isNewUser ? "ลงทะเบียนผู้ใช้งาน" : "ตั้งค่าโปรไฟล์"}
          </h2>
          <p className="text-slate-300 text-sm mt-1">
            กรุณากรอกข้อมูลเพื่อใช้งานระบบ STPLUS
          </p>
        </div>
        {!isNewUser && (
          <button
            onClick={() => setShowProfileSettings(false)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <X size={24} />
          </button>
        )}
      </div>
      <div className="p-8 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <User size={16} /> ชื่อ-สกุล (จริง)
            </label>
            <input
              type="text"
              value={regFullName}
              onChange={(e) => setRegFullName(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              placeholder="เช่น สมชาย ใจดี"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <User size={16} /> ชื่อเล่น
            </label>
            <input
              type="text"
              value={regNickname}
              onChange={(e) => setRegNickname(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              placeholder="เช่น ชาย"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Mail size={16} /> Gmail
          </label>
          <input
            type="email"
            value={regGmail}
            onChange={(e) => setRegGmail(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            placeholder="แนะนำให้ระบุ xxx@gmail.com เพื่อรับ Calendar"
          />
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
            <Calendar size={16} /> นำ Gmail หรือ Calendar ID ส่วนตัวมาใส่
            (ไม่บังคับ)
          </label>
          <input
            type="text"
            value={regCalendarId}
            onChange={(e) => setRegCalendarId(e.target.value)}
            className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl outline-none text-sm"
            placeholder="abc@gmail.com หรือ abcdef123...@group.calendar.google.com"
          />

          <div className="mt-3 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              * นำ Gmail หรือ Calendar ID ส่วนตัวมาใส่เพื่อแยกคิวงานเฉพาะตัว
              แล้ว Copy Email bot ด้านล่างไปใส่ใน Shared with ใน Google Calendar
              และอย่าลืมกดแชร์สิทธิ์แบบแก้ไข (Make changes to events)
              ให้บัญชีบริการบอทด้วยนะครับ
            </p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  "calendar-bot@line-calendar-bot-496903.iam.gserviceaccount.com",
                );
                toast.success("ก๊อปปี้อีเมลบอทสำเร็จ!", {
                  description: "นำไปกดแชร์ใน Google Calendar ได้เลยครับ",
                });
              }}
              className="w-full py-2.5 text-sm font-bold bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-200 transition"
            >
              <Copy size={16} /> กดเพื่อ Copy อีเมลบอท
            </button>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={isSavingProfile}
          className="w-full py-4 mt-2 bg-slate-800 text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-slate-900 transition"
        >
          {isSavingProfile ? (
            <Loader2 className="animate-spin" />
          ) : (
            <CheckCircle2 />
          )}{" "}
          บันทึกข้อมูล
        </button>
      </div>
    </div>
  );
}
