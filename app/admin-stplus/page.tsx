"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
  FilterX,
  Eye,
  EyeOff,
  ChevronDown, // 🌟 เพิ่ม Icon ใหม่เข้ามา
} from "lucide-react";
import * as XLSX from "xlsx"; // 🌟 Import ไลบรารี Export Excel ตัวท็อป

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

  // 🌟 Avatar Menu State
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- Data States ---
  const [employees, setEmployees] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);

  // --- Filter States ---
  const [filterAtt, setFilterAtt] = useState({
    userId: "",
    topic: "",
    startDate: "",
    endDate: "",
    shift: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // --- Profile States (เพิ่ม Confirm Password และ Toggle ดูรหัส) ---
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- Modal States ---
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({
    id: "",
    username: "",
    password: "",
    full_name: "",
    role: "admin",
  });
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empForm, setEmpForm] = useState({
    id: "",
    full_name: "",
    annual_leave_quota: 6,
  });

  useEffect(() => {
    checkAuth();
  }, []);
  useEffect(() => {
    setCurrentPage(1);
  }, [activeMenu, filterAtt, itemsPerPage]);

  // ซ่อน Dropdown เมื่อคลิกที่อื่น
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        confirm_password: data.password,
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

  const fetchAllData = async () => {
    setLoading(true);
    const { data: usersData } = await supabase
      .from("users")
      .select("*")
      .order("full_name");
    if (usersData) setEmployees(usersData);

    const { data: topicsData } = await supabase
      .from("attendance_topics")
      .select("*")
      .order("title");
    if (topicsData) setTopics(topicsData);

    const { data: logsData } = await supabase
      .from("attendance_logs")
      .select("*")
      .order("check_in_time", { ascending: false });
    if (logsData && usersData && topicsData) {
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

    const { data: adminsData } = await supabase
      .from("admin_users")
      .select("*")
      .order("created_at");
    if (adminsData) setAdmins(adminsData);

    setLoading(false);
  };

  // =====================================
  // 🌟 Logic: คำนวณ OT สุดโหด
  // =====================================
  const calculateOT = (log: any) => {
    if (!log.check_in_time || !log.check_out_time)
      return { text: "-", isOver: false, mins: 0 };

    const checkIn = new Date(log.check_in_time);
    const checkOut = new Date(log.check_out_time);
    const inTotalMins = checkIn.getHours() * 60 + checkIn.getMinutes();

    let shiftType = log.shift || "";
    // ถ้าไม่มีชื่อกะ ให้ลองใช้จากหัวข้องาน
    if (!shiftType && log.attendance_topics?.shift_type) {
      shiftType = log.attendance_topics.shift_type;
    }

    if (shiftType === "เช้า") {
      if (inTotalMins <= 10 * 60) {
        const limit = new Date(checkIn);
        limit.setHours(18, 0, 0, 0);
        if (checkOut > limit) {
          const overMins = Math.floor(
            (checkOut.getTime() - limit.getTime()) / 60000,
          );
          return {
            text: `${Math.floor(overMins / 60)} ชม. ${overMins % 60} นาที`,
            isOver: true,
            mins: overMins,
          };
        }
      }
    } else if (shiftType === "บ่าย") {
      if (inTotalMins <= 14 * 60) {
        const limit = new Date(checkIn);
        limit.setHours(22, 0, 0, 0);
        if (checkOut > limit) {
          const overMins = Math.floor(
            (checkOut.getTime() - limit.getTime()) / 60000,
          );
          return {
            text: `${Math.floor(overMins / 60)} ชม. ${overMins % 60} นาที`,
            isOver: true,
            mins: overMins,
          };
        }
      }
    }
    // เงื่อนไขกะพิเศษ
    else if (
      shiftType.toLowerCase().includes("พิเศษ") ||
      shiftType.toLowerCase().includes("custom")
    ) {
      const startTimeStr = log.attendance_topics?.start_time; // ดึงเวลาเริ่มจากฐานข้อมูล
      if (startTimeStr) {
        const [sH, sM] = startTimeStr.split(":").map(Number);
        const startLimitMins = sH * 60 + sM + 60; // เส้นตายเข้างาน (+1 ชม.)

        if (inTotalMins <= startLimitMins) {
          const limit = new Date(checkIn);
          limit.setHours(sH + 8, sM, 0, 0); // เส้นตายคิด OT คือเริ่มงาน + 8 ชม.

          if (checkOut > limit) {
            const overMins = Math.floor(
              (checkOut.getTime() - limit.getTime()) / 60000,
            );
            return {
              text: `${Math.floor(overMins / 60)} ชม. ${overMins % 60} นาที (งานพิเศษ)`,
              isOver: true,
              mins: overMins,
            };
          } else {
            // 🌟 กรณีเวลาไม่เกิน 8 ชม. ให้แสดงคำว่า งานพิเศษ
            return { text: "(งานพิเศษ)", isOver: false, mins: 0 };
          }
        }
      }
      // 🌟 กรณีไม่มีเวลาบอก หรือเข้างานสายกว่ากำหนด 1 ชม.
      return { text: "(งานพิเศษ)", isOver: false, mins: 0 };
    }

    return { text: "-", isOver: false, mins: 0 };
  };

  const formatTime = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";
  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "-";

  // 🌟 ดึงข้อมูล "กะ" ไม่ซ้ำกันจากตาราง attendance_topics
  const uniqueShifts = Array.from(
    new Set([
      ...topics.map((t) => t.shift_type).filter(Boolean),
      "เช้า",
      "บ่าย",
      "เวลาพิเศษ",
    ]),
  );

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchUser = filterAtt.userId
        ? log.user_id === filterAtt.userId
        : true;
      const matchTopic = filterAtt.topic
        ? (log.attendance_topics?.title || "") === filterAtt.topic
        : true;
      // กรองจากกะใน topic หรือ กะที่บันทึกไว้ใน log
      const matchShift = filterAtt.shift
        ? log.attendance_topics?.shift_type === filterAtt.shift ||
          log.shift === filterAtt.shift
        : true;

      let matchDate = true;
      if (filterAtt.startDate && filterAtt.endDate) {
        const logDate = new Date(log.check_in_time).toISOString().split("T")[0];
        matchDate =
          logDate >= filterAtt.startDate && logDate <= filterAtt.endDate;
      }
      return matchUser && matchTopic && matchShift && matchDate;
    });
  }, [logs, filterAtt]);

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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const paginatedLeaves = leaveSummary.slice(indexOfFirstItem, indexOfLastItem);
  const paginatedEmployees = employees.slice(indexOfFirstItem, indexOfLastItem);
  const paginatedAdmins = admins.slice(indexOfFirstItem, indexOfLastItem);

  const renderPagination = (totalItems: number) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-4 sm:mb-0">
          <span>แสดง</span>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-2 py-1 outline-none focus:border-blue-500 bg-white"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>แถว (รวม {totalItems} รายการ)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center p-1.5 border border-gray-300 rounded-lg hover:bg-white bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-gray-600 px-2">
            หน้า {currentPage} จาก {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center p-1.5 border border-gray-300 rounded-lg hover:bg-white bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // =====================================
  // 🌟 Export Excel (XLSX) แบบ Auto-Width
  // =====================================
  const handleExportExcel = (type: "attendance" | "leaves") => {
    let csvRows: any[][] = [];
    let fileName = "";

    if (type === "attendance") {
      let totalOTMins = 0;
      csvRows = [
        [
          "ชื่อ-สกุล",
          "ชื่อเล่น",
          "แผนก",
          "ชื่องาน",
          "กะ",
          "วันที่",
          "เวลาเข้า",
          "เวลาออก",
          "เกินเวลา (OT)",
        ],
      ];

      filteredLogs.forEach((log) => {
        const ot = calculateOT(log);
        if (ot.isOver) totalOTMins += ot.mins;
        csvRows.push([
          log.users?.full_name || "-",
          log.users?.nickname || "-",
          log.attendance_topics?.team_type || "-",
          log.attendance_topics?.title || "-",
          log.shift || log.attendance_topics?.shift_type || "-",
          formatDate(log.check_in_time),
          formatTime(log.check_in_time),
          formatTime(log.check_out_time),
          ot.text, // 🌟 ดึงข้อความ OT ใส่ลง Cell โดยตรง ข้อมูลไม่หลุดแน่นอน
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
      const empName = filterAtt.userId
        ? employees.find(
            (e) =>
              e.line_user_id === filterAtt.userId || e.id === filterAtt.userId,
          )?.full_name || "Employee"
        : "All";
      fileName = `Attendance_${empName}.xlsx`;
    } else {
      csvRows = [
        [
          "ชื่อ-สกุล",
          "ชื่อเล่น",
          "ลากิจ (วัน)",
          "พักร้อน (วัน)",
          "ลาป่วย (วัน)",
          "ขาดงาน (ครั้ง)",
        ],
      ];
      leaveSummary.forEach((s) => {
        csvRows.push([
          s.full_name || "-",
          s.nickname || "-",
          s.personal,
          s.annual,
          s.sick,
          s.absent,
        ]);
      });
      fileName = `Leave_Summary_Report.xlsx`;
    }

    const ws = XLSX.utils.aoa_to_sheet(csvRows);

    // 🌟 Auto-fit Column Widths คำนวณความกว้างอัตโนมัติ
    const colWidths = csvRows[0].map((_, colIndex) => ({
      wch:
        Math.max(
          ...csvRows.map((row) => {
            const cellVal = row[colIndex];
            return cellVal ? cellVal.toString().length : 0;
          }),
        ) + 4, // บวก Padding เข้าไปเผื่อ
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, fileName);
  };

  // --- Handlers ---
  const handleSaveProfile = async () => {
    if (!profileForm.full_name || !profileForm.password)
      return showToastMsg("กรุณากรอกข้อมูลให้ครบ", "error");
    // 🌟 เช็ค Confirm Password
    if (profileForm.password !== profileForm.confirm_password)
      return showToastMsg("รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง", "error");

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
      await supabase
        .from("admin_users")
        .insert([
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
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        {/* 🌟 Header Menu */}
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

          {/* 🌟 Avatar Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-1.5 pr-3 hover:bg-gray-50 rounded-full border border-transparent hover:border-gray-200 transition-colors"
            >
              <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black">
                {adminUser.full_name?.charAt(0) || "A"}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-bold text-gray-900 leading-none">
                  {adminUser.full_name}
                </p>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase">
                  {adminUser.role}
                </p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
              />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    setActiveMenu("profile");
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  <UserCog className="w-4 h-4" /> แก้ไขโปรไฟล์
                </button>
                <div className="h-px bg-gray-100"></div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8 custom-scrollbar">
          {/* TAB 1: ตารางลงเวลา (Attendance) */}
          {activeMenu === "attendance" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 bg-blue-500 h-full"></div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                          {emp.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
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
                      {uniqueShifts.map((s, i) => (
                        <option key={i} value={s as string}>
                          {s as string}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 flex items-end gap-2">
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
                    {/* 🌟 ปุ่ม Clear Filters */}
                    <button
                      onClick={() =>
                        setFilterAtt({
                          userId: "",
                          topic: "",
                          startDate: "",
                          endDate: "",
                          shift: "",
                        })
                      }
                      className="p-2 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex shrink-0"
                      title="ล้างการค้นหา"
                    >
                      <FilterX className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleExportExcel("attendance")}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Export Excel
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto custom-scrollbar flex-1">
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
                        <th className="px-4 py-3 text-center bg-red-50 text-red-700 rounded-tr-3xl">
                          เกินเวลา (OT)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedLogs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="text-center py-10 text-gray-400 font-bold"
                          >
                            ไม่พบข้อมูลที่ค้นหา
                          </td>
                        </tr>
                      ) : (
                        paginatedLogs.map((log) => {
                          const ot = calculateOT(log);
                          return (
                            <tr
                              key={log.id}
                              className="hover:bg-gray-50 transition-colors"
                            >
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
                                <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-[11px] font-bold">
                                  {log.shift ||
                                    log.attendance_topics?.shift_type ||
                                    "-"}
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
                                className={`px-4 py-3 text-center font-bold ${ot.isOver ? "text-red-600 bg-red-50/50" : ot.text.includes("งานพิเศษ") ? "text-purple-600 bg-purple-50/50" : "text-gray-400"}`}
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
                {renderPagination(filteredLogs.length)}
              </div>
            </div>
          )}

          {/* TAB 2: สรุปการขาดลามาสาย (Leaves) */}
          {activeMenu === "leaves" && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in flex flex-col">
              <div className="flex justify-end p-4 border-b border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => handleExportExcel("leaves")}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export Excel
                </button>
              </div>
              <div className="overflow-x-auto custom-scrollbar flex-1">
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
                    {paginatedLeaves.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center py-10 text-gray-400"
                        >
                          ยังไม่มีประวัติการลางาน
                        </td>
                      </tr>
                    ) : (
                      paginatedLeaves.map((s, i) => (
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
              {renderPagination(leaveSummary.length)}
            </div>
          )}

          {/* TAB 3: รายชื่อพนักงาน (Employees) */}
          {activeMenu === "employees" && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in flex flex-col">
              <div className="overflow-x-auto custom-scrollbar flex-1">
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
                    {paginatedEmployees.map((emp) => (
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
              {renderPagination(employees.length)}

              {/* Employee Modal */}
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

          {/* TAB 4: ข้อมูลส่วนตัว (Profile) 🌟 อัปเกรดระบบ Password */}
          {activeMenu === "profile" && (
            <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-sm border border-gray-200 animate-in zoom-in-95">
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
                    ตั้งรหัสผ่านใหม่ (Password)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={profileForm.password}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          password: e.target.value,
                        })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                    ยืนยันรหัสผ่านใหม่ (Confirm Password)
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={profileForm.confirm_password}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          confirm_password: e.target.value,
                        })
                      }
                      className={`w-full bg-gray-50 border rounded-xl px-4 py-3 pr-10 text-sm focus:ring-2 outline-none ${profileForm.confirm_password && profileForm.password !== profileForm.confirm_password ? "border-red-300 focus:ring-red-500" : "border-gray-200 focus:ring-blue-500"}`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {profileForm.confirm_password &&
                    profileForm.password !== profileForm.confirm_password && (
                      <p className="text-[10px] text-red-500 font-bold mt-1.5">
                        รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง
                      </p>
                    )}
                </div>
                <button
                  onClick={handleSaveProfile}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm"
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

              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto custom-scrollbar flex-1">
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
                      {paginatedAdmins.map((adm) => (
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
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {adm.id !== adminUser.id && (
                                <button
                                  onClick={() => handleDeleteAdmin(adm.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                {renderPagination(admins.length)}
              </div>

              {/* Admin Modal */}
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
