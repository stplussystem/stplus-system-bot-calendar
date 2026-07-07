"use client";

import {
  Eye,
  X,
  Clock,
  MapPin,
  User,
  Phone,
  Users,
  Edit,
  Loader2,
  AlertCircle,
  ReceiptText,
} from "lucide-react";
import Select from "react-select";

interface AppointmentModalsProps {
  viewAppTarget: any;
  setViewAppTarget: (val: any) => void;
  editingApp: any;
  setEditingApp: (val: any) => void;
  deleteAppTarget: any;
  setDeleteAppTarget: (val: any) => void;
  title: string;
  setTitle: (val: string) => void;
  location: string;
  setLocation: (val: string) => void;
  contactPerson: string;
  setContactPerson: (val: string) => void;
  contactPhone: string;
  setContactPhone: (val: string) => void;
  date: string;
  setDate: (val: string) => void;
  endDate: string; // 🔥 เพิ่ม
  setEndDate: (val: string) => void; // 🔥 เพิ่ม
  startTime: string;
  setStartTime: (val: string) => void;
  endTime: string;
  setEndTime: (val: string) => void;
  hasAttendees: boolean;
  userOptions: any[];
  selectedAttendees: any[];
  setSelectedAttendees: (val: any[]) => void;
  isSubmitting: boolean;
  handleBooking: () => void;
  executeDelete: () => void;
  formatThaiDate: (dateStr: string) => string;
  overlapWarning?: any;
  setOverlapWarning?: (val: any) => void;
  executeBooking?: (payload: any, dbPayload: any) => void;
}

export default function AppointmentModals({
  viewAppTarget,
  setViewAppTarget,
  editingApp,
  setEditingApp,
  deleteAppTarget,
  setDeleteAppTarget,
  title,
  setTitle,
  location,
  setLocation,
  contactPerson,
  setContactPerson,
  contactPhone,
  setContactPhone,
  date,
  setDate,
  endDate,
  setEndDate,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  hasAttendees,
  userOptions,
  selectedAttendees,
  setSelectedAttendees,
  isSubmitting,
  handleBooking,
  executeDelete,
  formatThaiDate,
  overlapWarning,
  setOverlapWarning,
  executeBooking,
}: AppointmentModalsProps) {
  const AttendeeCustomOption = ({ data, innerRef, innerProps }: any) => (
    <div
      ref={innerRef}
      {...innerProps}
      className="flex items-center p-3 cursor-pointer hover:bg-blue-50 border-b border-slate-50 last:border-0"
    >
      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
        <User size={16} />
      </div>
      <span className="text-sm font-medium text-slate-700">{data.label}</span>
    </div>
  );

  const dayColors: { [key: number]: any } = {
    0: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-100",
      accent: {
        text: "text-red-600",
        bg: "bg-red-600",
        hover: "hover:bg-red-700",
        lightBg: "bg-red-50",
        lightHover: "hover:bg-red-100",
      },
    },
    1: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      border: "border-yellow-100",
      accent: {
        text: "text-yellow-600",
        bg: "bg-yellow-600",
        hover: "hover:bg-yellow-700",
        lightBg: "bg-yellow-50",
        lightHover: "hover:bg-yellow-100",
      },
    },
    2: {
      bg: "bg-pink-50",
      text: "text-pink-700",
      border: "border-pink-100",
      accent: {
        text: "text-pink-600",
        bg: "bg-pink-600",
        hover: "hover:bg-pink-700",
        lightBg: "bg-pink-50",
        lightHover: "hover:bg-pink-100",
      },
    },
    3: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-100",
      accent: {
        text: "text-green-600",
        bg: "bg-green-600",
        hover: "hover:bg-green-700",
        lightBg: "bg-green-50",
        lightHover: "hover:bg-green-100",
      },
    },
    4: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-100",
      accent: {
        text: "text-orange-600",
        bg: "bg-orange-600",
        hover: "hover:bg-orange-700",
        lightBg: "bg-orange-50",
        lightHover: "hover:bg-orange-100",
      },
    },
    5: {
      bg: "bg-sky-50",
      text: "text-sky-700",
      border: "border-sky-100",
      accent: {
        text: "text-sky-600",
        bg: "bg-sky-600",
        hover: "hover:bg-sky-700",
        lightBg: "bg-sky-50",
        lightHover: "hover:bg-sky-100",
      },
    },
    6: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-100",
      accent: {
        text: "text-purple-600",
        bg: "bg-purple-600",
        hover: "hover:bg-purple-700",
        lightBg: "bg-purple-50",
        lightHover: "hover:bg-purple-100",
      },
    },
  };

  const getViewColors = () => {
    if (!viewAppTarget || !viewAppTarget.appointment_date) return dayColors[1];
    const dateObj = new Date(viewAppTarget.appointment_date + "T00:00:00");
    return dayColors[dateObj.getDay()];
  };
  const viewColors = getViewColors();

  return (
    <>
      {/* 1. Modal ดูรายละเอียด */}
      {viewAppTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div
              className={`p-5 border-b flex justify-between items-center ${viewColors.bg} ${viewColors.border}`}
            >
              <h3
                className={`font-bold text-lg flex items-center gap-2 ${viewColors.text}`}
              >
                <ReceiptText className={viewColors.accent.text} /> ข้อมูลคิวงาน
              </h3>
              <button
                type="button"
                onClick={() => setViewAppTarget(null)}
                className={`p-1.5 rounded-full transition-colors hover:bg-white/50 ${viewColors.accent.text}`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  หัวข้อ
                </label>
                <p className="text-lg font-bold text-slate-800 leading-tight mt-1">
                  {viewAppTarget.title}
                </p>
              </div>

              <div
                className={`p-4 rounded-2xl border flex justify-between items-center ${viewColors.accent.lightBg} ${viewColors.border}`}
              >
                <div>
                  {/* 🔥 เช็คโชว์วันที่ 2 ฝั่ง */}
                  <p
                    className={`text-sm font-semibold mb-1 ${viewColors.text}`}
                  >
                    {viewAppTarget.end_date &&
                    viewAppTarget.end_date !== viewAppTarget.appointment_date
                      ? `${formatThaiDate(viewAppTarget.appointment_date)} - ${formatThaiDate(viewAppTarget.end_date)}`
                      : formatThaiDate(viewAppTarget.appointment_date)}
                  </p>
                  <p className={`text-lg font-bold ${viewColors.accent.text}`}>
                    {viewAppTarget.start_time.substring(0, 5)} -{" "}
                    {viewAppTarget.end_time.substring(0, 5)}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm ${viewColors.accent.text}`}
                >
                  <Clock size={24} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    สถานที่
                  </label>
                  <p className="text-sm font-semibold text-slate-700 mt-1 break-words">
                    {viewAppTarget.location || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    ปฏิทินที่บันทึก
                  </label>
                  <p className="text-sm font-semibold text-slate-700 mt-1">
                    {viewAppTarget.appointment_type === "personal"
                      ? "🔒 ส่วนตัวของฉัน"
                      : viewAppTarget.appointment_type === "manager"
                        ? "ผู้บริหาร"
                        : viewAppTarget.appointment_type === "it"
                          ? "ทีม Support"
                          : "ส่วนกลาง"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    ผู้ติดต่อ
                  </label>
                  <p className="text-sm font-semibold text-slate-700 mt-1 break-words">
                    {viewAppTarget.contact_person || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    เบอร์โทร
                  </label>
                  <p className="text-sm font-semibold text-slate-700 mt-1">
                    {viewAppTarget.contact_phone || "-"}
                  </p>
                </div>
              </div>
              {viewAppTarget.attendees &&
                viewAppTarget.attendees.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                      รายชื่อผู้เข้าร่วม
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {userOptions
                        .filter((opt) =>
                          viewAppTarget.attendees.includes(opt.value),
                        )
                        .map((o, idx) => (
                          <span
                            key={idx}
                            className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-200"
                          >
                            {o.label}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
            </div>
            <div className="p-5 border-t bg-slate-50">
              <button
                type="button"
                onClick={() => setViewAppTarget(null)}
                className="w-full py-3.5 font-bold text-white bg-slate-800 rounded-xl hover:bg-slate-900 transition-all shadow-md"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal แก้ไขคิวงาน */}
      {editingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Edit className="text-blue-600" /> แก้ไขคิวงาน
              </h3>
              <button
                type="button"
                onClick={() => setEditingApp(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">
                  หัวข้อ
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">
                    สถานที่
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">
                    ผู้ติดต่อ
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">
                  เบอร์โทร
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
              {hasAttendees && (
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1 block">
                    ผู้เข้าร่วม
                  </label>
                  <Select
                    isMulti
                    options={userOptions}
                    value={selectedAttendees}
                    onChange={(val) => setSelectedAttendees(val as any[])}
                    components={{ Option: AttendeeCustomOption }}
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: "0.75rem",
                        borderColor: "#e2e8f0",
                        backgroundColor: "#f8fafc",
                        boxShadow: "none",
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 9999,
                        borderRadius: "0.75rem",
                        overflow: "hidden",
                      }),
                    }}
                  />
                </div>
              )}
              <div className="pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-1 block">
                      วันที่เริ่ม
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="appearance-none block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-1 block">
                      วันที่สิ้นสุด
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="appearance-none block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-1 block">
                      เริ่ม
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="appearance-none block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-1 block">
                      ถึง
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="appearance-none block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 border-t bg-slate-50 flex gap-3">
              <button
                type="button"
                onClick={() => setEditingApp(null)}
                className="flex-1 py-3 font-semibold text-slate-600 bg-white border rounded-xl hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleBooking}
                disabled={isSubmitting}
                className="flex-1 py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex justify-center items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  "บันทึกแก้ไข"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal ยืนยันการลบ */}
      {deleteAppTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col p-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-2">
              <AlertCircle size={32} />
            </div>
            <h3 className="font-bold text-xl text-slate-800">ยืนยันการลบ?</h3>
            <p className="text-slate-500 text-sm">
              คุณแน่ใจหรือไม่ที่จะยกเลิกคิวงานนี้?
              <br />
              (ข้อมูลในปฏิทินของรายการนี้จะถูกลบไปด้วย)
            </p>
            <div className="flex gap-3 mt-4 pt-2">
              <button
                type="button"
                onClick={() => setDeleteAppTarget(null)}
                className="flex-1 py-3 font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={isSubmitting}
                className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 flex justify-center items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  "ยืนยันลบ"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal แจ้งเตือนคิวชน (Soft Warning) */}
      {overlapWarning && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col p-6 space-y-4">
            <div className="mx-auto w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-1 shadow-inner">
              <AlertCircle size={32} />
            </div>

            <h3 className="font-black text-xl text-slate-800 text-center">
              เตือน: ผู้เข้าร่วมติดคิวงานอื่น
            </h3>
            <p className="text-slate-600 text-sm text-center leading-relaxed">
              ผู้เข้าร่วมที่คุณเลือกบางท่าน มีนัดหมายทับซ้อนในช่วงเวลานี้ครับ:
            </p>

            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 max-h-48 overflow-y-auto space-y-3">
              {overlapWarning.conflicts.map((conflict: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-white p-3 rounded-lg shadow-sm border border-orange-100/50"
                >
                  <p className="text-xs font-bold text-orange-600 mb-1">
                    {conflict.names}
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    ติดงาน: {conflict.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    🗓️ เริ่ม: {conflict.timeStr}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOverlapWarning!(null)}
                className="flex-1 py-3.5 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                กลับไปแก้ไข
              </button>
              <button
                type="button"
                onClick={() =>
                  executeBooking!(
                    overlapWarning.payload,
                    overlapWarning.dbPayload,
                  )
                }
                disabled={isSubmitting}
                className="flex-1 py-3.5 font-bold text-white bg-orange-500 rounded-xl hover:bg-orange-600 flex justify-center items-center gap-2 shadow-md transition-all"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  "ยืนยันบันทึกต่อ"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
