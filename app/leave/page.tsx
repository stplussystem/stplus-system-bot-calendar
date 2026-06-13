"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  CalendarRange,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  PlusCircle,
  ClipboardCheck,
  ChevronLeft,
  CalendarX2,
  Share2,
  Filter,
} from "lucide-react";
import {
  generateLeaveRequestFlex,
  generateLeaveResultFlex,
} from "@/lib/lineFlex";

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

  const [activeTab, setActiveTab] = useState<"my_leave" | "approval">(
    "my_leave",
  );
  const [showForm, setShowForm] = useState(false);
  const [selectedFilterUser, setSelectedFilterUser] = useState("all");

  const currentYear = new Date().getFullYear().toString();
  const currentYearThai = (new Date().getFullYear() + 543).toString();

  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [leaveStats, setLeaveStats] = useState({
    personal: 0,
    sick: 0,
    annual: 0,
    absent: 0,
  });

  const [leaveQuotas, setLeaveQuotas] = useState({
    personal: 6,
    sick: 30,
    annual: 6,
  });

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [allLeaves, setAllLeaves] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    leaveType: "personal",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    isHourly: false,
    startTime: "09:00",
    endTime: "12:00",
    reason: "",
  });

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success" as "success" | "error",
  });
  const [rejectModal, setRejectModal] = useState({
    show: false,
    req: null as any,
    reason: "",
  });
  const [confirmApproveModal, setConfirmApproveModal] = useState({
    show: false,
    req: null as any,
  });
  const [liffAlertModal, setLiffAlertModal] = useState({
    show: false,
    message: "",
  });

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({
          liffId: process.env.NEXT_PUBLIC_LIFF_ID || "2010143328-wyg8T4P5",
        });

        if (liff.isLoggedIn()) {
          const userProfile = await liff.getProfile();
          setProfile(userProfile);

          const { data: user } = await supabase
            .from("users")
            .select("*")
            .eq("line_user_id", userProfile.userId)
            .single();

          setDbUser(
            user || {
              role: "user",
              full_name: userProfile.displayName,
              picture_url: userProfile.pictureUrl,
            },
          );

          const { data: settings } = await supabase
            .from("company_settings")
            .select("personal_leave_quota, sick_leave_quota")
            .limit(1)
            .single();

          setLeaveQuotas({
            personal: settings?.personal_leave_quota || 6,
            sick: settings?.sick_leave_quota || 30,
            annual: user?.annual_leave_quota || 6,
          });

          if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get("tab") === "approval") setActiveTab("approval");
          }
        } else liff.login();
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

  const calculateDuration = () => {
    if (formData.isHourly) {
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

  const formatThaiDateFull = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    const months = [
      "ม.ค.",
      "ก.พ.",
      "มี.ค.",
      "เม.ย.",
      "พ.ค.",
      "มิ.ย.",
      "ก.ค.",
      "ส.ค.",
      "ก.ย.",
      "ต.ค.",
      "พ.ย.",
      "ธ.ค.",
    ];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${parseInt(y) + 543}`;
  };

  const getLeaveTypeName = (type: string) => {
    if (type === "personal") return "ลากิจ";
    if (type === "annual") return "ลาพักร้อน";
    return "ลาป่วย";
  };

  const fetchMyLeaves = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("line_user_id", profile.userId)
      .gte("start_date", `${currentYear}-01-01`)
      .order("created_at", { ascending: false });

    if (data) {
      setMyLeaves(data);
      let p = 0,
        s = 0,
        an = 0,
        ab = 0;
      data
        .filter((l) => l.status === "approved")
        .forEach((l) => {
          if (l.leave_type === "personal") p += l.duration_days;
          if (l.leave_type === "sick") s += l.duration_days;
          if (l.leave_type === "annual") an += l.duration_days;
          if (l.leave_type === "absent") ab += l.duration_days;
        });
      setLeaveStats({ personal: p, sick: s, annual: an, absent: ab });
    }
    setLoading(false);
  };

  const fetchManagerData = async () => {
    const { data: pendingData } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const { data: allData } = await supabase
      .from("leave_requests")
      .select("*")
      .gte("start_date", `${currentYear}-01-01`)
      .order("created_at", { ascending: false });

    const { data: usersData } = await supabase
      .from("users")
      .select("line_user_id, full_name, nickname, picture_url");

    const userMap: Record<string, any> = {};
    if (usersData) usersData.forEach((u) => (userMap[u.line_user_id] = u));

    const mapUsers = (list: any[]) =>
      (list || []).map((item) => ({
        ...item,
        users: userMap[item.line_user_id] || {
          full_name: "ไม่ทราบชื่อ",
          nickname: "",
          picture_url: "",
        },
      }));

    setPendingRequests(mapUsers(pendingData || []));
    setAllLeaves(mapUsers(allData || []));
  };

  const executeShareRequestToManager = async (leaveObj: any) => {
    const liff = (await import("@line/liff")).default;
    if (!liff.isApiAvailable("shareTargetPicker")) {
      setLiffAlertModal({
        show: true,
        message:
          "กรุณาเปิดการตั้งค่า 'Share Target Picker' ในหน้าตั้งค่าของ LINE ก่อนใช้งานฟีเจอร์นี้ครับ",
      });
      return false;
    }

    const leaveTypeName = getLeaveTypeName(leaveObj.leave_type);
    const timeText =
      leaveObj.duration_hours > 0
        ? `${formatThaiDateFull(leaveObj.start_date)} (${leaveObj.start_time.substring(0, 5)}-${leaveObj.end_time.substring(0, 5)})`
        : `${formatThaiDateFull(leaveObj.start_date)} ถึง ${formatThaiDateFull(leaveObj.end_date)}`;

    const flexMessage = generateLeaveRequestFlex(
      dbUser?.full_name || profile.displayName,
      dbUser?.nickname || "",
      dbUser?.picture_url || profile.pictureUrl,
      leaveTypeName,
      timeText,
      leaveObj.reason,
    );

    const shareRes = await liff.shareTargetPicker([flexMessage as any]);
    if (shareRes) {
      showToast("แชร์คำขอให้หัวหน้าเรียบร้อย", "success");
      return true;
    }
    return false;
  };

  const shareApprovalResult = async (
    req: any,
    isApproved: boolean,
    forcedRejectReason?: string,
  ) => {
    const liff = (await import("@line/liff")).default;
    if (!liff.isApiAvailable("shareTargetPicker")) {
      setLiffAlertModal({
        show: true,
        message:
          "กรุณาเปิดการตั้งค่า 'Share Target Picker' ในหน้าตั้งค่าของ LINE ก่อนใช้งานฟีเจอร์นี้ครับ",
      });
      return false;
    }

    const leaveTypeName = getLeaveTypeName(req.leave_type);
    const timeText =
      req.duration_hours > 0
        ? `${formatThaiDateFull(req.start_date)}`
        : `${formatThaiDateFull(req.start_date)} ถึง ${formatThaiDateFull(req.end_date)}`;
    const reasonToUse =
      forcedRejectReason !== undefined
        ? forcedRejectReason
        : req.reject_reason || "";

    const flexMessage = generateLeaveResultFlex(
      req.users?.full_name || "พนักงาน",
      leaveTypeName,
      timeText,
      isApproved,
      reasonToUse,
    );
    await liff.shareTargetPicker([flexMessage as any]);
  };

  const handleSubmitLeave = async () => {
    if (!formData.reason) return showToast("กรุณาระบุเหตุผลการลา", "error");

    const duration = calculateDuration();
    // 🌟 Comment: ปิดการเช็คโควตาไว้ก่อนตามที่ต้องการยังไม่ใช้งาน
    /*
    if (!formData.isHourly) {
        if (formData.leaveType === "personal" && leaveStats.personal + duration.days > leaveQuotas.personal) {
             return showToast(`โควตาลากิจไม่พอ (คงเหลือ ${leaveQuotas.personal - leaveStats.personal} วัน)`, "error");
        }
        if (formData.leaveType === "annual" && leaveStats.annual + duration.days > leaveQuotas.annual) {
            return showToast(`โควตาลาพักร้อนไม่พอ (คงเหลือ ${leaveQuotas.annual - leaveStats.annual} วัน)`, "error");
       }
    }
    */

    setSubmitting(true);
    try {
      const { data: newLeave, error } = await supabase
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

      const liff = (await import("@line/liff")).default;
      if (liff.isInClient()) {
        const timeText = formData.isHourly
          ? `${formatThaiDateFull(formData.startDate)}`
          : `${formatThaiDateFull(formData.startDate)} - ${formatThaiDateFull(formData.endDate)}`;
        await liff.sendMessages([
          {
            type: "text",
            text: `📝 บันทึกคำขออนุมัติลางาน\nวันที่: ${timeText}\nสถานะ: ⏳ รออนุมัติจากหัวหน้า`,
          },
        ]);

        const shared = await executeShareRequestToManager(newLeave);
        if (shared) setTimeout(() => liff.closeWindow(), 1500);
        else {
          setShowForm(false);
          fetchMyLeaves();
        }
      } else {
        showToast("บันทึกคำขอเรียบร้อย", "success");
        setShowForm(false);
        fetchMyLeaves();
      }
    } catch (err: any) {
      showToast("ผิดพลาด: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendShare = async (leaveObj: any) =>
    await executeShareRequestToManager(leaveObj);
  const triggerApprove = (req: any) =>
    setConfirmApproveModal({ show: true, req });
  const executeApprove = async () => {
    const req = confirmApproveModal.req;
    if (!req) return;
    try {
      await supabase
        .from("leave_requests")
        .update({ status: "approved", approver_id: profile.userId })
        .eq("id", req.id);
      showToast("อนุมัติเรียบร้อย!", "success");
      fetchManagerData();
      const liff = (await import("@line/liff")).default;
      if (liff.isInClient()) await shareApprovalResult(req, true);
    } catch (err: any) {
      showToast("ผิดพลาด: " + err.message, "error");
    } finally {
      setConfirmApproveModal({ show: false, req: null });
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
        .eq("id", rejectModal.req.id);
      showToast("ไม่อนุมัติเรียบร้อย", "success");
      fetchManagerData();
      const liff = (await import("@line/liff")).default;
      if (liff.isInClient())
        await shareApprovalResult(rejectModal.req, false, rejectModal.reason);
      setRejectModal({ show: false, req: null, reason: "" });
    } catch (err: any) {
      showToast("ผิดพลาด: " + err.message, "error");
    }
  };

  const uniqueUsersFilter = useMemo(() => {
    const map = new Map();
    allLeaves.forEach((l) => {
      if (l.users && l.line_user_id) map.set(l.line_user_id, l.users.full_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allLeaves]);

  const filteredAllLeaves =
    selectedFilterUser === "all"
      ? allLeaves
      : allLeaves.filter((l) => l.line_user_id === selectedFilterUser);

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

  if (!isLiffInit || loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

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

      {liffAlertModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 animate-in zoom-in-95 text-center">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              แจ้งเตือนระบบ
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {liffAlertModal.message}
            </p>
            <button
              onClick={() => setLiffAlertModal({ show: false, message: "" })}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl shadow-sm hover:bg-black transition-colors"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] pt-12 pb-16 px-6 text-white text-center rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        <CalendarRange className="w-12 h-12 mx-auto mb-3 opacity-90" />
        <h1 className="text-2xl font-black mb-1">ระบบลางาน (Leave)</h1>
        <p className="text-blue-100 text-sm font-medium">
          ST PLUS SYSTEM ปี {currentYearThai}
        </p>
      </div>

      <div className="px-4 md:px-6 -mt-8 max-w-2xl w-full mx-auto relative z-10 space-y-4">
        {(dbUser?.role === "admin" ||
          dbUser?.role === "manager" ||
          dbUser?.role === "hr") &&
          !showForm && (
            <div className="bg-white rounded-full p-1.5 shadow-md border border-gray-100 flex items-center mb-6">
              <button
                onClick={() => setActiveTab("my_leave")}
                className={`flex-1 py-3 rounded-full text-sm font-bold transition-all ${activeTab === "my_leave" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}
              >
                การลาของฉัน
              </button>
              <button
                onClick={() => setActiveTab("approval")}
                className={`flex-1 py-3 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "approval" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}
              >
                อนุมัติวันลา{" "}
                {pendingRequests.length > 0 && (
                  <span className="bg-red-500 text-white w-5 h-5 rounded-full text-[11px] flex items-center justify-center shadow-sm animate-pulse">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            </div>
          )}

        {showForm && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 animate-in fade-in slide-in-from-right-4">
            <button
              onClick={() => setShowForm(false)}
              className="mb-5 flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm w-fit transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> กลับ
            </button>
            <h2 className="text-lg font-black text-gray-800 mb-5 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />{" "}
              ฟอร์มขออนุมัติลางาน
            </h2>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase tracking-wider">
                  ประเภทการลา
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setFormData({ ...formData, leaveType: "personal" })
                    }
                    className={`flex-1 py-3 rounded-xl border-2 text-xs font-bold transition-all ${formData.leaveType === "personal" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  >
                    ลากิจ
                  </button>
                  <button
                    onClick={() =>
                      setFormData({ ...formData, leaveType: "annual" })
                    }
                    className={`flex-1 py-3 rounded-xl border-2 text-xs font-bold transition-all ${formData.leaveType === "annual" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  >
                    พักร้อน
                  </button>
                  <button
                    onClick={() =>
                      setFormData({ ...formData, leaveType: "sick" })
                    }
                    className={`flex-1 py-3 rounded-xl border-2 text-xs font-bold transition-all ${formData.leaveType === "sick" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  >
                    ลาป่วย
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
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
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1.5">
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
                        className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1.5">
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
                          className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1.5">
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
                          className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1.5">
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
                        className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1.5">
                        ถึงวันที่
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        min={formData.startDate}
                        onChange={(e) =>
                          setFormData({ ...formData, endDate: e.target.value })
                        }
                        className="w-full border border-gray-300 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}
                <div className="mt-4 text-xs font-bold text-blue-700 bg-blue-100 p-3 rounded-xl text-center shadow-sm">
                  💡 ระบบคำนวณ:{" "}
                  {formData.isHourly
                    ? `${calculateDuration().hours.toFixed(1)} ชั่วโมง`
                    : `${calculateDuration().days} วัน`}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-2 uppercase tracking-wider">
                  เหตุผลการลา
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  rows={3}
                  placeholder="เช่น ติดธุระครอบครัว, ไปหาหมอ..."
                ></textarea>
              </div>

              <button
                onClick={handleSubmitLeave}
                disabled={submitting}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl flex justify-center items-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send className="w-5 h-5" /> บันทึกและแชร์ให้หัวหน้า
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 🔹 การลางานของฉัน (My Leave) */}
        {activeTab === "my_leave" && !showForm && (
          <div className="space-y-5 animate-in fade-in">
            {/* 🌟 ปรับปรุงการ์ดสรุปวันลาใหม่ (เพิ่มขาดงาน และ Comment Quota) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 border border-gray-100 rounded-3xl p-4 text-center shadow-sm">
                <p className="text-xs font-bold text-gray-500 mb-1">ลากิจ</p>
                <p className="text-xl font-black text-blue-600">
                  {leaveStats.personal}{" "}
                  {/* <span className="text-sm font-medium text-gray-400">/ {leaveQuotas.personal}</span> */}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 font-medium">
                  ใช้ไป (วัน)
                </p>
              </div>
              <div className="bg-purple-50 border border-gray-100 rounded-3xl p-4 text-center shadow-sm">
                <p className="text-xs font-bold text-gray-500 mb-1">พักร้อน</p>
                <p className="text-xl font-black text-purple-600">
                  {leaveStats.annual}{" "}
                  {/* <span className="text-sm font-medium text-gray-400">/ {leaveQuotas.annual}</span> */}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 font-medium">
                  ใช้ไป (วัน)
                </p>
              </div>
              <div className="bg-orange-50 border border-gray-100 rounded-3xl p-4 text-center shadow-sm">
                <p className="text-xs font-bold text-gray-500 mb-1">ลาป่วย</p>
                <p className="text-xl font-black text-orange-600">
                  {leaveStats.sick}{" "}
                  {/* <span className="text-sm font-medium text-gray-400">/ {leaveQuotas.sick}</span> */}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 font-medium">
                  ใช้ไป (วัน)
                </p>
              </div>
              <div className="bg-red-50 border border-gray-100 rounded-3xl p-4 text-center shadow-sm">
                <p className="text-xs font-bold text-gray-500 mb-1">ขาดงาน</p>
                <p className="text-xl font-black text-red-600">
                  {leaveStats.absent}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 font-medium">
                  ครั้ง
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl flex justify-center items-center gap-2 shadow-md hover:bg-blue-700 transition-transform active:scale-95"
            >
              <PlusCircle className="w-5 h-5" /> ยื่นขออนุมัติลางาน
            </button>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 bg-slate-50 border-b border-gray-100">
                <h3 className="font-bold text-sm text-gray-800">
                  ประวัติการลาของฉัน
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {myLeaves.length === 0 ? (
                  <div className="p-10 flex flex-col items-center justify-center text-gray-400">
                    <CalendarX2 className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-xs font-bold">
                      ยังไม่มีประวัติการลาในปีนี้
                    </p>
                  </div>
                ) : (
                  myLeaves.map((l) => (
                    <div
                      key={l.id}
                      className="p-5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-sm text-gray-900">
                          {getLeaveTypeName(l.leave_type)}{" "}
                          {l.duration_hours > 0 ? (
                            <span className="text-blue-600">
                              ({l.duration_hours} ชม.)
                            </span>
                          ) : (
                            <span className="text-blue-600">
                              ({l.duration_days} วัน)
                            </span>
                          )}
                        </div>
                        {getStatusBadge(l.status)}
                      </div>
                      <div className="text-xs text-gray-500 font-medium mb-1.5">
                        📅 {formatThaiDateFull(l.start_date)}{" "}
                        {l.start_date !== l.end_date &&
                          `- ${formatThaiDateFull(l.end_date)}`}{" "}
                        {l.duration_hours > 0 &&
                          `| ${l.start_time.substring(0, 5)} - ${l.end_time.substring(0, 5)}`}
                      </div>
                      <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mt-2 italic">
                        "{l.reason}"
                      </div>
                      {l.status === "pending" && (
                        <div className="mt-3 text-right">
                          <button
                            onClick={() => handleResendShare(l)}
                            className="inline-flex items-center gap-1.5 text-[10px] bg-white text-blue-600 px-3 py-1.5 rounded-lg font-bold border border-blue-200 shadow-sm hover:bg-blue-50 transition-colors"
                          >
                            <Share2 className="w-3 h-3" /> ส่งหัวหน้าอนุมัติ
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 🔹 ศูนย์อนุมัติ (Approval Center) */}
        {activeTab === "approval" && !showForm && (
          <div className="space-y-5 animate-in fade-in">
            {/* ยืนยันอนุมัติลางาน */}
            <div className="bg-white rounded-3xl shadow-sm border border-blue-200 overflow-hidden">
              <div className="p-5 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-sm text-blue-900">
                    รอการพิจารณา
                  </h3>
                </div>
                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {pendingRequests.length} รายการ
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {pendingRequests.length === 0 ? (
                  <div className="p-10 text-center text-sm text-gray-400 font-medium">
                    🎉 ไม่มีรายการรออนุมัติ
                  </div>
                ) : (
                  pendingRequests.map((r) => (
                    <div
                      key={r.id}
                      className="p-5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                          <img
                            src={
                              r.users?.picture_url ||
                              "https://cdn-icons-png.flaticon.com/512/847/847969.png"
                            }
                            alt="profile"
                            className="w-6 h-6 rounded-full border border-gray-200"
                          />
                          {r.users?.full_name ||
                            r.users?.nickname ||
                            "ไม่ทราบชื่อ"}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${r.leave_type === "annual" ? "bg-purple-100 text-purple-700" : r.leave_type === "personal" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}
                        >
                          {getLeaveTypeName(r.leave_type)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mb-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <p className="font-bold mb-1.5 text-gray-800">
                          📅 {formatThaiDateFull(r.start_date)}{" "}
                          {r.start_date !== r.end_date &&
                            `- ${formatThaiDateFull(r.end_date)}`}{" "}
                          {r.duration_hours > 0 ? (
                            <span className="text-blue-600">
                              ({r.duration_hours} ชม.)
                            </span>
                          ) : (
                            <span className="text-blue-600">
                              ({r.duration_days} วัน)
                            </span>
                          )}
                        </p>
                        <p className="text-gray-500 italic">"{r.reason}"</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setRejectModal({ show: true, req: r, reason: "" })
                          }
                          className="flex-1 bg-white border border-red-200 text-red-600 font-bold py-2.5 rounded-xl text-xs hover:bg-red-50 transition-colors"
                        >
                          ไม่อนุมัติ
                        </button>
                        <button
                          onClick={() => triggerApprove(r)}
                          className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-blue-700 shadow-sm transition-colors"
                        >
                          ✅ อนุมัติการลา
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 bg-slate-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-sm text-gray-800">
                  ประวัติการลา (พนักงานทั้งหมด)
                </h3>
                <div className="relative">
                  <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={selectedFilterUser}
                    onChange={(e) => setSelectedFilterUser(e.target.value)}
                    className="w-full sm:w-48 bg-white border border-gray-200 text-xs font-bold text-gray-600 rounded-lg py-2 pl-8 pr-3 outline-none focus:border-blue-500 appearance-none shadow-sm"
                  >
                    <option value="all">พนักงานทุกคน</option>
                    {uniqueUsersFilter.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto custom-scrollbar">
                {filteredAllLeaves.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-400">
                    ไม่พบประวัติการลา
                  </div>
                ) : (
                  filteredAllLeaves.map((l) => (
                    <div
                      key={l.id}
                      className="p-4 flex flex-col gap-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
                          <img
                            src={
                              l.users?.picture_url ||
                              "https://cdn-icons-png.flaticon.com/512/847/847969.png"
                            }
                            alt="profile"
                            className="w-5 h-5 rounded-full"
                          />
                          {l.users?.full_name}
                        </p>
                        {getStatusBadge(l.status)}
                      </div>
                      <div className="flex justify-between items-center pl-7">
                        <p className="text-xs text-gray-500 font-medium">
                          {getLeaveTypeName(l.leave_type)} (
                          {formatThaiDateFull(l.start_date)})
                        </p>
                        {l.status !== "pending" && (
                          <button
                            onClick={() =>
                              shareApprovalResult(l, l.status === "approved")
                            }
                            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-md hover:bg-blue-100 border border-blue-100 transition-colors"
                          >
                            <Share2 className="w-3 h-3" /> แชร์แจ้งพนักงาน
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
