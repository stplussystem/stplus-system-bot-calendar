"use client";

import { useState, useMemo, useEffect } from "react";
import {
  CalendarDays,
  Loader2,
  MapPin,
  User,
  Users,
  Eye,
  Edit,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  Clock3,
  ReceiptText,
  BarChart3,
  CalendarCheck,
  ListTodo,
  LayoutGrid,
  List,
  CalendarPlus,
  LayoutList,
} from "lucide-react";

interface AppointmentListProps {
  isLoadingList: boolean;
  myAppointments: any[];
  userOptions: any[];
  formatThaiDate: (dateStr: string) => string;
  setViewAppTarget: (app: any) => void;
  openEditModal: (app: any) => void;
  setDeleteAppTarget: (app: any) => void;
  onAddNewClick: (date?: string) => void;
  dbUser: any; // 🔥 เพิ่ม Props นี้เพื่อรับข้อมูล User มาเช็คสิทธิ์
}

export default function AppointmentList({
  isLoadingList,
  myAppointments,
  userOptions,
  formatThaiDate,
  setViewAppTarget,
  openEditModal,
  setDeleteAppTarget,
  onAddNewClick,
  dbUser, // 🔥 รับค่า dbUser เข้ามาใช้งาน
}: AppointmentListProps) {
  const [customDate, setCustomDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterType, setFilterType] = useState("all");

  const [calendarFilter, setCalendarFilter] = useState("all");

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calDate, setCalDate] = useState(new Date());

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const filterFromUrl = params.get("filter");
      if (filterFromUrl) {
        setFilterType(filterFromUrl);
      }
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(window.innerWidth >= 768 ? 20 : 10);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getThaiDateStr = (offsetDays = 0) => {
    const date = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }),
    );
    date.setDate(date.getDate() + offsetDays);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const dashboardStats = useMemo(() => {
    const today = getThaiDateStr(0);
    const nextWeek = getThaiDateStr(6);

    let todayCount = 0;
    let weekCount = 0;
    let totalCount = 0;

    myAppointments.forEach((app) => {
      const appType = app.appointment_type || "shared";
      if (calendarFilter !== "all" && appType !== calendarFilter) return;

      totalCount++;
      if (app.appointment_date === today) todayCount++;
      if (app.appointment_date >= today && app.appointment_date <= nextWeek)
        weekCount++;
    });

    return { todayCount, weekCount, totalCount };
  }, [myAppointments, calendarFilter]);

  const filteredAppointments = useMemo(() => {
    const todayStr = getThaiDateStr(0);

    let result = myAppointments.filter((app) => {
      const appType = app.appointment_type || "shared";

      if (calendarFilter !== "all" && appType !== calendarFilter) return false;

      const appDate = app.appointment_date;

      if (filterType === "all") return appDate >= todayStr;
      if (filterType === "past") return appDate < todayStr;
      if (filterType === "today") return appDate === todayStr;
      if (filterType === "tomorrow") return appDate === getThaiDateStr(1);
      if (filterType === "week")
        return appDate >= todayStr && appDate <= getThaiDateStr(6);
      if (filterType === "month") {
        const d = new Date(
          new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }),
        );
        const lastDay = new Date(
          d.getFullYear(),
          d.getMonth() + 1,
          0,
        ).getDate();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const endOfMonth = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
        return appDate >= todayStr && appDate <= endOfMonth;
      }
      if (filterType === "custom")
        return customDate ? appDate === customDate : true;
      return true;
    });

    if (filterType === "past") {
      result = [...result].sort((a, b) => {
        if (a.appointment_date !== b.appointment_date) {
          return b.appointment_date.localeCompare(a.appointment_date);
        }
        return b.start_time.localeCompare(a.start_time);
      });
    }

    return result;
  }, [myAppointments, filterType, customDate, calendarFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, customDate, myAppointments, calendarFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAppointments.length / itemsPerPage),
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredAppointments.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const dayColors: {
    [key: number]: {
      bg: string;
      text: string;
      border: string;
      accent: {
        text: string;
        bg: string;
        hover: string;
        lightBg: string;
        lightHover: string;
      };
    };
  } = {
    0: { bg: "bg-red-50", text: "text-red-700", border: "border-red-100", accent: { text: "text-red-600", bg: "bg-red-600", hover: "hover:bg-red-700", lightBg: "bg-red-50", lightHover: "hover:bg-red-100" } },
    1: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-100", accent: { text: "text-yellow-600", bg: "bg-yellow-600", hover: "hover:bg-yellow-700", lightBg: "bg-yellow-50", lightHover: "hover:bg-yellow-100" } },
    2: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-100", accent: { text: "text-pink-600", bg: "bg-pink-600", hover: "hover:bg-pink-700", lightBg: "bg-pink-50", lightHover: "hover:bg-pink-100" } },
    3: { bg: "bg-green-50", text: "text-green-700", border: "border-green-100", accent: { text: "text-green-600", bg: "bg-green-600", hover: "hover:bg-green-700", lightBg: "bg-green-50", lightHover: "hover:bg-green-100" } },
    4: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100", accent: { text: "text-orange-600", bg: "bg-orange-600", hover: "hover:bg-orange-700", lightBg: "bg-orange-50", lightHover: "hover:bg-orange-100" } },
    5: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-100", accent: { text: "text-sky-600", bg: "bg-sky-600", hover: "hover:bg-sky-700", lightBg: "bg-sky-50", lightHover: "hover:bg-sky-100" } },
    6: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100", accent: { text: "text-purple-600", bg: "bg-purple-600", hover: "hover:bg-purple-700", lightBg: "bg-purple-50", lightHover: "hover:bg-purple-100" } },
  };

  const filterTabs = [
    { id: "all", label: "ทั้งหมด" },
    { id: "today", label: "วันนี้" },
    { id: "tomorrow", label: "พรุ่งนี้" },
    { id: "week", label: "สัปดาห์นี้" },
    { id: "month", label: "เดือนนี้" },
    { id: "custom", label: "ระบุวันที่" },
    { id: "past", label: "ที่ผ่านไปแล้ว" },
  ];

  const nextMonth = () =>
    setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1));
  const prevMonth = () =>
    setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1));
  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];
  const dayNamesShort = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

  const renderCalendar = () => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-slate-100 rounded-xl transition"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <h4 className="font-bold text-slate-800 text-lg">
            {monthNames[month]} {year + 543}
          </h4>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-100 rounded-xl transition"
          >
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNamesShort.map((day, idx) => (
            <div
              key={idx}
              className={`text-center text-xs font-bold ${idx === 0 ? "text-red-500" : "text-slate-400"}`}
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {blanks.map((blank) => (
            <div
              key={`blank-${blank}`}
              className="min-h-[80px] p-1 bg-slate-50/50 rounded-xl border border-transparent"
            ></div>
          ))}
          {days.map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = filteredAppointments.filter(
              (app) => app.appointment_date === dateStr,
            );
            const isToday = dateStr === getThaiDateStr(0);

            return (
              <div
                key={day}
                className={`min-h-[80px] p-1.5 rounded-xl border transition-all ${isToday ? "bg-blue-50/30 border-blue-200 shadow-sm" : "bg-white border-slate-100 hover:border-blue-300"}`}
              >
                <div
                  className={`text-right text-xs font-bold mb-1 ${isToday ? "text-blue-600" : "text-slate-500"}`}
                >
                  {isToday ? (
                    <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded-md">
                      {day}
                    </span>
                  ) : (
                    day
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {dayEvents.slice(0, 3).map((event, idx) => {
                    const evDate = new Date(
                      event.appointment_date + "T00:00:00",
                    );
                    const colors = dayColors[evDate.getDay()] || dayColors[1];
                    return (
                      <div
                        key={idx}
                        onClick={() => setViewAppTarget(event)}
                        className={`text-[10px] md:text-xs truncate px-1.5 py-0.5 rounded cursor-pointer transition-all ${colors.accent.lightBg} ${colors.accent.text} ${colors.accent.lightHover}`}
                        title={event.title}
                      >
                        {event.start_time.substring(0, 5)} {event.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-center text-slate-400 font-semibold mt-0.5">
                      +{dayEvents.length - 3} รายการ
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
      {/* 🔥 ส่วนของ Dropdown เลือกประเภทปฏิทินที่มีการเช็คสิทธิ์ตาม Role แล้ว */}
      <div className="mb-4 animate-in fade-in zoom-in-95">
        <div className="bg-white border border-slate-200 rounded-2xl p-2 flex items-center shadow-sm relative focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 mr-3 shrink-0">
            <CalendarDays size={20} className="text-blue-500" />
          </div>
          <div className="flex-1 pr-6">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              เลือกปฏิทินที่ต้องการดู
            </label>
            <select
              value={calendarFilter}
              onChange={(e) => setCalendarFilter(e.target.value)}
              className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none appearance-none cursor-pointer"
            >
              <option value="all"> ปฏิทินทั้งหมด</option>
              <option value="shared"> เฉพาะปฏิทินส่วนกลาง</option>
              
              {/* 🔥 กรองเงื่อนไขการแสดงผลเหมือนฝั่งฟอร์มเป๊ะๆ */}
              {(dbUser?.role === "it" || dbUser?.role === "admin" || dbUser?.role === "manager") && (
                <option value="it"> เฉพาะปฏิทินทีม Support</option>
              )}
              
              {(dbUser?.role === "admin" || dbUser?.role === "manager") && (
                <option value="manager"> เฉพาะปฏิทินผู้บริหาร</option>
              )}
              
              {dbUser?.personal_calendar_id && (
                <option value="personal">🔒 ปฏิทินส่วนตัวของฉัน</option>
              )}
            </select>
          </div>
          <div className="absolute right-4 text-slate-400 pointer-events-none">
            <ChevronDown size={18} />
          </div>
        </div>
      </div>

      {!isLoadingList && myAppointments.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4 mt-4">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/60 border border-indigo-100 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
            <BarChart3
              className="absolute -right-2 -bottom-2 text-indigo-200/50"
              size={48}
            />
            <span className="text-xs font-bold text-indigo-600 mb-0.5 z-10">
              คิวงานทั้งหมด
            </span>
            <span className="text-2xl font-black text-indigo-800 z-10 leading-none">
              {dashboardStats.totalCount}
            </span>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/60 border border-orange-100 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
            <CalendarCheck
              className="absolute -right-2 -bottom-2 text-orange-200/50"
              size={48}
            />
            <span className="text-xs font-bold text-orange-600 mb-0.5 z-10">
              สัปดาห์นี้
            </span>
            <span className="text-2xl font-black text-orange-800 z-10 leading-none">
              {dashboardStats.weekCount}
            </span>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-100 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
            <ListTodo
              className="absolute -right-2 -bottom-2 text-blue-200/50"
              size={48}
            />
            <span className="text-xs font-bold text-blue-600 mb-0.5 z-10">
              คิวงานวันนี้
            </span>
            <span className="text-2xl font-black text-blue-800 z-10 leading-none">
              {dashboardStats.todayCount}
            </span>
          </div>
        </div>
      )}      

      <div className="border-b pb-3 mb-4 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="text-blue-600" /> คิวงานที่กำลังจะถึง
          </h3>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white shadow text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
              title="ดูแบบรายการ"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "calendar" ? "bg-white shadow text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
              title="ดูแบบปฏิทิน"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>

        {viewMode === "list" && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide animate-in fade-in">
            <div className="flex items-center gap-2 text-slate-400 pl-1">
              <Filter size={16} />
            </div>
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filterType === tab.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {viewMode === "list" && filterType === "custom" && (
          <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 mt-2 bg-blue-50/50 p-2 rounded-xl border border-blue-100">
            <CalendarIcon size={16} className="text-blue-500 ml-2" />
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 w-full"
            />
          </div>
        )}
      </div>

      {isLoadingList ? (
        <div className="space-y-3 mt-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col animate-pulse overflow-hidden"
            >
              <div className="bg-slate-100 h-10 w-full border-b border-slate-100/50"></div>
              <div className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1 pr-4">
                    <div className="h-5 bg-slate-200 rounded-md w-3/4"></div>
                    <div className="h-3 bg-slate-200 rounded-md w-1/2 mt-3"></div>
                    <div className="h-3 bg-slate-200 rounded-md w-2/3"></div>
                  </div>
                  <div className="h-5 bg-slate-200 rounded-md w-16"></div>
                </div>
                <div className="flex gap-2 mt-2 pt-3 border-t border-slate-50">
                  <div className="h-9 bg-slate-100 rounded-lg flex-1"></div>
                  <div className="h-9 bg-slate-100 rounded-lg flex-1"></div>
                  <div className="h-9 bg-slate-50 rounded-lg flex-1"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "calendar" ? (
        renderCalendar()
      ) : currentItems.length === 0 ? (
        <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4 shadow-sm">
            <CalendarIcon size={32} />
          </div>
          <h4 className="text-lg font-bold text-slate-700 mb-1">
            ไม่พบรายการคิวงาน
          </h4>
          <p className="text-sm text-slate-500 mb-6 max-w-xs">
            {filterType === "custom" && customDate
              ? `ไม่มีคิวงานในวันที่ ${formatThaiDate(customDate)} ครับ`
              : "คุณยังไม่มีกำหนดการใดๆ ในปฏิทินที่เลือกครับ"}
          </p>
          <button
            onClick={() =>
              onAddNewClick(
                filterType === "custom" && customDate ? customDate : "",
              )
            }
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all flex items-center gap-2"
          >
            <CalendarPlus size={18} /> เพิ่มคิวงานใหม่
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {currentItems.map((item) => {
            const attNames =
              item.attendees && item.attendees.length > 0
                ? userOptions
                    .filter((opt) => item.attendees.includes(opt.value))
                    .map((o) => o.nickname)
                    .join(", ")
                : null;

            const date = new Date(item.appointment_date + "T00:00:00");
            const dayOfWeek = date.getDay();
            const colors = dayColors[dayOfWeek];

            const dayName = date.toLocaleDateString("th-TH", {
              weekday: "long",
            });
            const thaiDateStr = formatThaiDate(item.appointment_date);

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-2xl shadow-sm hover:border-slate-300 hover:shadow-lg transition-all duration-300 flex flex-col ${colors.border} ${filterType === "past" ? "opacity-40 grayscale hover:opacity-100 hover:grayscale-0" : ""}`}
              >
                <div
                  className={`rounded-t-2xl px-4 py-2 flex items-center justify-between border-b ${colors.bg} ${colors.border}`}
                >
                  <span className={`font-bold ${colors.text}`}>{dayName}</span>
                  <span className={`text-xs font-semibold ${colors.text}`}>
                    {thaiDateStr}
                  </span>
                </div>

                <div className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-2 space-y-1 min-w-0">
                      <h4
                        className="font-bold text-slate-800 text-lg leading-tight truncate"
                        title={item.title}
                      >
                        {item.title}
                      </h4>
                      <p
                        className={`text-sm flex items-center gap-1.5 pt-1 truncate ${colors.accent.text}`}
                      >
                        <MapPin size={14} className="shrink-0" />{" "}
                        {item.location || "-"}
                      </p>
                      <p
                        className={`text-sm flex items-center gap-1.5 mt-1 truncate ${colors.accent.text}`}
                      >
                        <User size={14} className="shrink-0" /> ติดต่อ:{" "}
                        {item.contact_person || "-"}{" "}
                        {item.contact_phone ? `(${item.contact_phone})` : ""}
                      </p>
                      {attNames && (
                        <p
                          className={`text-sm flex items-start gap-1.5 mt-1 ${colors.accent.text}`}
                        >
                          <Users size={14} className="shrink-0 mt-0.5" />{" "}
                          <span className="truncate">
                            ผู้เข้าร่วม: {attNames}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock3 size={16} className="text-orange-400" />{" "}
                        {item.start_time.substring(0, 5)} -{" "}
                        {item.end_time.substring(0, 5)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-1 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setViewAppTarget(item)}
                      className={`flex-1 py-2 text-xs md:text-sm font-semibold text-white rounded-lg flex justify-center items-center gap-1 ${colors.accent.bg} ${colors.accent.hover}`}
                    >
                      <ReceiptText size={16} /> ดูรายละเอียด
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className={`flex-1 py-2 text-xs md:text-sm font-semibold rounded-lg flex justify-center items-center gap-1 ${colors.accent.text} ${colors.accent.lightBg} ${colors.accent.lightHover}`}
                    >
                      <Edit size={16} /> แก้ไข
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteAppTarget(item)}
                      className="flex-1 py-2 text-xs md:text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 flex justify-center items-center gap-1"
                    >
                      <Trash2 size={16} /> ยกเลิก/ลบ
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:shadow-none transition-all flex items-center gap-1 text-sm font-bold"
              >
                <ChevronLeft size={18} /> ก่อนหน้า
              </button>
              <span className="text-sm font-bold text-slate-500 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:shadow-none transition-all flex items-center gap-1 text-sm font-bold"
              >
                ถัดไป <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}