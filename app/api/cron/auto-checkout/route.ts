export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// เชื่อมต่อ Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ตัวช่วยแปลงชื่อกะ
const getThaiShiftName = (shiftStr: string) => {
  if (!shiftStr) return "-";
  const s = shiftStr.toLowerCase();
  if (s === "morning") return "เช้า";
  if (s === "afternoon") return "บ่าย";
  if (s === "custom") return "เวลาพิเศษ";
  return shiftStr;
};

export async function GET(request: Request) {
  try {
    // 1. ดึงตั้งค่าเวลา Auto-Checkout จาก Database ที่พี่แม็คตั้งในเว็บ
    const { data: settingData } = await supabase
      .from("company_settings")
      .select("setting_value")
      .eq("setting_key", "cron_auto_checkout_time")
      .single();

    // สมมติถ้าไม่มีตั้งค่าไว้ ให้ยึด 06:00 เป็นค่าเริ่มต้น
    const configTime = settingData?.setting_value || "06:00";
    const configHour = configTime.split(":")[0]; // ดึงมาแค่ 'ชั่วโมง' (เช่น "06")

    // 2. แปลงเวลา Server เป็นเวลาประเทศไทย (+7)
    const now = new Date();
    const thaiTime = new Date(now.getTime() + 7 * 3600000);
    const currentHour = String(thaiTime.getUTCHours()).padStart(2, "0");
    const currentMinute = String(thaiTime.getUTCMinutes()).padStart(2, "0");

    // 3. ตรวจสอบว่า "ชั่วโมงปัจจุบัน" ตรงกับ "ชั่วโมงที่ตั้งค่าไว้" หรือไม่?
    if (currentHour !== configHour) {
      return NextResponse.json({
        success: true,
        message: `Skipped: เวลาปัจจุบัน (${currentHour}:${currentMinute}) ยังไม่ตรงกับเวลาที่ตั้งไว้ (${configTime})`,
      });
    }

    // 4. ดึงข้อมูลคนที่ "ยังไม่ลงเวลาออก" (ย้อนหลัง 2 วัน เผื่อกะข้ามคืน)
    const pastDate = new Date(now.getTime() - 48 * 3600000);

    const { data: pendingLogs } = await supabase
      .from("attendance_logs")
      .select(`*, attendance_topics ( shift_type, start_time )`)
      .is("check_out_time", null)
      .gte("check_in_time", pastDate.toISOString());

    if (!pendingLogs || pendingLogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "ไม่มีพนักงานค้างลงเวลาออกครับ",
      });
    }

    let updatedCount = 0;

    // 5. คำนวณและอัปเดตเวลาออกงาน (9 ชั่วโมงเป๊ะๆ) ให้แต่ละคน
    for (const log of pendingLogs) {
      let sH = 9,
        sM = 0;
      const shiftType = getThaiShiftName(
        log.shift || log.attendance_topics?.shift_type || "",
      );

      if (shiftType === "เช้า") {
        sH = 9;
        sM = 0;
      } else if (shiftType === "บ่าย") {
        sH = 13;
        sM = 0;
      } else if (shiftType.includes("พิเศษ") || shiftType.includes("custom")) {
        const startTimeStr = log.attendance_topics?.start_time;
        if (startTimeStr) {
          const parts = startTimeStr.split(":").map(Number);
          sH = parts[0];
          sM = parts[1];
        }
      }

      const checkIn = new Date(log.check_in_time);
      let expectedStart = new Date(checkIn);
      expectedStart.setHours(sH, sM, 0, 0);

      // ปรับจูนวันสำหรับคนที่เข้ากะข้ามคืน
      if (
        expectedStart > checkIn &&
        expectedStart.getTime() - checkIn.getTime() > 12 * 3600000
      ) {
        expectedStart.setDate(expectedStart.getDate() - 1);
      }
      if (
        checkIn > expectedStart &&
        checkIn.getTime() - expectedStart.getTime() > 12 * 3600000
      ) {
        expectedStart.setDate(expectedStart.getDate() + 1);
      }

      // ตั้งเวลาออกแบบอัตโนมัติ (เข้างาน + 9 ชั่วโมงเป๊ะ)
      const otLimit = new Date(expectedStart.getTime() + 9 * 3600000);

      // สั่งบันทึกลง Database
      await supabase
        .from("attendance_logs")
        .update({
          check_out_time: otLimit.toISOString(),
          status: "auto_checked_out", // แอดมินจะได้รู้ว่าบอทเป็นคนเตะออก
        })
        .eq("id", log.id);

      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `ระบบทำการ Auto-Checkout ให้พนักงานสำเร็จ ${updatedCount} คน`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
