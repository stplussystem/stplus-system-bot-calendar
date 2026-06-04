"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  CalendarDays,
  CalendarRange,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Send,
  PlusCircle,
  LayoutDashboard,
  ClipboardCheck,
  ChevronLeft,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function LeavePage() {
  const [isLiffInit, setIsLiffInit] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // === State การนำทาง ===
  const [activeTab, setActiveTab] = useState<"my_leave" | "approval">(
    "my_leave",
  );
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // === State ข้อมูลพนักงาน ===
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [leaveStats, setLeaveStats] = useState({
    personal: 0,
    sick: 0,
    absent: 0,
  });

  // === State ข้อมูลหัวหน้า/HR ===
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [rejectModal, setRejectModal] = useState({
    show: false,
    id: "",
    reason: "",
  });

  // === State ฟอร์มลางาน ===
  const [formData, setFormData] = useState({
    leaveType: "personal",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    isHourly: false,
    startTime: "09:00",
    endTime: "12:00",
    reason: "",
  });

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: "2010143328-wyg8T4P5" }); // เช็ค LIFF ID หน้านี้อีกทีนะครับ
        if (liff.isLoggedIn()) {
          const userProfile = await liff.getProfile();
          setProfile(userProfile);

          // ดึง Role ของ User
          const { data: user } = await supabase
            .from("users")
            .select("*")
            .eq("line_user_id", userProfile.userId)
            .single();
          setDbUser(
            user || { role: "user", full_name: userProfile.displayName },
          );
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
  }, []);

  useEffect(() => {
    if (isLiffInit && profile) {
      fetchMyLeaves();
      if (
        dbUser?.role === "admin" ||
        dbUser?.role === "manager" ||
        dbUser?.role === "hr"
      ) {
        fetchManagerData();
      }
    }
  }, [isLiffInit, profile, dbUser, activeTab]);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  // ==========================================
  // ส่วนของพนักงาน (พนักงานทั่วไป)
  // ==========================================
  const fetchMyLeaves = async () => {
    setLoading(true);
    const yearPrefix = new Date().getFullYear().toString(); // ดึงของปีปัจจุบัน
    const { data } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("line_user_id", profile.userId)
      .gte("start_date", `${yearPrefix}-01-01`)
      .order("created_at", { ascending: false });

    if (data) {
      setMyLeaves(data);
      // คำนวณสถิติ (เฉพาะที่อนุมัติแล้ว)
      let p = 0,
        s = 0,
        a = 0;
      data
        .filter((l) => l.status === "approved")
        .forEach((l) => {
          if (l.leave_type === "personal") p += l.duration_days;
          if (l.leave_type === "sick") s += l.duration_days;
          if (l.leave_type === "absent") a += l.duration_days;
        });
      setLeaveStats({ personal: p, sick: s, absent: a });
    }
    setLoading(false);
  };

  const calculateDuration = () => {
    if (formData.isHourly) {
      // คำนวณชั่วโมงคร่าวๆ
      const start = new Date(`2000-01-01T${formData.startTime}`);
      const end = new Date(`2000-01-01T${formData.endTime}`);
      let diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return { days: 0, hours: diffHours > 0 ? diffHours : 0 };
    } else {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return { days: diffDays, hours: 0 };
    }
  };

  const handleSubmitLeave = async () => {
    if (!formData.reason) return showToast("กรุณาระบุเหตุผลการลา", "error");
    setSubmitting(true);
    try {
      const duration = calculateDuration();

      // 1. บันทึกลง Supabase (สถานะ pending)
      const { data: insertData, error } = await supabase
        .from("leave_requests")
        .insert([
          {
            line_user_id: profile.userId,
            leave_type: formData.leaveType,
            start_date: formData.startDate,
            end_date: formData.endDate,
            start_time: formData.isHourly ? formData.startTime : null,
            end_time: formData.isHourly ? formData.endTime : null,
            duration_days: duration.days,
            duration_hours: duration.hours,
            reason: formData.reason,
            status: "pending",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // 2. ลอจิกส่งข้อความ (COMBO: ส่งให้ตัวเอง + เปิด Share Target Picker ให้หัวหน้า)
      const liff = (await import("@line/liff")).default;
      if (liff.isInClient()) {
        const leaveTypeName =
          formData.leaveType === "personal" ? "ลากิจ" : "ลาป่วย";
        const timeText = formData.isHourly
          ? `${formData.startDate} (${formData.startTime}-${formData.endTime})`
          : `${formData.startDate} ถึง ${formData.endDate}`;

        // ข้อความสรุปส่งให้ตัวเอง
        await liff.sendMessages([
          {
            type: "text",
            text: `📝 บันทึกคำขออนุมัติลางาน\nประเภท: ${leaveTypeName}\nวันที่: ${timeText}\nสถานะ: ⏳ รออนุมัติจากหัวหน้า`,
          },
        ]);

        // Flex Message ส่งให้หัวหน้า (Share Target Picker)
        const flexMessage = {
          type: "flex",
          altText: `แจ้งเตือน: ${dbUser.full_name} ขออนุมัติลางาน`,
          contents: {
            type: "bubble",
            header: {
              type: "box",
              layout: "vertical",
              backgroundColor: "#1e3a8a",
              contents: [
                {
                  type: "text",
                  text: "🔔 ขออนุมัติลางาน",
                  weight: "bold",
                  color: "#ffffff",
                  size: "lg",
                },
              ],
            },
            body: {
              type: "box",
              layout: "vertical",
              spacing: "md",
              contents: [
                {
                  type: "text",
                  text: `พนักงาน: ${dbUser.full_name}`,
                  weight: "bold",
                  size: "md",
                },
                {
                  type: "text",
                  text: `ประเภท: ${leaveTypeName}`,
                  size: "sm",
                  color: "#666666",
                },
                {
                  type: "text",
                  text: `วันที่: ${timeText}`,
                  size: "sm",
                  color: "#666666",
                },
                {
                  type: "text",
                  text: `เหตุผล: ${formData.reason}`,
                  size: "sm",
                  color: "#666666",
                  wrap: true,
                },
              ],
            },
            footer: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  color: "#f97316",
                  action: {
                    type: "uri",
                    label: "พิจารณาอนุมัติ",
                    uri: "https://liff.line.me/2010143328-wyg8T4P5/leave",
                  },
                },
              ],
            },
          },
        };

        if (liff.isApiAvailable("shareTargetPicker")) {
          await liff.shareTargetPicker([flexMessage as any]);
        }

        showToast("ส่งคำขอเรียบร้อย ระบบจะปิดหน้าต่าง", "success");
        setTimeout(() => liff.closeWindow(), 1500);
      } else {
        showToast("ส่งคำขอเรียบร้อย (คุณไม่ได้เปิดใน LINE)", "success");
        setShowForm(false);
        fetchMyLeaves();
      }
    } catch (err: any) {
      showToast("เกิดข้อผิดพลาด: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // ส่วนของหัวหน้า / HR (In-App Approval)
  // ==========================================
  const fetchManagerData = async () => {
    // โหลดรายการรออนุมัติทั้งหมด (ดึงชื่อจากตาราง users มาแสดงด้วย)
    const { data: pending } = await supabase
      .from("leave_requests")
      .select("*, users(full_name, nickname)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setPendingRequests(pending || []);

    // โหลดประวัติการลาทั้งหมดของปีนี้ (เพื่อดูสรุป)
    const yearPrefix = new Date().getFullYear().toString();
    const { data: all } = await supabase
      .from("leave_requests")
      .select("*, users(full_name)")
      .gte("start_date", `${yearPrefix}-01-01`)
      .order("created_at", { ascending: false });
    setAllLeaves(all || []);
  };

  const handleApprove = async (id: string) => {
    if (!window.confirm("ยืนยันการอนุมัติลางาน?")) return;
    try {
      await supabase
        .from("leave_requests")
        .update({ status: "approved", approver_id: profile.userId })
        .eq("id", id);
      showToast("อนุมัติเรียบร้อย!", "success");
      fetchManagerData();
    } catch (err: any) {
      showToast("ผิดพลาด: " + err.message, "error");
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal.reason) return showToast("กรุณาระบุเหตุผล", "error");
    try {
      await supabase
        .from("leave_requests")
        .update({
          status: "rejected",
          reject_reason: rejectModal.reason,
          approver_id: profile.userId,
        })
        .eq("id", rejectModal.id);
      showToast("ไม่อนุมัติเรียบร้อย", "success");
      setRejectModal({ show: false, id: "", reason: "" });
      fetchManagerData();
    } catch (err: any) {
      showToast("ผิดพลาด: " + err.message, "error");
    }
  };

  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${parseInt(d)}/${parseInt(m)}/${parseInt(y) + 543}`;
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved")
      return (
        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold">
          ✅ อนุมัติแล้ว
        </span>
      );
    if (status === "rejected")
      return (
        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-[10px] font-bold">
          ❌ ไม่อนุมัติ
        </span>
      );
    return (
      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md text-[10px] font-bold">
        ⏳ รอตรวจสอบ
      </span>
    );
  };

  if (!isLiffInit || loading)
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20">
      {toast.show && (
        <div
          className={`fixed top-4 left-4 right-4 md:w-96 z-[60] flex items-start gap-3 border shadow-2xl px-4 py-4 rounded-2xl animate-in slide-in-from-top-5 fade-in duration-300 ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
          )}
          <p className="text-sm font-bold leading-relaxed">{toast.message}</p>
        </div>
      )}

      {/* Modal ปฏิเสธการลา */}
      {rejectModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="text-lg font-bold text-red-600 mb-2">
              ไม่อนุมัติการลางาน
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              กรุณาระบุเหตุผลเพื่อให้พนักงานทราบ
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) =>
                setRejectModal({ ...rejectModal, reason: e.target.value })
              }
              className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none mb-4"
              rows={3}
              placeholder="เช่น งานโปรเจกต์กำลังเร่งด่วน..."
            ></textarea>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setRejectModal({ show: false, id: "", reason: "" })
                }
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRejectSubmit}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl text-sm"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Header */}
      <div className="bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] pt-10 pb-6 px-6 text-white text-center rounded-b-[30px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        <h1 className="text-xl font-black mb-1 flex justify-center items-center gap-2">
          <CalendarRange className="w-6 h-6" /> ระบบลางาน (Leave)
        </h1>
        <p className="text-blue-100 text-xs font-medium">ST PLUS SYSTEM</p>
      </div>

      {/* 🌟 Tab Menu (ถ้าเป็น Admin/Manager ถึงจะเห็น Tab 2) */}
      {(dbUser?.role === "admin" ||
        dbUser?.role === "manager" ||
        dbUser?.role === "hr") &&
        !showForm && (
          <div className="flex justify-center mt-4 px-4">
            <div className="flex bg-white rounded-full p-1 shadow-sm border border-gray-200 w-full max-w-sm">
              <button
                onClick={() => setActiveTab("my_leave")}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${activeTab === "my_leave" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
              >
                การลาของฉัน
              </button>
              <button
                onClick={() => setActiveView("approval")}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === "approval" ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"}`}
              >
                อนุมัติวันลา{" "}
                {pendingRequests.length > 0 && (
                  <span className="bg-red-500 text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

      <div className="px-4 md:px-6 mt-4 max-w-2xl w-full mx-auto relative z-10 space-y-4">
        {/* ========================================== */}
        {/* VIEW 1: ฟอร์มยื่นลางาน */}
        {/* ========================================== */}
        {showForm && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 animate-in slide-in-from-right-4">
            <button
              onClick={() => setShowForm(false)}
              className="mb-4 flex items-center gap-1 text-sm font-bold text-gray-500 bg-white px-3 py-1.5 rounded-full border shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" /> กลับ
            </button>
            <h2 className="text-lg font-black text-gray-800 mb-4 border-b pb-3">
              ฟอร์มขออนุมัติลางาน
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-2">
                  ประเภทการลา
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setFormData({ ...formData, leaveType: "personal" })
                    }
                    className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${formData.leaveType === "personal" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}`}
                  >
                    ลากิจ
                  </button>
                  <button
                    onClick={() =>
                      setFormData({ ...formData, leaveType: "sick" })
                    }
                    className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${formData.leaveType === "sick" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-500"}`}
                  >
                    ลาป่วย
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-center justify-between text-sm font-bold text-gray-800 cursor-pointer mb-4">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" /> ระบุเป็นเวลา
                    (ลาชั่วโมง)
                  </span>
                  <input
                    type="checkbox"
                    checked={formData.isHourly}
                    onChange={(e) =>
                      setFormData({ ...formData, isHourly: e.target.checked })
                    }
                    className="w-4 h-4 accent-blue-600"
                  />
                </label>

                {formData.isHourly ? (
                  <div className="space-y-3 animate-in fade-in">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">
                        วันที่ต้องการลา
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            startDate: e.target.value,
                            endDate: e.target.value,
                          })
                        }
                        className="w-full border p-2.5 rounded-lg text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">
                          ตั้งแต่เวลา
                        </label>
                        <input
                          type="time"
                          value={formData.startTime}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              startTime: e.target.value,
                            })
                          }
                          className="w-full border p-2.5 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">
                          ถึงเวลา
                        </label>
                        <input
                          type="time"
                          value={formData.endTime}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              endTime: e.target.value,
                            })
                          }
                          className="w-full border p-2.5 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">
                        ตั้งแต่วันที่
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            startDate: e.target.value,
                          })
                        }
                        className="w-full border p-2.5 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">
                        ถึงวันที่
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        min={formData.startDate}
                        onChange={(e) =>
                          setFormData({ ...formData, endDate: e.target.value })
                        }
                        className="w-full border p-2.5 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}
                <div className="mt-3 text-[11px] font-bold text-blue-600 bg-blue-100 p-2 rounded-lg text-center">
                  💡 ระบบคำนวณ:{" "}
                  {formData.isHourly
                    ? `${calculateDuration().hours.toFixed(1)} ชั่วโมง`
                    : `${calculateDuration().days} วัน`}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-2">
                  เหตุผลการลา
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:border-blue-500"
                  rows={3}
                  placeholder="เช่น ติดธุระครอบครัว, ไปหาหมอ..."
                ></textarea>
              </div>

              <button
                onClick={handleSubmitLeave}
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 shadow-md"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> บันทึกและส่งให้หัวหน้า
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW 2: แดชบอร์ดของพนักงาน (My Leave) */}
        {/* ========================================== */}
        {activeTab === "my_leave" && !showForm && (
          <div className="space-y-4 animate-in fade-in">
            {/* สรุปโควต้า */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white border border-blue-100 rounded-2xl p-3 text-center shadow-sm">
                <p className="text-[10px] font-bold text-gray-500 mb-1">
                  ลากิจ
                </p>
                <p className="text-xl font-black text-blue-600">
                  {leaveStats.personal}
                </p>
                <p className="text-[9px] text-gray-400 mt-1">ใช้ไป (วัน)</p>
              </div>
              <div className="bg-white border border-orange-100 rounded-2xl p-3 text-center shadow-sm">
                <p className="text-[10px] font-bold text-gray-500 mb-1">
                  ลาป่วย
                </p>
                <p className="text-xl font-black text-orange-600">
                  {leaveStats.sick}
                </p>
                <p className="text-[9px] text-gray-400 mt-1">ใช้ไป (วัน)</p>
              </div>
              <div className="bg-white border border-red-100 rounded-2xl p-3 text-center shadow-sm">
                <p className="text-[10px] font-bold text-gray-500 mb-1">
                  ขาดงาน
                </p>
                <p className="text-xl font-black text-red-600">
                  {leaveStats.absent}
                </p>
                <p className="text-[9px] text-gray-400 mt-1">ครั้ง</p>
              </div>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex justify-center items-center gap-2 shadow-lg hover:bg-black transition-transform active:scale-95"
            >
              <PlusCircle className="w-5 h-5" /> ยื่นขออนุมัติลางาน
            </button>

            {/* ประวัติการลา */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-gray-100">
                <h3 className="font-bold text-sm text-gray-800">
                  ประวัติการลาของฉัน
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {myLeaves.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    ยังไม่มีประวัติการลาในปีนี้
                  </div>
                ) : (
                  myLeaves.map((l) => (
                    <div key={l.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-sm text-gray-900">
                          {l.leave_type === "personal" ? "ลากิจ" : "ลาป่วย"}{" "}
                          {l.duration_hours > 0
                            ? `(${l.duration_hours} ชม.)`
                            : `(${l.duration_days} วัน)`}
                        </div>
                        {getStatusBadge(l.status)}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        📅 {formatThaiDate(l.start_date)}{" "}
                        {l.start_date !== l.end_date &&
                          `- ${formatThaiDate(l.end_date)}`}{" "}
                        {l.duration_hours > 0 &&
                          `| ${l.start_time.substring(0, 5)} - ${l.end_time.substring(0, 5)}`}
                      </div>
                      <div className="text-[11px] text-gray-400 bg-gray-50 p-2 rounded-lg border border-gray-100 mt-2">
                        "{l.reason}"
                      </div>
                      {l.status === "rejected" && l.reject_reason && (
                        <div className="text-[10px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 mt-1">
                          <b>เหตุผลไม่อนุมัติ:</b> {l.reject_reason}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW 3: แดชบอร์ดของหัวหน้า (Approval Center) */}
        {/* ========================================== */}
        {activeTab === "approval" && !showForm && (
          <div className="space-y-4 animate-in fade-in">
            {/* รายการรออนุมัติ */}
            <div className="bg-white rounded-3xl shadow-sm border border-blue-100 overflow-hidden">
              <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-blue-900">
                  รอการพิจารณา ({pendingRequests.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {pendingRequests.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400">
                    ไม่มีรายการรออนุมัติ
                  </div>
                ) : (
                  pendingRequests.map((r) => (
                    <div key={r.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                          <User className="w-4 h-4 text-gray-400" />{" "}
                          {r.users?.full_name ||
                            r.users?.nickname ||
                            "ไม่ทราบชื่อ"}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-md ${r.leave_type === "personal" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}
                        >
                          {r.leave_type === "personal" ? "ลากิจ" : "ลาป่วย"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mb-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <p className="font-bold mb-1">
                          📅 {formatThaiDate(r.start_date)}{" "}
                          {r.start_date !== r.end_date &&
                            `- ${formatThaiDate(r.end_date)}`}{" "}
                          {r.duration_hours > 0
                            ? `(${r.duration_hours} ชม.)`
                            : `(${r.duration_days} วัน)`}
                        </p>
                        <p className="text-gray-500 italic">"{r.reason}"</p>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() =>
                            setRejectModal({ show: true, id: r.id, reason: "" })
                          }
                          className="flex-1 bg-white border border-red-200 text-red-600 font-bold py-2 rounded-xl text-xs hover:bg-red-50"
                        >
                          ไม่อนุมัติ
                        </button>
                        <button
                          onClick={() => handleApprove(r.id)}
                          className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl text-xs hover:bg-blue-700 shadow-sm"
                        >
                          อนุมัติการลา
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* รายการประวัติพนักงานทั้งหมด */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden opacity-80">
              <div className="p-4 bg-slate-50 border-b border-gray-100">
                <h3 className="font-bold text-sm text-gray-800">
                  ประวัติการลาทั้งหมด (ปีนี้)
                </h3>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto custom-scrollbar">
                {allLeaves.map((l) => (
                  <div
                    key={l.id}
                    className="p-3 text-xs flex justify-between items-center hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-bold text-gray-800">
                        {l.users?.full_name}
                      </p>
                      <p className="text-gray-500">
                        {l.leave_type === "personal" ? "ลากิจ" : "ลาป่วย"}{" "}
                        {formatThaiDate(l.start_date)}
                      </p>
                    </div>
                    {getStatusBadge(l.status)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
