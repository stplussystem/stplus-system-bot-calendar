"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { supabase } from "@/lib/supabase";
import {
  CalendarPlus,
  LayoutList,
  Settings,
  LockKeyhole,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

// 🔥 นำเข้าชิ้นส่วนต่างๆ ที่เราแยกไฟล์ไว้
import ProfileSettings from "@/components/ProfileSettings";
import BookingForm from "@/components/BookingForm";
import AppointmentList from "@/components/AppointmentList";
import AppointmentModals from "@/components/AppointmentModals";
import { getSuccessMessage } from "@/lib/lineFlex"; // 🌟 นำเข้า Flex Message

export default function CalendarPage() {
  const [profile, setProfile] = useState<any>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const [activeTab, setActiveTab] = useState<"book" | "list">("book");
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [userOptions, setUserOptions] = useState<any[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<any[]>([]);
  const [hasAttendees, setHasAttendees] = useState(true);
  const [calendarType, setCalendarType] = useState("shared");
  const [todayDate, setTodayDate] = useState("");

  const [editingApp, setEditingApp] = useState<any>(null);
  const [deleteAppTarget, setDeleteAppTarget] = useState<any>(null);
  const [viewAppTarget, setViewAppTarget] = useState<any>(null);

  const fetchAllUsers = async () => {
    const { data } = await supabase
      .from("users")
      .select("*")
      .not("full_name", "is", null);

    if (data) {
      setUserOptions(
        data.map((u) => {
          // 🔥 จุดที่แก้ไข: ดึง u.line_user_id มาใช้เพื่อการันตีว่าอีเมลจำลองของทุกคนจะไม่ซ้ำกัน
          const uniqueId =
            u.line_user_id || u.id || Math.random().toString(36).substring(7);

          const validEmail =
            u.gmail && u.gmail.includes("@")
              ? u.gmail
              : `no-email-${uniqueId}@stplussystem.local`;

          return {
            value: validEmail,
            label: `${u.full_name} (${u.nickname})`,
            nickname: u.nickname,
            // 🌟 เพิ่มบรรทัดนี้ เพื่อส่งรูปภาพไปให้ BookingForm โชว์
            image: u.picture_url,
          };
        }),
      );
    }
  };

  const fetchMyAppointments = async (currentUserId?: string) => {
    const targetUserId = currentUserId || profile?.userId;
    if (!targetUserId) return;
    setIsLoadingList(true);

    const targetEmail = profile?.email || dbUser?.gmail || "NO_EMAIL";

    try {
      // 1. ดึงคิวงานที่ 'Active' ทั้งหมดมาก่อน เพื่อหลีกเลี่ยง Error การเช็ค Array ใน Database
      const { data: allData, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("status", "active");

      if (error) throw error;

      // 2. ให้ JavaScript ฝั่งหน้าบ้าน (Frontend) เป็นคนคัดกรองข้อมูลให้แทนชัวร์กว่า 100%
      const filteredData = (allData || []).filter((app) => {
        // เงื่อนไขที่ 1: ยูสเซอร์เป็นคนสร้างคิวงานเอง
        const isOwner = app.user_id === targetUserId;

        // เงื่อนไขที่ 2: ยูสเซอร์ถูกเชิญ (เช็คว่ามี attendees และในนั้นมีอีเมลเรา)
        const isInvited =
          app.attendees &&
          Array.isArray(app.attendees) &&
          app.attendees.includes(targetEmail);

        return isOwner || isInvited;
      });

      // 3. เรียงลำดับตามวันที่เริ่มงาน และเวลาเริ่มงาน (เช้าไปเย็น)
      filteredData.sort((a, b) => {
        if (a.appointment_date !== b.appointment_date) {
          return a.appointment_date.localeCompare(b.appointment_date);
        }
        return a.start_time.localeCompare(b.start_time);
      });

      setMyAppointments(filteredData);
    } catch (err) {
      console.error("Fetch Appointments Error:", err);
      toast.error("ดึงข้อมูลคิวงานไม่สำเร็จ หรือระบบฐานข้อมูลขัดข้อง");
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    const localDate = new Date();
    localDate.setMinutes(
      localDate.getMinutes() - localDate.getTimezoneOffset(),
    );
    setTodayDate(localDate.toISOString().split("T")[0]);

    const initApp = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
        if (liff.isLoggedIn()) {
          const userProfile = await liff.getProfile();
          setProfile(userProfile);

          const { data: userData } = await supabase
            .from("users")
            .select("*")
            .eq("line_user_id", userProfile.userId)
            .single();

          let currentUser = userData;

          if (!currentUser) {
            const { data: newUser } = await supabase
              .from("users")
              .insert([
                {
                  line_user_id: userProfile.userId,
                  display_name: userProfile.displayName,
                  picture_url: userProfile.pictureUrl,
                  is_active: false,
                },
              ])
              .select()
              .single();

            currentUser = newUser;
          }

          setDbUser(currentUser || {});

          if (!currentUser?.full_name || !currentUser?.nickname) {
            setIsNewUser(true);
            setIsLoading(false);
            return;
          }

          if (currentUser.is_active === false) {
            setIsPendingApproval(true);
            setIsLoading(false);
            return;
          }

          setIsNewUser(false);
          setIsPendingApproval(false);
          fetchAllUsers();

          if (currentUser.personal_calendar_id) {
            setCalendarType("personal");
            setHasAttendees(false);
          }

          if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get("tab") === "list") {
              setActiveTab("list");
              fetchMyAppointments(userProfile.userId);
            } else if (urlParams.get("tab") === "book") {
              setActiveTab("book");
            } else if (urlParams.get("action") === "profile") {
              setShowProfileSettings(true);
            }
          }
        } else {
          liff.login();
        }
      } catch (err) {
        console.error("LIFF Init Error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
    // 🌟 ข้ามการตรวจเช็ค Dependency ของ Vercel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setTitle("");
    setLocation("");
    setContactPerson("");
    setContactPhone("");
    setDate("");
    setEndDate("");
    setStartTime("");
    setEndTime("");
    setSelectedAttendees([]);
    setEditingApp(null);
    if (dbUser) {
      if (dbUser.personal_calendar_id) {
        setCalendarType("personal");
        setHasAttendees(false);
      } else {
        setCalendarType("shared");
        setHasAttendees(true);
      }
    }
  };

  const formatThaiDate = (dateString: string) => {
    const d = new Date(dateString);
    const days = [
      "อาทิตย์",
      "จันทร์",
      "อังคาร",
      "พุธ",
      "พฤหัสบดี",
      "ศุกร์",
      "เสาร์",
    ];
    const [year, month, day] = dateString.split("-");
    return `${days[d.getDay()]}ที่ ${day}/${month}/${parseInt(year) + 543}`;
  };

  const handleBooking = async () => {
    if (!title || !date || !startTime || !endTime)
      return toast.warning("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนครับ");

    // คำนวณวันสิ้นสุดจริง (ถ้าไม่ได้เลือก ให้ถือว่าเป็นวันเดียวกัน)
    const actualEndDate = endDate || date;

    // 🔥 บล็อกแจ้งเตือน: จะเตือนก็ต่อเมื่อ "เลือกวันเดียวกัน" แต่เวลาสิ้นสุดดันน้อยกว่าหรือเท่ากับเวลาเริ่มต้น
    if (date === actualEndDate && startTime >= endTime) {
      return toast.error(
        "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น (กรณีจัดงานภายในวันเดียว)",
      );
    }

    setIsSubmitting(true);
    try {
      // 🔥 1. ดึงคิวงานที่ 'Active' และเป็นปฏิทินประเภทเดียวกันขึ้นมาเช็คทั้งหมด
      const { data: existingBookings, error: checkError } = await supabase
        .from("appointments")
        .select(
          "id, appointment_date, end_date, start_time, end_time, appointment_type, title, contact_person",
        )
        .eq("appointment_type", calendarType)
        .eq("status", "active");

      if (checkError) throw checkError;
      // 🛠️ 1.1 ฟังก์ชันช่วยแปลง วัน-เวลา เป็น Timestamp แบบชัวร์ 100% (แก้บั๊ก iOS/Safari ลอจิกพัง)
      const getSafeTimestamp = (dateStr: string, timeStr: string) => {
        // เปลี่ยนขีดกลาง (-) เป็นทับ (/) เพราะ Safari มักมีปัญหากับขีดกลาง
        const safeDate = dateStr.replace(/-/g, "/");
        // ตัดเวลาให้เหลือแค่ 5 ตัวแรก (HH:mm) แล้วบังคับเติม :00 ให้ครบฟอร์แมตมาตรฐาน
        const safeTime = timeStr.substring(0, 5);
        return new Date(`${safeDate} ${safeTime}:00`).getTime();
      };

      // 🔥 2. ตรวจสอบการทับซ้อนด้วยระบบ Timestamp แบบ Bulletproof
      const overlappingBooking = existingBookings?.find((booking) => {
        if (editingApp && booking.id === editingApp.id) return false;

        // แปลงวัน-เวลาของนัดหมาย 'ใหม่'
        const newStart = getSafeTimestamp(date, startTime);
        const newEnd = getSafeTimestamp(actualEndDate, endTime);

        // แปลงวัน-เวลาของนัดหมาย 'เดิม'
        const existStartDate = booking.appointment_date;
        const existEndDate = booking.end_date || booking.appointment_date;
        const existStart = getSafeTimestamp(existStartDate, booking.start_time);
        const existEnd = getSafeTimestamp(existEndDate, booking.end_time);

        // ลอจิกทับซ้อนสากล: งานใหม่เริ่ม "ก่อน" งานเก่าจบ AND งานใหม่จบ "หลัง" งานเก่าเริ่ม
        return newStart < existEnd && newEnd > existStart;
      });

      // 🔥 3. ถ้าเจอว่าทับซ้อน ให้เด้งแจ้งเตือนพร้อมบอกวัน-เวลาของงานที่ซ้อน
      if (overlappingBooking) {
        // จัดรูปแบบเวลาสิ้นสุดให้สวยงาม
        const existEndStr =
          overlappingBooking.end_date &&
          overlappingBooking.end_date !== overlappingBooking.appointment_date
            ? `${formatThaiDate(overlappingBooking.end_date)} เวลา ${overlappingBooking.end_time.substring(0, 5)} น.`
            : `${overlappingBooking.end_time.substring(0, 5)} น.`;

        toast.warning("ไม่สามารถบันทึกได้! เวลานี้มีคิวงานแล้ว", {
          description: `ซ้อนกับ: "${overlappingBooking.title}"\n(เริ่ม: ${formatThaiDate(overlappingBooking.appointment_date)} เวลา ${overlappingBooking.start_time.substring(0, 5)} น. ถึง ${existEndStr})`,
        });

        setIsSubmitting(false);
        return;
      }

      const finalAttendees = hasAttendees
        ? selectedAttendees.map((att) => att.value)
        : [];
      const attendeeNamesText = hasAttendees
        ? selectedAttendees.map((att) => att.label).join(", ")
        : "-";

      const payload = {
        title,
        location,
        contactPerson,
        contactPhone,
        date,
        endDate: actualEndDate, // ใช้วันที่สิ้นสุดจริงในการส่งหา Google
        time: `${startTime} - ${endTime}`,
        displayName: dbUser.full_name,
        email: dbUser.gmail,
        attendees: finalAttendees,
        attendeeNames: attendeeNamesText,
        userId: profile.userId,
        calendarType,
        eventId: editingApp?.gcal_event_id,
        targetCalendarId:
          calendarType === "personal" ? dbUser.personal_calendar_id : undefined,
      };

      const dbPayload = {
        title,
        location,
        contact_person: contactPerson,
        contact_phone: contactPhone,
        appointment_date: date,
        end_date: actualEndDate, // บันทึกวันสิ้นสุดลง Supabase
        start_time: startTime,
        end_time: endTime,
        attendees: finalAttendees,
        appointment_type: calendarType,
      };

      if (editingApp) {
        if (editingApp.gcal_event_id) {
          const calRes = await fetch("/api/calendar", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const calData = await calRes.json();
          if (!calRes.ok || !calData.success)
            throw new Error(calData.error || "Google Calendar ปฏิเสธการอัปเดต");
        }
        await supabase
          .from("appointments")
          .update(dbPayload)
          .eq("id", editingApp.id);
        toast.success("อัปเดตข้อมูลสำเร็จ!");
        resetForm();
        fetchMyAppointments();
        setActiveTab("list");
      } else {
        const calRes = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const calData = await calRes.json();
        if (!calRes.ok || !calData.success)
          throw new Error(calData.error || "Google Calendar ปฏิเสธการบันทึก");

        await supabase.from("appointments").insert([
          {
            user_id: profile.userId,
            status: "active",
            booker_name: dbUser.full_name,
            booker_email: dbUser.gmail,
            gcal_event_id: calData.eventId,
            ...dbPayload,
          },
        ]);

        if (liff.isInClient()) {
          await liff.sendMessages([{ type: "text", text: "📅 บันทึกคิวงาน" }]);
          liff.closeWindow();
          return;
        }

        toast.success("บันทึกคิวงานสำเร็จ!");
        resetForm();
        setActiveTab("list");
        fetchMyAppointments();
      }
    } catch (error: any) {
      toast.error(editingApp ? "อัปเดตไม่สำเร็จ" : "บันทึกไม่สำเร็จ", {
        description: error.message,
      });
    }
    setIsSubmitting(false);
  };

  const openEditModal = (app: any) => {
    setEditingApp(app);
    setTitle(app.title);
    setLocation(app.location || "");
    setContactPerson(app.contact_person || "");
    setContactPhone(app.contact_phone || "");
    setDate(app.appointment_date);
    setEndDate(app.end_date || app.appointment_date);
    setStartTime(app.start_time.substring(0, 5));
    setEndTime(app.end_time.substring(0, 5));
    setCalendarType(app.appointment_type || "shared");
    if (app.attendees && app.attendees.length > 0) {
      setHasAttendees(true);
      setSelectedAttendees(
        userOptions.filter((opt) => app.attendees.includes(opt.value)),
      );
    } else {
      setHasAttendees(false);
      setSelectedAttendees([]);
    }
  };

  const executeDelete = async () => {
    if (!deleteAppTarget) return;
    setIsSubmitting(true);
    try {
      if (deleteAppTarget.gcal_event_id) {
        await fetch("/api/calendar", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: deleteAppTarget.gcal_event_id,
            targetCalendarId:
              deleteAppTarget.appointment_type === "personal"
                ? dbUser?.personal_calendar_id
                : undefined,
          }),
        });
      }
      await supabase.from("appointments").delete().eq("id", deleteAppTarget.id);
      toast.success("ลบคิวงานเรียบร้อยแล้ว");
      setDeleteAppTarget(null);
      fetchMyAppointments();
    } catch (error: any) {
      toast.error("เกิดข้อผิดพลาดในการลบ", { description: error.message });
    }
    setIsSubmitting(false);
  };

  const calendarOptions = [
    { value: "shared", label: "ปฏิทินส่วนกลาง (ทุกคนเห็น)" },
    ...(dbUser?.role === "it" ||
    dbUser?.role === "admin" ||
    dbUser?.role === "manager"
      ? [{ value: "it", label: "ปฏิทินทีม Support" }]
      : []),
    ...(dbUser?.role === "admin" || dbUser?.role === "manager"
      ? [{ value: "manager", label: "ปฏิทินผู้บริหาร" }]
      : []),
    ...(dbUser?.personal_calendar_id
      ? [{ value: "personal", label: "🔒 ปฏิทินส่วนตัวของฉัน" }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-8 font-sans pb-10">
      {isLoading ? (
        <div className="mt-[25vh] flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="relative flex items-center justify-center w-36 h-36">
            <div className="absolute inset-0 border-[6px] border-blue-100 rounded-full"></div>
            <div className="absolute inset-0 border-[6px] border-transparent border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-blue-700 font-bold text-lg tracking-wide">
              Loading...
            </span>
          </div>
          <span className="mt-6 text-slate-500 font-medium text-sm animate-pulse">
            กำลังตรวจสอบข้อมูล...
          </span>
        </div>
      ) : profile && (isNewUser || showProfileSettings) ? (
        <ProfileSettings
          profile={profile}
          dbUser={dbUser}
          isNewUser={isNewUser}
          setShowProfileSettings={setShowProfileSettings}
          supabase={supabase}
          onSaveSuccess={(updated) => {
            setDbUser(updated);
            setIsNewUser(false);
            setShowProfileSettings(false);
            if (updated.is_active === false) {
              setIsPendingApproval(true);
            } else {
              fetchAllUsers();
            }
          }}
        />
      ) : isPendingApproval ? (
        <div className="w-full max-w-lg mt-[15vh] bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-10 text-center animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-orange-100 shadow-sm">
            <Clock className="w-12 h-12 text-orange-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-3">
            รอการอนุมัติ
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto mb-8">
            ข้อมูลของคุณถูกบันทึกเรียบร้อยแล้ว
            กรุณารอผู้ดูแลระบบตรวจสอบและเปิดสิทธิ์การใช้งานให้คุณครับ
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-xs font-bold text-slate-600 mb-1">
              ข้อมูลของคุณ:
            </p>
            <p className="text-sm text-slate-800">
              {dbUser?.full_name} ({dbUser?.nickname})
            </p>
          </div>
          <button
            onClick={() => {
              if (liff.isInClient()) liff.closeWindow();
              else window.history.back();
            }}
            className="mt-8 w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      ) : profile && dbUser ? (
        <div className="w-full max-w-2xl mt-4 relative">
          <div className="sticky top-2 md:top-4 z-40 bg-slate-50/80 backdrop-blur-md pb-2 -mx-2 px-2">
            <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 w-full">
              <button
                onClick={() => {
                  setActiveTab("book");
                  resetForm();
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "book" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <CalendarPlus size={18} /> บันทึกคิวงานใหม่
              </button>
              <button
                onClick={() => {
                  setActiveTab("list");
                  fetchMyAppointments();
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "list" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <LayoutList size={18} /> รายการของฉัน
              </button>
            </div>
          </div>

          <div className="w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 mt-2">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-8 flex items-center justify-between relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
              <div className="flex items-center gap-4 relative z-10">
                <img
                  src={profile.pictureUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full border-2 border-indigo-200 shadow-md"
                />
                <div className="text-white">
                  <p className="text-xl font-bold">{dbUser.full_name}</p>
                  <p className="text-xs text-blue-100 bg-blue-600/50 px-2 py-0.5 rounded-md mt-1 inline-block">
                    LINE: {profile.displayName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileSettings(true)}
                className="relative z-10 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all backdrop-blur-sm shadow-sm"
              >
                <Settings size={20} />
              </button>
            </div>

            <div className="p-8 md:p-10">
              {activeTab === "book" && !editingApp && (
                <BookingForm
                  calendarOptions={calendarOptions}
                  calendarType={calendarType}
                  setCalendarType={setCalendarType}
                  hasAttendees={hasAttendees}
                  setHasAttendees={setHasAttendees}
                  title={title}
                  setTitle={setTitle}
                  userOptions={userOptions}
                  selectedAttendees={selectedAttendees}
                  setSelectedAttendees={setSelectedAttendees}
                  location={location}
                  setLocation={setLocation}
                  contactPerson={contactPerson}
                  setContactPerson={setContactPerson}
                  contactPhone={contactPhone}
                  setContactPhone={setContactPhone}
                  date={date}
                  setDate={setDate}
                  endDate={endDate}
                  setEndDate={setEndDate}
                  todayDate={todayDate}
                  startTime={startTime}
                  setStartTime={setStartTime}
                  endTime={endTime}
                  setEndTime={setEndTime}
                  handleBooking={handleBooking}
                  isSubmitting={isSubmitting}
                />
              )}

              {activeTab === "list" && (
                <AppointmentList
                  isLoadingList={isLoadingList}
                  myAppointments={myAppointments}
                  userOptions={userOptions}
                  formatThaiDate={formatThaiDate}
                  setViewAppTarget={setViewAppTarget}
                  openEditModal={openEditModal}
                  setDeleteAppTarget={setDeleteAppTarget}
                  dbUser={dbUser}
                  onAddNewClick={(targetDate) => {
                    resetForm();
                    if (targetDate) {
                      setDate(targetDate);
                      setEndDate(targetDate);
                    }
                    setActiveTab("book");
                  }}
                />
              )}
            </div>
          </div>

          <AppointmentModals
            viewAppTarget={viewAppTarget}
            setViewAppTarget={setViewAppTarget}
            editingApp={editingApp}
            setEditingApp={setEditingApp}
            deleteAppTarget={deleteAppTarget}
            setDeleteAppTarget={setDeleteAppTarget}
            title={title}
            setTitle={setTitle}
            location={location}
            setLocation={setLocation}
            contactPerson={contactPerson}
            setContactPerson={setContactPerson}
            contactPhone={contactPhone}
            setContactPhone={setContactPhone}
            date={date}
            setDate={setDate}
            endDate={endDate}
            setEndDate={setEndDate}
            startTime={startTime}
            setStartTime={setStartTime}
            endTime={endTime}
            setEndTime={setEndTime}
            hasAttendees={hasAttendees}
            userOptions={userOptions}
            selectedAttendees={selectedAttendees}
            setSelectedAttendees={setSelectedAttendees}
            isSubmitting={isSubmitting}
            handleBooking={handleBooking}
            executeDelete={executeDelete}
            formatThaiDate={formatThaiDate}
          />
        </div>
      ) : null}
    </div>
  );
}
