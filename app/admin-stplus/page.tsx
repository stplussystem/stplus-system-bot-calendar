"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Users,
  CalendarRange,
  Clock,
  UserCog,
  LogOut,
  Search,
  FileSpreadsheet,
  ShieldAlert,
  Edit,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Menu,
  Activity,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState<
    "employees" | "attendance" | "leaves" | "profile" | "admins"
  >("attendance");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // --- Data States ---
  const [employees, setEmployees] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]); // 🌟 เพิ่ม state เก็บหัวข้องาน
  const [logs, setLogs] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);

  // --- Filter States (Attendance) ---
  const [filterAtt, setFilterAtt] = useState({
    userId: "", // 🌟 เปลี่ยนจากการพิมพ์ search เป็น userId
    topic: "",
    startDate: "",
    endDate: "",
    shift: "",
  });

  // --- Profile & Admin Management States ---
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    password: "",
  });
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({
    id: "",
    username: "",
    password: "",
    full_name: "",
    role: "admin",
  });

  // --- Employee Quota Management States ---
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empForm, setEmpForm] = useState({
    id: "",
    full_name: "",
    annual_leave_quota: 6,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const showToastMsg = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3000,
    );
  };

  const checkAuth = async () => {
    const isAuth = localStorage.getItem("stplus_admin_auth");
    const username = localStorage.getItem("stplus_admin_user");
    if (!isAuth || !username) {
      window.location.href = "/admin-login";
      return;
    }
    const { data } = await supabase
      .from("admin_users")
      .select("*")
      .eq("username", username)
      .maybeSingle();
    if (data) {
      setAdminUser(data);
      setProfileForm({
        full_name: data.full_name || "",
        password: data.password,
      });
      fetchAllData();
    } else {
      handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("stplus_admin_auth");
    localStorage.removeItem("stplus_admin_user");
    window.location.href = "/admin-login";
  };

  // 🌟 ดึงข้อมูลแบบ Manual Mapping (แก้ปัญหาข้อมูลไม่ขึ้น)
  const fetchAllData = async () => {
    setLoading(true);

    // 1. ดึงข้อมูลพนักงาน
    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .order("full_name");
    if (usersData) setEmployees(usersData);

    // 2. ดึงข้อมูลหัวข้องาน
    const { data: topicsData } = await supabase
      .from("attendance_topics")
      .select("*")
      .order("title");
    if (topicsData) setTopics(topicsData);

    // 3. ดึงข้อมูลลงเวลา (ดึงตารางเดียว ไม่ใช้ relation เพื่อแก้ปัญหา FK error)
    const { data: logsData } = await supabase
      .from("attendance_logs")
      .select("*")
      .order("check_in_time", { ascending: false });

    if (logsData && usersData && topicsData) {
      // ทำการ Mapping ข้อมูลด้วยตัวเองในโค้ด
      const mappedLogs = logsData.map((log) => ({
        ...log,
        users:
          usersData.find(
            (u) => u.line_user_id === log.user_id || u.id === log.user_id,
          ) || null,
        attendance_topics:
          topicsData.find(
            (t) =>
              t.id === log.topic_id ||
              t.id?.toString() === log.topic_id?.toString(),
          ) || null,
      }));
      setLogs(mappedLogs);
    }

    // 4. ดึงข้อมูลลางาน (Mapping เหมือนกัน)
    const { data: leavesData } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("status", "approved");
    if (leavesData && usersData) {
      const mappedLeaves = leavesData.map((leave) => ({
        ...leave,
        users:
          usersData.find(
            (u) =>
              u.line_user_id === leave.line_user_id ||
              u.id === leave.line_user_id,
          ) || null,
      }));
      setLeaves(mappedLeaves);
    }

    // 5. ดึงข้อมูลแอดมิน
    const { data: adminsData } = await supabase
      .from("admin_users")
      .select("*")
      .order("created_at");
    if (adminsData) setAdmins(adminsData);

    setLoading(false);
  };

  // =====================================
  // Logic: คำนวณเวลาเกิน (OT)
  // =====================================
  const calculateOT = (checkOutTime: string | null, shift: string) => {
    if (!checkOutTime) return { text: "-", isOver: false, mins: 0 };
    const date = new Date(checkOutTime);
    const totalMins = date.getHours() * 60 + date.getMinutes();

    let limitMins = 0;
    if (shift === "เช้า")
      limitMins = 18 * 60; // 18:00
    else if (shift === "บ่าย")
      limitMins = 22 * 60; // 22:00
    else return { text: "-", isOver: false, mins: 0 };

    if (totalMins > limitMins) {
      const overMins = totalMins - limitMins;
      const h = Math.floor(overMins / 60);
      const m = overMins % 60;
      return { text: `${h} ชม. ${m} นาที`, isOver: true, mins: overMins };
    }
    return { text: "-", isOver: false, mins: 0 };
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // =====================================
  // Logic: กรองข้อมูล และ Export Excel
  // =====================================
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 🌟 กรองตามรหัสพนักงาน หรือ Line User ID
      const matchUser = filterAtt.userId
        ? log.user_id === filterAtt.userId
        : true;
      const matchTopic = filterAtt.topic
        ? (log.attendance_topics?.title || "") === filterAtt.topic
        : true;
      const matchShift = filterAtt.shift ? log.shift === filterAtt.shift : true;

      let matchDate = true;
      if (filterAtt.startDate && filterAtt.endDate) {
        const logDate = new Date(log.check_in_time).toISOString().split("T")[0];
        matchDate =
          logDate >= filterAtt.startDate && logDate <= filterAtt.endDate;
      }
      return matchUser && matchTopic && matchShift && matchDate;
    });
  }, [logs, filterAtt]);

  const handleExportExcel = () => {
    let totalOTMins = 0;
    const csvRows = [
      [
        "ชื่อ-สกุล",
        "ชื่อเล่น",
        "แผนก",
        "ชื่องาน",
        "กะ",
        "วันที่",
        "เวลาเข้า",
        "เวลาออก",
        "เวลาเกิน (OT)",
      ],
    ];

    filteredLogs.forEach((log) => {
      const ot = calculateOT(log.check_out_time, log.shift);
      if (ot.isOver) totalOTMins += ot.mins;

      csvRows.push([
        log.users?.full_name || "-",
        log.users?.nickname || "-",
        log.attendance_topics?.team_type || "-",
        log.attendance_topics?.title || "-",
        log.shift || "-",
        formatDate(log.check_in_time),
        formatTime(log.check_in_time),
        formatTime(log.check_out_time),
        ot.text,
      ]);
    });

    const totalHours = Math.floor(totalOTMins / 60);
    const totalMins = totalOTMins % 60;
    csvRows.push([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "รวมเวลาเกินทั้งหมด:",
      `${totalHours} ชม. ${totalMins} นาที`,
    ]);

    const csvContent =
      "\uFEFF" +
      csvRows.map((e) => e.map((item) => `"${item}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const empName = filterAtt.userId
      ? employees.find((e) => e.line_user_id === filterAtt.userId)?.full_name ||
        "Employee"
      : "All";
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_${empName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =====================================
  // Logic: สรุปวันลา
  // =====================================
  const leaveSummary = useMemo(() => {
    const summary: Record<string, any> = {};
    employees.forEach((emp) => {
      summary[emp.line_user_id] = {
        ...emp,
        personal: 0,
        annual: 0,
        sick: 0,
        absent: 0,
      };
    });

    leaves.forEach((l) => {
      const uid = l.line_user_id;
      if (summary[uid]) {
        if (l.leave_type === "personal")
          summary[uid].personal += l.duration_days;
        if (l.leave_type === "annual") summary[uid].annual += l.duration_days;
        if (l.leave_type === "sick") summary[uid].sick += l.duration_days;
        if (l.leave_type === "absent") summary[uid].absent += l.duration_days;
      }
    });
    return Object.values(summary).filter(
      (s) => s.personal > 0 || s.annual > 0 || s.sick > 0 || s.absent > 0,
    );
  }, [leaves, employees]);

  // =====================================
  // Handlers: Save Profile & Admins & Employee Quota
  // =====================================
  const handleSaveProfile = async () => {
    if (!profileForm.full_name || !profileForm.password)
      return showToastMsg("กรุณากรอกข้อมูลให้ครบ", "error");
    await supabase
      .from("admin_users")
      .update({
        full_name: profileForm.full_name,
        password: profileForm.password,
      })
      .eq("id", adminUser.id);
    setAdminUser({
      ...adminUser,
      full_name: profileForm.full_name,
      password: profileForm.password,
    });
    showToastMsg("อัปเดตข้อมูลส่วนตัวสำเร็จ");
  };

  const handleSaveAdmin = async () => {
    if (!adminForm.username || !adminForm.password || !adminForm.full_name)
      return showToastMsg("กรุณากรอกข้อมูลให้ครบ", "error");

    if (adminForm.id) {
      await supabase
        .from("admin_users")
        .update({
          username: adminForm.username,
          password: adminForm.password,
          full_name: adminForm.full_name,
          role: adminForm.role,
        })
        .eq("id", adminForm.id);
      showToastMsg("แก้ไขข้อมูลผู้ดูแลระบบสำเร็จ");
    } else {
      const { data: exist } = await supabase
        .from("admin_users")
        .select("id")
        .eq("username", adminForm.username)
        .maybeSingle();
      if (exist) return showToastMsg("Username นี้มีคนใช้แล้ว", "error");

      await supabase.from("admin_users").insert([
        {
          username: adminForm.username,
          password: adminForm.password,
          full_name: adminForm.full_name,
          role: adminForm.role,
        },
      ]);
      showToastMsg("เพิ่มผู้ดูแลระบบสำเร็จ");
    }
    setShowAdminModal(false);
    fetchAllData();
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!confirm("ยืนยันการลบผู้ดูแลระบบคนนี้?")) return;
    await supabase.from("admin_users").delete().eq("id", id);
    showToastMsg("ลบผู้ดูแลระบบสำเร็จ");
    fetchAllData();
  };

  const handleSaveEmployeeQuota = async () => {
    if (!empForm.id) return;
    await supabase
      .from("users")
      .update({ annual_leave_quota: empForm.annual_leave_quota })
      .eq("id", empForm.id);
    showToastMsg(`อัปเดตโควตาของ ${empForm.full_name} สำเร็จ`);
    setShowEmpModal(false);
    fetchAllData();
  };

  if (loading || !adminUser)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-[999] px-6 py-3 rounded-xl shadow-lg border flex items-center gap-3 animate-in slide-in-from-right-5 ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          <p className="font-bold text-sm">{toast.message}</p>
        </div>
      )}

      {/* --- Sidebar --- */}
      <aside
        className={`bg-[#0f172a] text-slate-300 w-64 flex-shrink-0 flex flex-col transition-all duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full absolute h-full z-50"}`}
      >
        <div className="h-16 flex items-center px-6 bg-[#0b1120] border-b border-slate-800 gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-black text-lg tracking-wider">
            ST PLUS ERP
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          <p className="px-3 text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
            Main Menu
          </p>

          <button
            onClick={() => setActiveMenu("attendance")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeMenu === "attendance" ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <Clock className="w-5 h-5" /> ตารางลงเวลาทำงาน
          </button>

          <button
            onClick={() => setActiveMenu("leaves")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeMenu === "leaves" ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <CalendarRange className="w-5 h-5" /> สรุปการขาดลามาสาย
          </button>

          <button
            onClick={() => setActiveMenu("employees")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeMenu === "employees" ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <Users className="w-5 h-5" /> รายชื่อพนักงาน
          </button>

          <p className="px-3 text-xs font-bold text-slate-500 mt-6 mb-2 uppercase tracking-wider">
            Settings
          </p>

          <button
            onClick={() => setActiveMenu("profile")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeMenu === "profile" ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <UserCog className="w-5 h-5" /> ข้อมูลส่วนตัวของคุณ
          </button>

          {adminUser.role === "superadmin" && (
            <button
              onClick={() => setActiveMenu("admins")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeMenu === "admins" ? "bg-purple-600 text-white shadow-md shadow-purple-900/20" : "hover:bg-slate-800 hover:text-white"}`}
            >
              <ShieldAlert className="w-5 h-5" /> จัดการผู้ดูแลระบบ
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-lg text-gray-800">
              {activeMenu === "attendance"
                ? "ตารางลงเวลาทำงาน (Attendance)"
                : activeMenu === "leaves"
                  ? "สรุปการขาดลามาสาย (Leave Summary)"
                  : activeMenu === "employees"
                    ? "รายชื่อพนักงานทั้งหมด (Employees)"
                    : activeMenu === "profile"
                      ? "แก้ไขข้อมูลส่วนตัว (Profile)"
                      : "จัดการผู้ดูแลระบบ (Admin Management)"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900 leading-none">
                {adminUser.full_name}
              </p>
              <p className="text-xs text-gray-500 mt-1 capitalize">
                {adminUser.role}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black">
              {adminUser.full_name?.charAt(0) || "A"}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8 custom-scrollbar">
          {/* TAB 1: ตารางลงเวลา (Attendance) */}
          {activeMenu === "attendance" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* 🌟 1. ดึงรายชื่อพนักงานมาทำ Dropdown */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      ค้นหาพนักงาน
                    </label>
                    <select
                      value={filterAtt.userId}
                      onChange={(e) =>
                        setFilterAtt({ ...filterAtt, userId: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">ทั้งหมดทุกคน</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.line_user_id || emp.id}>
                          {emp.full_name}{" "}
                          {emp.nickname ? `(${emp.nickname})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 🌟 2. ดึงหัวข้องานจากตาราง attendance_topics */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      ชื่องาน
                    </label>
                    <select
                      value={filterAtt.topic}
                      onChange={(e) =>
                        setFilterAtt({ ...filterAtt, topic: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">ทุกหัวข้องาน</option>
                      {topics.map((t) => (
                        <option key={t.id} value={t.title}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      กะการทำงาน
                    </label>
                    <select
                      value={filterAtt.shift}
                      onChange={(e) =>
                        setFilterAtt({ ...filterAtt, shift: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">ทุกกะการทำงาน</option>
                      <option value="เช้า">เช้า</option>
                      <option value="บ่าย">บ่าย</option>
                      <option value="ดึก">ดึก</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">
                        ตั้งแต่วันที่
                      </label>
                      <input
                        type="date"
                        value={filterAtt.startDate}
                        onChange={(e) =>
                          setFilterAtt({
                            ...filterAtt,
                            startDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">
                        ถึงวันที่
                      </label>
                      <input
                        type="date"
                        value={filterAtt.endDate}
                        onChange={(e) =>
                          setFilterAtt({
                            ...filterAtt,
                            endDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleExportExcel}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Export Excel
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">ชื่อ-สกุล</th>
                        <th className="px-4 py-3">ชื่อเล่น</th>
                        <th className="px-4 py-3">แผนก</th>
                        <th className="px-4 py-3">ชื่องาน</th>
                        <th className="px-4 py-3 text-center">กะ</th>
                        <th className="px-4 py-3 text-center">วันที่</th>
                        <th className="px-4 py-3 text-center">เวลาเข้า</th>
                        <th className="px-4 py-3 text-center">เวลาออก</th>
                        <th className="px-4 py-3 text-center bg-red-50 text-red-700 rounded-tr-2xl">
                          เกินเวลา (OT)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="text-center py-10 text-gray-400"
                          >
                            ไม่พบข้อมูลที่ค้นหา หรือ กรุณาปลดตัวกรองออก
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log) => {
                          const ot = calculateOT(log.check_out_time, log.shift);
                          return (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-bold text-gray-800">
                                {log.users?.full_name || "-"}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {log.users?.nickname || "-"}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {log.attendance_topics?.team_type || "-"}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {log.attendance_topics?.title || "-"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold">
                                  {log.shift || "-"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-gray-600">
                                {formatDate(log.check_in_time)}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-green-600">
                                {formatTime(log.check_in_time)}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-gray-800">
                                {formatTime(log.check_out_time)}
                              </td>
                              <td
                                className={`px-4 py-3 text-center font-bold ${ot.isOver ? "text-red-600 bg-red-50/50" : "text-gray-400"}`}
                              >
                                {ot.text}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: สรุปการขาดลามาสาย (Leaves) */}
          {activeMenu === "leaves" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4">ชื่อ-สกุล</th>
                      <th className="px-6 py-4">ชื่อเล่น</th>
                      <th className="px-6 py-4 text-center text-blue-600">
                        ลากิจ (วัน)
                      </th>
                      <th className="px-6 py-4 text-center text-purple-600">
                        พักร้อน (วัน)
                      </th>
                      <th className="px-6 py-4 text-center text-orange-600">
                        ลาป่วย (วัน)
                      </th>
                      <th className="px-6 py-4 text-center text-red-600">
                        ขาดงาน (ครั้ง)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leaveSummary.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center py-10 text-gray-400"
                        >
                          ยังไม่มีประวัติการลางาน
                        </td>
                      </tr>
                    ) : (
                      leaveSummary.map((s, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-bold text-gray-800">
                            {s.full_name || "-"}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {s.nickname || "-"}
                          </td>
                          <td className="px-6 py-4 text-center font-black text-blue-600">
                            {s.personal}
                          </td>
                          <td className="px-6 py-4 text-center font-black text-purple-600">
                            {s.annual}
                          </td>
                          <td className="px-6 py-4 text-center font-black text-orange-600">
                            {s.sick}
                          </td>
                          <td className="px-6 py-4 text-center font-black text-red-600">
                            {s.absent}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: รายชื่อพนักงาน (Employees) */}
          {activeMenu === "employees" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 w-16 text-center">รูป</th>
                      <th className="px-6 py-4">ชื่อ-สกุล</th>
                      <th className="px-6 py-4">ชื่อเล่น</th>
                      <th className="px-6 py-4">โควตาพักร้อน</th>
                      <th className="px-6 py-4 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-center">
                          <img
                            src={
                              emp.picture_url ||
                              "https://cdn-icons-png.flaticon.com/512/847/847969.png"
                            }
                            alt="profile"
                            className="w-10 h-10 min-w-[40px] rounded-full mx-auto border border-gray-200 object-cover shrink-0"
                          />
                        </td>
                        <td className="px-6 py-3 font-bold text-gray-800">
                          {emp.full_name || "-"}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {emp.nickname || "-"}
                        </td>
                        <td className="px-6 py-3 font-bold text-purple-600">
                          {emp.annual_leave_quota || 6} วัน
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button
                            onClick={() => {
                              setEmpForm({
                                id: emp.id,
                                full_name: emp.full_name,
                                annual_leave_quota: emp.annual_leave_quota || 6,
                              });
                              setShowEmpModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold text-[11px] transition-colors"
                          >
                            <Edit className="w-3 h-3" /> แก้โควตา
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Modal สำหรับแก้ไขโควตาวันลาพักร้อน */}
              {showEmpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      แก้ไขโควตาพักร้อน
                    </h3>
                    <p className="text-sm text-gray-500 mb-5">
                      พนักงาน:{" "}
                      <span className="font-bold text-gray-800">
                        {empForm.full_name}
                      </span>
                    </p>

                    <div className="mb-6">
                      <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                        จำนวนโควตาต่อปี (วัน)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={empForm.annual_leave_quota}
                        onChange={(e) =>
                          setEmpForm({
                            ...empForm,
                            annual_leave_quota: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full border border-gray-300 p-3 rounded-xl text-lg font-black text-purple-600 focus:ring-2 focus:ring-purple-500 outline-none text-center"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowEmpModal(false)}
                        className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-sm hover:bg-gray-200"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={handleSaveEmployeeQuota}
                        className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl text-sm shadow-sm hover:bg-purple-700"
                      >
                        อัปเดตโควตา
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ข้อมูลส่วนตัว (Profile) */}
          {activeMenu === "profile" && (
            <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserCog className="w-10 h-10" />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                    ชื่อ-นามสกุลของคุณ
                  </label>
                  <input
                    type="text"
                    value={profileForm.full_name}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        full_name: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                    เปลี่ยนรหัสผ่าน (Password)
                  </label>
                  <input
                    type="password"
                    value={profileForm.password}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        password: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm"
                >
                  บันทึกข้อมูลส่วนตัว
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: จัดการผู้ดูแลระบบ (Admins) */}
          {activeMenu === "admins" && adminUser.role === "superadmin" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setAdminForm({
                      id: "",
                      username: "",
                      password: "",
                      full_name: "",
                      role: "admin",
                    });
                    setShowAdminModal(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" /> เพิ่มผู้ดูแลระบบใหม่
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4">ชื่อ-สกุล</th>
                      <th className="px-6 py-4">ตำแหน่ง (Role)</th>
                      <th className="px-6 py-4">Username</th>
                      <th className="px-6 py-4">Password</th>
                      <th className="px-6 py-4 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {admins.map((adm) => (
                      <tr key={adm.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-bold text-gray-800">
                          {adm.full_name || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-bold ${adm.role === "superadmin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                          >
                            {adm.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium">
                          {adm.username}
                        </td>
                        <td className="px-6 py-4 text-gray-400 font-bold tracking-widest">
                          ********
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setAdminForm(adm);
                                setShowAdminModal(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="แก้ไข"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {adm.id !== adminUser.id && (
                              <button
                                onClick={() => handleDeleteAdmin(adm.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="ลบ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Modal จัดการ Admin */}
              {showAdminModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95">
                    <h3 className="text-lg font-bold text-gray-900 mb-5">
                      {adminForm.id
                        ? "แก้ไขผู้ดูแลระบบ"
                        : "เพิ่มผู้ดูแลระบบใหม่"}
                    </h3>
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                          ชื่อ-สกุล
                        </label>
                        <input
                          type="text"
                          value={adminForm.full_name}
                          onChange={(e) =>
                            setAdminForm({
                              ...adminForm,
                              full_name: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                          ตำแหน่ง (Role)
                        </label>
                        <select
                          value={adminForm.role}
                          onChange={(e) =>
                            setAdminForm({ ...adminForm, role: e.target.value })
                          }
                          className="w-full border border-gray-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                          <option value="admin">Admin (ผู้ดูแลทั่วไป)</option>
                          <option value="superadmin">
                            Superadmin (ผู้ดูแลสูงสุด)
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                          Username
                        </label>
                        <input
                          type="text"
                          value={adminForm.username}
                          onChange={(e) =>
                            setAdminForm({
                              ...adminForm,
                              username: e.target.value,
                            })
                          }
                          disabled={!!adminForm.id}
                          className="w-full border border-gray-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                          Password
                        </label>
                        <input
                          type="text"
                          value={adminForm.password}
                          onChange={(e) =>
                            setAdminForm({
                              ...adminForm,
                              password: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAdminModal(false)}
                        className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-sm hover:bg-gray-200"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={handleSaveAdmin}
                        className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl text-sm shadow-sm hover:bg-purple-700"
                      >
                        บันทึก
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
