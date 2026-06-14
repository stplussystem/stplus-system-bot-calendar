export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET(request: Request) {
  try {
    // 1. ดึงเวลาปัจจุบัน (เวลาไทย)
    const now = new Date();
    const thaiTime = new Date(now.getTime() + 7 * 3600000);
    const todayStr = thaiTime.toISOString().split("T")[0];

    // 2. ดึงรายการลางานที่ "ค้างอนุมัติ (pending)" และ "วันที่ขอลาคือวันนี้ (หรือก่อนหน้า)"
    const { data: pendingLeaves } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("status", "pending")
      .lte("start_date", todayStr);

    if (!pendingLeaves || pendingLeaves.length === 0) {
      return NextResponse.json({
        success: true,
        message: "ไม่มีรายการลาค้างอนุมัติของวันนี้ครับ",
      });
    }

    let count = 0;

    // 3. จัดการเปลี่ยนสถานะเป็น "ไม่อนุมัติ (ขาดงาน)"
    for (const leave of pendingLeaves) {
      await supabase
        .from("leave_requests")
        .update({
          status: "rejected",
          reject_reason:
            "ระบบตัดขาดงานอัตโนมัติ เนื่องจากไม่มีการอนุมัติก่อน 18.00 น.",
          approver_id: "system_bot",
        })
        .eq("id", leave.id);
      count++;
    }

    return NextResponse.json({
      success: true,
      message: `ตัดเป็นขาดงานอัตโนมัติสำเร็จ ${count} รายการ`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
