"use client";

import {
  LayoutList,
  AlignLeft,
  Users,
  User,
  MapPin,
  Phone,
  CalendarDays,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Select, { components } from "react-select";

interface BookingFormProps {
  calendarOptions: any[];
  calendarType: string;
  setCalendarType: (val: string) => void;
  hasAttendees: boolean;
  setHasAttendees: (val: boolean) => void;
  title: string;
  setTitle: (val: string) => void;
  userOptions: any[];
  selectedAttendees: any[];
  setSelectedAttendees: (val: any[]) => void;
  location: string;
  setLocation: (val: string) => void;
  contactPerson: string;
  setContactPerson: (val: string) => void;
  contactPhone: string;
  setContactPhone: (val: string) => void;
  date: string;
  setDate: (val: string) => void;
  todayDate: string;
  startTime: string;
  setStartTime: (val: string) => void;
  endTime: string;
  setEndTime: (val: string) => void;
  handleBooking: () => void;
  isSubmitting: boolean;
}

export default function BookingForm({
  calendarOptions,
  calendarType,
  setCalendarType,
  hasAttendees,
  setHasAttendees,
  title,
  setTitle,
  userOptions,
  selectedAttendees,
  setSelectedAttendees,
  location,
  setLocation,
  contactPerson,
  setContactPerson,
  contactPhone,
  setContactPhone,
  date,
  setDate,
  todayDate,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  handleBooking,
  isSubmitting,
}: BookingFormProps) {
  // 🌟 ปรับแต่ง Option ใน Dropdown ให้โชว์รูปโปรไฟล์
  const AttendeeCustomOption = ({ data, innerRef, innerProps }: any) => (
    <div
      ref={innerRef}
      {...innerProps}
      className="flex items-center p-3 cursor-pointer hover:bg-blue-50 border-b border-slate-50 last:border-0"
    >
      {data.image ? (
        <img
          src={data.image}
          alt="profile"
          className="w-8 h-8 rounded-full object-cover mr-3 border border-gray-200 shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 shrink-0">
          <User size={16} />
        </div>
      )}
      <span className="text-sm font-bold text-slate-700">{data.label}</span>
    </div>
  );

  // 🌟 ปรับแต่ง Tag ที่ถูกเลือกแล้ว ให้โชว์รูปโปรไฟล์จิ๋วๆ ด้วย
  const AttendeeMultiValueLabel = (props: any) => (
    <div className="flex items-center gap-1.5 pr-1 py-0.5">
      {props.data.image ? (
        <img
          src={props.data.image}
          alt="profile"
          className="w-5 h-5 rounded-full object-cover ml-1"
        />
      ) : (
        <User size={14} className="ml-1 text-gray-500" />
      )}
      <span className="text-xs font-bold text-gray-700">
        {props.data.label}
      </span>
    </div>
  );

  const CalendarCustomOption = ({ data, innerRef, innerProps }: any) => (
    <div
      ref={innerRef}
      {...innerProps}
      className="flex items-center p-3 cursor-pointer hover:bg-blue-50 border-b border-slate-50 last:border-0"
    >
      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
        <CalendarDays size={20} />
      </div>
      <span className="text-sm font-medium text-slate-700">{data.label}</span>
    </div>
  );

  const CalendarSingleValue = (props: any) => (
    <components.SingleValue {...props}>
      <div className="flex items-center">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2">
          <CalendarDays size={14} />
        </div>
        <span className="text-sm font-medium text-slate-700">
          {props.data.label}
        </span>
      </div>
    </components.SingleValue>
  );

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-4">
        <div>
          <label className="flex items-center text-sm font-semibold text-blue-800 mb-2 gap-2">
            <LayoutList size={18} /> บันทึกลงปฏิทิน
          </label>
          <Select
            value={calendarOptions.find((o) => o.value === calendarType)}
            onChange={(val: any) => setCalendarType(val?.value || "shared")}
            options={calendarOptions}
            components={{
              Option: CalendarCustomOption,
              SingleValue: CalendarSingleValue,
            }}
            isSearchable={false}
            styles={{
              control: (base) => ({
                ...base,
                minHeight: "48px",
                borderRadius: "0.75rem",
                borderColor: "#e2e8f0",
                backgroundColor: "#ffffff",
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
        <div className="flex bg-white rounded-xl border border-slate-200 p-1">
          <button
            type="button"
            onClick={() => setHasAttendees(true)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg ${hasAttendees ? "bg-blue-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}
          >
            มีผู้เข้าร่วม
          </button>
          <button
            type="button"
            onClick={() => setHasAttendees(false)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg ${!hasAttendees ? "bg-blue-500 text-white" : "text-slate-500 hover:bg-slate-50"}`}
          >
            ไม่มีผู้เข้าร่วม
          </button>
        </div>
      </div>

      <div>
        <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 gap-2">
          <AlignLeft size={18} className="text-blue-500" /> หัวข้อ
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
          placeholder="เช่น นัดประชุมวางระบบ"
        />
      </div>

      {hasAttendees && (
        <div className="relative z-50">
          <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 gap-2">
            <Users size={18} className="text-pink-500" /> เลือกผู้เข้าร่วม
          </label>
          <Select
            isMulti
            options={userOptions}
            value={selectedAttendees}
            onChange={(val) => setSelectedAttendees(val as any[])}
            components={{
              Option: AttendeeCustomOption,
              MultiValueLabel: AttendeeMultiValueLabel,
            }}
            placeholder="ค้นหาพนักงาน..."
            styles={{
              control: (base) => ({
                ...base,
                padding: "4px",
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

      <div>
        <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 gap-2">
          <MapPin size={18} className="text-blue-500" /> สถานที่
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
          placeholder="ระบุสถานที่"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 gap-2">
            <User size={18} className="text-blue-500" /> ผู้ติดต่อ
          </label>
          <input
            type="text"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            placeholder="ชื่อบุคคลหรือบริษัท"
          />
        </div>
        <div>
          <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 gap-2">
            <Phone size={18} className="text-blue-500" /> เบอร์โทร
          </label>
          <input
            type="text"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="(ไม่บังคับ)"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
          />
        </div>
      </div>

      <div>
        <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 gap-2">
          <CalendarDays size={18} className="text-blue-500" /> วันที่
        </label>
        <input
          type="date"
          value={date}
          min={todayDate}
          onChange={(e) => setDate(e.target.value)}
          className="appearance-none block w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 opacity-100 [-webkit-text-fill-color:#111827]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 gap-2">
            <Clock size={18} className="text-green-500" /> เริ่ม
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="appearance-none block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-900 opacity-100 [-webkit-text-fill-color:#111827]"
          />
        </div>
        <div>
          <label className="flex items-center text-sm font-semibold text-slate-700 mb-2 gap-2">
            <Clock size={18} className="text-red-500" /> ถึง
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="appearance-none block w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-900 opacity-100 [-webkit-text-fill-color:#111827]"
          />
        </div>
      </div>

      <button
        onClick={handleBooking}
        disabled={isSubmitting}
        className={`w-full py-4 mt-4 rounded-2xl font-bold text-white shadow-lg flex justify-center items-center gap-2 ${isSubmitting ? "bg-blue-400" : "bg-gradient-to-r from-blue-600 to-indigo-600"}`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" size={20} /> กำลังบันทึก...
          </>
        ) : (
          <>
            <CheckCircle2 size={20} /> ยืนยันการบันทึก
          </>
        )}
      </button>
    </div>
  );
}
